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
 * Retornado como Promise não-aguardada no `load` para **streaming**: o shell e
 * os KPIs renderizam na hora e este bloco chega depois, com skeleton na tela.
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
			// Contratos ativos vencendo (ou já vencidos): data_fim <= hoje + N dias.
			supabase
				.from('contratos')
				.select('id, data_fim, cliente:clientes(id, nome)')
				.eq('status', 'ativo')
				.not('data_fim', 'is', null)
				.lte('data_fim', limiteContratoStr)
				.order('data_fim', { ascending: true }),
			// Tarefas atrasadas (lista).
			supabase
				.from('tarefas')
				.select('id, titulo, prazo, projeto:projetos(id, nome, cliente:clientes(nome))')
				.lt('prazo', hoje)
				.neq('status', 'concluido')
				.order('prazo', { ascending: true })
				.limit(12),
			// Clientes ativos + última interação (1 por cliente via embedding).
			supabase
				.from('clientes')
				.select('id, nome, created_at, cliente_interacoes(data)')
				.eq('status', 'ativo')
				.order('data', { referencedTable: 'cliente_interacoes', ascending: false })
				.limit(1, { referencedTable: 'cliente_interacoes' })
		]);

	// Clientes sem interação: nunca tiveram, ou a última é anterior ao cutoff.
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

/** KPIs do topo — queries rápidas, agregadas num só objeto (cacheável). */
async function carregarKpis(supabase: SupabaseClient) {
	const hoje = new Date().toISOString().slice(0, 10);

	const [{ count: ativos }, { data: mrrRows }, { data: transacoes }, { count: atrasadas }] =
		await Promise.all([
			supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
			supabase.from('clientes').select('mrr').eq('status', 'ativo'),
			supabase.from('transacoes').select('tipo, valor'),
			supabase
				.from('tarefas')
				.select('id', { count: 'exact', head: true })
				.lt('prazo', hoje)
				.neq('status', 'concluido')
		]);

	const recorrente = (mrrRows ?? []).reduce((sum, r) => sum + Number(r.mrr ?? 0), 0);
	const receitas = (transacoes ?? [])
		.filter((t) => t.tipo === 'receita')
		.reduce((s, t) => s + Number(t.valor ?? 0), 0);
	const despesas = (transacoes ?? [])
		.filter((t) => t.tipo === 'despesa')
		.reduce((s, t) => s + Number(t.valor ?? 0), 0);

	return { ativos: ativos ?? 0, recorrente, lucro: receitas - despesas, atrasadas: atrasadas ?? 0 };
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// KPIs: cacheados 60s (no-op sem Redis), aguardados → SSR imediato.
	const kpis = await cached('dashboard:kpis', 60, () => carregarKpis(supabase));

	return {
		...kpis,
		// Alertas: cacheados 60s + Promise não-aguardada → streaming com skeleton.
		alertas: cached('dashboard:alertas', 60, () => carregarAlertas(supabase))
	};
};
