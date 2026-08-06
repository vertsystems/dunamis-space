import { um } from '$lib/db';
import type { PageServerLoad } from './$types';
import { DIAS_CONTRATO_VENCENDO, DIAS_SEM_INTERACAO } from '$lib/alertas';
import { cached, chaveDoUsuario } from '$lib/server/cache';
import { CONTEUDO_STATUS } from '$lib/conteudo';
import { hojeSP } from '$lib/rotina';
import { sel } from '$lib/server/query';
import type { Prioridade, Status, TarefaHoje } from '$lib/organyze/types';

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

/**
 * Organyze na Visão Geral: as tarefas do dia de QUEM está logado.
 * Pendentes de dias anteriores entram junto — é o mesmo efeito do rollover que o
 * app faz ao abrir (lá ele reescreve a data; aqui só lê, para o dashboard não ter
 * efeito colateral no banco).
 */
async function carregarOrganyze(
	supabase: SupabaseClient,
	user: Parameters<PageServerLoad>[0]['locals']['user']
) {
	const hoje = hojeSP().data;
	const vazio = { colaboradorId: null as string | null, hoje, tarefas: [] as TarefaHoje[] };
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

	const COLS = 'id, titulo, status, data, posicao, prioridade, prazo';
	// Tarefas do colaborador (dono) OU compartilhadas com ele.
	const minhas = `colaborador_id.eq.${meuId},responsaveis.cs.{${meuId}}`;
	const [pendentes, feitas] = await Promise.all([
		supabase
			.from('organyze_tarefas')
			.select(COLS)
			.or(minhas)
			.is('deleted_at', null)
			.neq('status', 'concluida')
			.lte('data', hoje)
			.order('data', { ascending: true })
			.order('posicao', { ascending: true })
			.limit(50),
		// As concluídas de hoje ficam na lista para o progresso fazer sentido e para
		// desmarcar por engano ser reversível ali mesmo.
		supabase
			.from('organyze_tarefas')
			.select(COLS)
			.or(minhas)
			.is('deleted_at', null)
			.eq('status', 'concluida')
			.eq('data', hoje)
			.order('posicao', { ascending: true })
			.limit(50)
	]);

	// Organyze ainda não migrado no banco: o dashboard não pode quebrar por isso.
	if (pendentes.error || feitas.error) return vazio;

	const linha = (r: Record<string, unknown>): TarefaHoje => ({
		id: r.id as string,
		titulo: r.titulo as string,
		status: r.status as Status,
		data: r.data as string,
		posicao: (r.posicao as number) ?? 0,
		prioridade: (r.prioridade as Prioridade) ?? 'media',
		prazo: (r.prazo as string | null) ?? null
	});

	return {
		colaboradorId: meuId,
		hoje,
		tarefas: [...(pendentes.data ?? []), ...(feitas.data ?? [])].map(linha)
	};
}

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
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
		// Também streamed, mas SEM cache: a lista é marcada e criada na própria tela,
		// e 60s de TTL fariam um F5 logo depois ressuscitar o estado antigo.
		organyze: carregarOrganyze(supabase, user)
	};
};
