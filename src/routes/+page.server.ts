import { um } from '$lib/db';
import type { PageServerLoad } from './$types';
import { DIAS_CONTRATO_VENCENDO, DIAS_SEM_INTERACAO } from '$lib/alertas';
import { cached, chaveDoUsuario } from '$lib/server/cache';
import { CONTEUDO_STATUS } from '$lib/conteudo';
import { hojeSP } from '$lib/rotina';
import { podeVer, type Permissoes } from '$lib/permissoes';
import type { OrganyzeResumo, Prioridade } from '$lib/organyze/types';
import type { PagsupResumo } from '$lib/pagsup/types';
import { sel } from '$lib/server/query';

// O módulo de Tarefas foi aposentado: a operação do dashboard passou a ser
// medida pelo funil de CONTEÚDO, usando os grupos que já existem em conteudo.ts.
const ST_AFAZER = CONTEUDO_STATUS.filter((s) => s.grupo === 'A fazer').map((s) => s.value);
const ST_ANDAMENTO = CONTEUDO_STATUS.filter((s) => s.grupo === 'Em andamento').map((s) => s.value);
const ST_CONCLUIDO = CONTEUDO_STATUS.filter((s) => s.grupo === 'Concluídos').map((s) => s.value);

type SupabaseClient = Parameters<PageServerLoad>[0]['locals']['supabase'];

/**
 * Alertas inteligentes (3 queries com embeds — parte mais pesada do dashboard).
 * Retornado como Promise não-aguardada no `load` para **streaming**.
 */
async function carregarAlertas(supabase: SupabaseClient) {

	const limiteContrato = new Date();
	limiteContrato.setDate(limiteContrato.getDate() + DIAS_CONTRATO_VENCENDO);
	const limiteContratoStr = limiteContrato.toISOString().slice(0, 10);

	const cutoffInteracao = new Date();
	cutoffInteracao.setDate(cutoffInteracao.getDate() - DIAS_SEM_INTERACAO);
	const cutoffInteracaoStr = cutoffInteracao.toISOString();

	const [{ data: contratos }, { data: atrasadosRaw }, { data: clientesAtivos }] =
		await Promise.all([
			supabase
				.from('contratos')
				.select('id, data_fim, cliente:clientes(id, nome)')
				.eq('status', 'ativo')
				.not('data_fim', 'is', null)
				.lte('data_fim', limiteContratoStr)
				.order('data_fim', { ascending: true }),
			supabase
				.from('conteudos')
				.select('id, titulo, tipo, data_publicacao, cliente:clientes(nome)')
				.lt('data_publicacao', new Date().toISOString())
				.not('status', 'in', `(${ST_CONCLUIDO.join(',')})`)
				.order('data_publicacao', { ascending: true })
				.limit(12),
			supabase
				.from('clientes')
				.select('id, nome, created_at, cliente_interacoes(data)')
				.eq('status', 'ativo')
				.order('data', { referencedTable: 'cliente_interacoes', ascending: false })
				.limit(1, { referencedTable: 'cliente_interacoes' })
		]);

	const semInteracao = (clientesAtivos ?? [])
		.map((c) => {
			const ultima = um<{ data: string }>(c.cliente_interacoes)?.data ?? null;
			return { id: c.id as string, nome: c.nome as string, ultima };
		})
		.filter((c) => c.ultima === null || c.ultima < cutoffInteracaoStr)
		.sort((a, b) => (a.ultima ?? '').localeCompare(b.ultima ?? ''));

	const contratosVencendo = (contratos ?? []).map((c) => ({
		id: c.id as string,
		data_fim: c.data_fim as string | null,
		cliente_nome: um<{ id: string; nome: string }>(c.cliente)?.nome ?? null
	}));

	const atrasados = (atrasadosRaw ?? []).map((c) => ({
		id: c.id as string,
		titulo: (c.titulo as string | null) ?? null,
		tipo: c.tipo as string,
		data_publicacao: c.data_publicacao as string,
		cliente_nome: um<{ nome: string }>(c.cliente)?.nome ?? null
	}));

	return { contratos: contratosVencendo, atrasados, semInteracao };
}

