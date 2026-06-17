import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
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
};
