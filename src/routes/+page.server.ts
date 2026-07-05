import type { PageServerLoad } from './$types';
import { DIAS_CONTRATO_VENCENDO, DIAS_SEM_INTERACAO } from '$lib/alertas';
import { cached } from '$lib/server/cache';

/** PostgREST tipa relações to-one como array; extrai o objeto único. */
function um<T>(v: T | T[] | null | undefined): T | null {
	if (Array.isArray(v)) return v[0] ?? null;
	return v ?? null;
}

type SupabaseClient = Parameters<PageServerLoad>[0]['locals']['supabase'];

/**
 * Alertas inteligentes (3 queries com embeds — parte mais pesada do dashboard).
 * Retornado como Promise não-aguardada no `load` para **streaming**.
 */
async function carregarAlertas(supabase: SupabaseClient) {
	const hoje = new Date().toISOString().slice(0, 10);

	const limiteContrato = new Date();
	limiteContrato.setDate(limiteContrato.getDate() + DIAS_CONTRATO_VENCENDO);
	const limiteContratoStr = limiteContrato.toISOString().slice(0, 10);

	const cutoffInteracao = new Date();
	cutoffInteracao.setDate(cutoffInteracao.getDate() - DIAS_SEM_INTERACAO);
	const cutoffInteracaoStr = cutoffInteracao.toISOString();

	const [{ data: contratos }, { data: tarefasAtrasadas }, { data: clientesAtivos }] =
		await Promise.all([
			supabase
				.from('contratos')
				.select('id, data_fim, cliente:clientes(id, nome)')
				.eq('status', 'ativo')
				.not('data_fim', 'is', null)
				.lte('data_fim', limiteContratoStr)
				.order('data_fim', { ascending: true }),
			supabase
				.from('tarefas')
				.select('id, titulo, prazo, projeto:projetos(id, nome, cliente:clientes(nome))')
				.lt('prazo', hoje)
				.neq('status', 'concluido')
				.order('prazo', { ascending: true })
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

	type ClienteRel = { nome: string } | { nome: string }[] | null;
	const tarefas = (tarefasAtrasadas ?? []).map((t) => {
		const projeto = um<{ id: string; nome: string; cliente: ClienteRel }>(t.projeto);
		return {
			id: t.id as string,
			titulo: t.titulo as string,
			prazo: t.prazo as string | null,
			projeto_id: projeto?.id ?? null,
			cliente_nome: um<{ nome: string }>(projeto?.cliente)?.nome ?? null
		};
	});

	return { contratos: contratosVencendo, tarefas, semInteracao };
}

/** Faixa de indicadores do topo — operacional (sem financeiro). */
async function carregarKpis(supabase: SupabaseClient) {
	const hoje = new Date().toISOString().slice(0, 10);
	const now = new Date().toISOString();
	const em7 = new Date(Date.now() + 7 * 86_400_000).toISOString();

	const [{ count: ativos }, { count: atrasadas }, { count: negociosAbertos }, { count: publicacoesSemana }] =
		await Promise.all([
			supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
			supabase
				.from('tarefas')
				.select('id', { count: 'exact', head: true })
				.lt('prazo', hoje)
				.neq('status', 'concluido'),
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
	const { data } = await supabase
		.from('clientes')
		.select('id, nome')
		.eq('status', 'ativo')
		.order('nome', { ascending: true });
	return (data ?? []).map((c) => ({ id: c.id as string, nome: c.nome as string }));
}

/** Bloco Operação: resumo do Kanban de tarefas + conteúdo (publicações/aprovações). */
async function carregarOperacao(supabase: SupabaseClient) {
	const now = new Date().toISOString();
	const em7 = new Date(Date.now() + 7 * 86_400_000).toISOString();

	const [b, f, a, aprov, pubRes] = await Promise.all([
		supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'backlog'),
		supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'fazendo'),
		supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'em_aprovacao'),
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
		tarefas: { backlog: b.count ?? 0, fazendo: f.count ?? 0, em_aprovacao: a.count ?? 0 },
		conteudoEmAprovacao: aprov.count ?? 0,
		publicacoes
	};
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [kpis, pipeline, operacao, clientes] = await Promise.all([
		cached('dashboard:kpis:v3', 60, () => carregarKpis(supabase)),
		carregarPipeline(supabase),
		carregarOperacao(supabase),
		cached('dashboard:clientes', 60, () => carregarClientes(supabase))
	]);

	return {
		...kpis,
		pipeline,
		operacao,
		clientes,
		// Alertas: cacheados 60s + Promise não-aguardada → streaming com skeleton.
		alertas: cached('dashboard:alertas', 60, () => carregarAlertas(supabase))
	};
};