/** Faixa de indicadores do topo — operacional (sem financeiro). */
async function carregarKpis(supabase: SupabaseClient) {
	const now = new Date().toISOString();
	const em7 = new Date(Date.now() + 7 * 86_400_000).toISOString();

	const [{ count: ativos }, { count: atrasadas }, { count: negociosAbertos }, { count: publicacoesSemana }] =
		await Promise.all([
			supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
			supabase
				.from('conteudos')
				.select('id', { count: 'exact', head: true })
				.lt('data_publicacao', new Date().toISOString())
				.not('status', 'in', `(${ST_CONCLUIDO.join(',')})`),
			supabase.from('crm_negocios').select('id', { count: 'exact', head: true }).eq('status', 'aberto'),
			supabase
				.from('conteudos')
				.select('id', { count: 'exact', head: true })
				.gte('data_publicacao', now)
				.lte('data_publicacao', em7)
				.neq('status', 'publicado')
		]);

	return {
		ativos: ativos ?? 0,
		atrasadas: atrasadas ?? 0,
		negociosAbertos: negociosAbertos ?? 0,
		publicacoesSemana: publicacoesSemana ?? 0
	};
}

/** Bloco Pipeline de vendas (CRM). Degrada gracioso se a migration 0005 não existir. */
async function carregarPipeline(supabase: SupabaseClient) {
	const agora = new Date();
	const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();

	const [stagesRes, negociosRes] = await Promise.all([
		supabase.from('crm_stages').select('id, nome, cor, ordem').order('ordem', { ascending: true }),
		supabase.from('crm_negocios').select('valor, status, stage_id, ganho_em')
	]);

	if (stagesRes.error || negociosRes.error) {
		return { crmPendente: true, valorAberto: 0, ganhosMes: 0, valorGanhoMes: 0, taxaConversao: 0, funil: [] as { nome: string; cor: string; count: number }[] };
	}

	let valorAberto = 0,
		ganhosMes = 0,
		valorGanhoMes = 0,
		ganhosTotal = 0,
		perdidosTotal = 0;
	const porStage = new Map<string, number>();
	for (const n of negociosRes.data ?? []) {
		const v = Number(n.valor ?? 0);
		if (n.status === 'aberto') {
			valorAberto += v;
			const s = (n.stage_id as string | null) ?? '';
			porStage.set(s, (porStage.get(s) ?? 0) + 1);
		} else if (n.status === 'ganho') {
			ganhosTotal++;
			if (n.ganho_em && new Date(n.ganho_em as string).getTime() >= inicioMes) {
				ganhosMes++;
				valorGanhoMes += v;
			}
		} else if (n.status === 'perdido') {
			perdidosTotal++;
		}
	}
	const fechados = ganhosTotal + perdidosTotal;
	const funil = (stagesRes.data ?? []).map((s) => ({
		nome: s.nome as string,
		cor: s.cor as string,
		count: porStage.get(s.id as string) ?? 0
	}));

	return {
		crmPendente: false,
		valorAberto,
		ganhosMes,
		valorGanhoMes,
		taxaConversao: fechados ? Math.round((ganhosTotal / fechados) * 100) : 0,
		funil
	};
}

/** Lista de clientes ativos para o painel de bolinhas na Visão Geral. */
async function carregarClientes(supabase: SupabaseClient) {
	const data = await sel(
		supabase
			.from('clientes')
			.select('id, nome, logo_url')
			.eq('status', 'ativo')
			.order('nome', { ascending: true }),
		'dashboard: clientes ativos'
	);
	return data.map((c) => ({
		id: c.id as string,
		nome: c.nome as string,
		logo_url: (c.logo_url as string | null) ?? null
	}));
}

/** Bloco Operação: funil de conteúdo (a fazer / em andamento / backlog). */
async function carregarOperacao(supabase: SupabaseClient) {
	const now = new Date().toISOString();
	const em7 = new Date(Date.now() + 7 * 86_400_000).toISOString();

	const [b, f, a, aprov, pubRes] = await Promise.all([
		supabase.from('conteudos').select('id', { count: 'exact', head: true }).in('status', ST_AFAZER),
		supabase.from('conteudos').select('id', { count: 'exact', head: true }).in('status', ST_ANDAMENTO),
		supabase.from('conteudos').select('id', { count: 'exact', head: true }).is('data_publicacao', null),
		supabase.from('conteudos').select('id', { count: 'exact', head: true }).eq('status', 'aprovar_conteudo'),
		supabase
			.from('conteudos')
			.select('id, titulo, data_publicacao, cliente:clientes(nome)')
			.gte('data_publicacao', now)
			.lte('data_publicacao', em7)
			.neq('status', 'publicado')
			.order('data_publicacao', { ascending: true })
			.limit(6)
	]);

	const publicacoes = (pubRes.data ?? []).map((c) => ({
		id: c.id as string,
		titulo: (c.titulo as string | null) || '(sem título)',
		data_publicacao: c.data_publicacao as string | null,
		cliente_nome: um<{ nome: string }>(c.cliente)?.nome ?? null
	}));

	return {
		funil: { afazer: b.count ?? 0, andamento: f.count ?? 0, semData: a.count ?? 0 },
		conteudoEmAprovacao: aprov.count ?? 0,
		publicacoes
	};
}

// ---- Blocos das ferramentas (Organyze e Pag's Up) -------------------------

/**
 * Organyze do usuário logado. Pendentes de dias anteriores contam junto — é o
 * mesmo efeito do rollover que o app faz ao abrir (lá ele reescreve a data; aqui
 * só lê, para o dashboard não ter efeito colateral no banco).
 */
async function carregarOrganyze(
	supabase: SupabaseClient,
	user: Parameters<PageServerLoad>[0]['locals']['user'],
	hoje: string
): Promise<OrganyzeResumo> {
	const vazio: OrganyzeResumo = {
		semVinculo: true,
		pendentes: 0,
		concluidas: 0,
		atrasadas: 0,
		proximas: []
	};
	if (!user) return vazio;

	// Mesmo casamento do /meu-dia: vínculo direto e, na falta dele, pelo e-mail.
	let { data: colab } = await supabase
		.from('colaboradores')
		.select('id')
		.eq('auth_user_id', user.id)
		.maybeSingle();
	if (!colab && user.email) {
		({ data: colab } = await supabase
			.from('colaboradores')
			.select('id')
			.eq('email', user.email)
			.maybeSingle());
	}
	const meuId = (colab?.id as string | undefined) ?? null;
	if (!meuId) return vazio;

	// Tarefas do colaborador (dono) OU compartilhadas com ele.
	const minhas = `colaborador_id.eq.${meuId},responsaveis.cs.{${meuId}}`;
	const [pend, feitas] = await Promise.all([
		supabase
			.from('organyze_tarefas')
			.select('id, titulo, prazo, prioridade, data, posicao')
			.or(minhas)
			.is('deleted_at', null)
			.neq('status', 'concluida')
			.lte('data', hoje)
			.order('data', { ascending: true })
			.order('posicao', { ascending: true })
			.limit(100),
		supabase
			.from('organyze_tarefas')
			.select('id', { count: 'exact', head: true })
			.or(minhas)
			.is('deleted_at', null)
			.eq('status', 'concluida')
			.eq('data', hoje)
	]);

	// Organyze ainda não migrado no banco: o dashboard não pode quebrar por isso.
	if (pend.error) return vazio;

	const linhas = pend.data ?? [];
	return {
		semVinculo: false,
		pendentes: linhas.length,
		concluidas: feitas.count ?? 0,
		atrasadas: linhas.filter((t) => t.prazo && (t.prazo as string) < hoje).length,
		// Prazo mais apertado primeiro; sem prazo vai para o fim (mantém a ordem do quadro).
		proximas: [...linhas]
			.sort((a, b) => (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'))
			.slice(0, 5)
			.map((t) => ({
				id: t.id as string,
				titulo: t.titulo as string,
				prazo: (t.prazo as string | null) ?? null,
				prioridade: ((t.prioridade as Prioridade) ?? 'media') as Prioridade
			}))
	};
}

/**
 * Pag's Up: quanto já saiu no mês, o que vence na semana e os próximos serviços
 * do cronograma. Só é chamado para quem tem o módulo liberado.
 */
async function carregarPagsup(supabase: SupabaseClient, hoje: string): Promise<PagsupResumo | null> {
	const inicioMes = `${hoje.slice(0, 7)}-01`;
	const [y, m] = hoje.split('-').map(Number);
	const fimMes = `${hoje.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
	const em7 = new Date(`${hoje}T12:00:00Z`);
	em7.setUTCDate(em7.getUTCDate() + 7);
	const limite7 = em7.toISOString().slice(0, 10);

	const [pagos, mes, proximos] = await Promise.all([
		supabase
			.from('pagsup_pagamentos')
			.select('valor')
			.gte('data_pagamento', inicioMes)
			.lte('data_pagamento', fimMes),
		supabase
			.from('pagsup_cronograma')
			.select('id', { count: 'exact', head: true })
			.gte('data', inicioMes)
			.lte('data', fimMes),
		supabase
			.from('pagsup_cronograma')
			.select('id, data, valor, prestador_id')
			.gte('data', hoje)
			.lte('data', limite7)
			.order('data', { ascending: true })
			.limit(20)
	]);

	// Pag's Up sem migration/sem acesso: o bloco simplesmente não aparece.
	if (proximos.error) return null;

	const linhas = proximos.data ?? [];
	// Nome do prestador em query própria: sem embed, um cronograma órfão (prestador
	// excluído) não derruba a consulta inteira.
	const ids = [...new Set(linhas.map((s) => s.prestador_id as string).filter(Boolean))];
	const { data: prestadores } = ids.length
		? await supabase.from('pagsup_prestadores').select('id, nome, servico').in('id', ids)
		: { data: [] as { id: string; nome: string; servico: string }[] };
	const porId = new Map((prestadores ?? []).map((p) => [p.id as string, p]));

	return {
		pagoMes: (pagos.data ?? []).reduce((s, p) => s + Number(p.valor ?? 0), 0),
		aPagar7: linhas.reduce((s, l) => s + Number(l.valor ?? 0), 0),
		servicosMes: mes.count ?? 0,
		proximos: linhas.slice(0, 5).map((l) => {
			const p = porId.get(l.prestador_id as string);
			return {
				id: l.id as string,
				data: l.data as string,
				nome: p?.nome ?? 'Prestador removido',
				servico: p?.servico ?? '',
				// null = "A definir" no Pag's Up; o bloco mostra o mesmo rótulo.
				valor: l.valor === null || l.valor === undefined ? null : Number(l.valor)
			};
		})
	};
}

/** Os dois blocos juntos: uma Promise só, para os cards aparecerem lado a lado. */
async function carregarFerramentas(
	supabase: SupabaseClient,
	user: Parameters<PageServerLoad>[0]['locals']['user'],
	perms: Permissoes
) {
	const hoje = hojeSP().data;
	const [organyze, pagsup] = await Promise.all([
		carregarOrganyze(supabase, user, hoje),
		podeVer(perms, 'pagsup') ? carregarPagsup(supabase, hoje) : Promise.resolve(null)
	]);
	return { hoje, organyze, pagsup };
}

export const load: PageServerLoad = async ({ locals: { supabase, user, permissoes } }) => {
	// As três queries cacheadas leem via `locals.supabase`, então o resultado já
	// vem filtrado pela RLS de QUEM pediu. Com chave global, um perfil servia os
	// dados de outro durante os 60s de TTL — daí o namespace por usuário.
	const k = (base: string) => chaveDoUsuario(base, user?.id);

	// As 4 são cacheadas: pipeline e operacao (7 das 15 queries do dashboard)
	// tinham ficado de fora sem motivo.
	const [kpis, pipeline, operacao, clientes] = await Promise.all([
		cached(k('dashboard:kpis:v3'), 60, () => carregarKpis(supabase)),
		cached(k('dashboard:pipeline'), 60, () => carregarPipeline(supabase)),
		cached(k('dashboard:operacao'), 60, () => carregarOperacao(supabase)),
		cached(k('dashboard:clientes'), 60, () => carregarClientes(supabase))
	]);

	return {
		...kpis,
		pipeline,
		operacao,
		clientes,
		// Alertas: cacheados 60s + Promise não-aguardada → streaming com skeleton.
		alertas: cached(k('dashboard:alertas'), 60, () => carregarAlertas(supabase)),
		// Também streamed, mas SEM cache: são listas que a pessoa acabou de mexer nas
		// telas das ferramentas, e 60s de TTL fariam o dashboard mostrar o estado velho.
		ferramentas: carregarFerramentas(supabase, user, (permissoes ?? {}) as Permissoes)
	};
};
