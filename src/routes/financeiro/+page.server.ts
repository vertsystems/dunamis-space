import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const tipo = url.searchParams.get('tipo') ?? '';
	const status = url.searchParams.get('status') ?? '';

	let query = supabase
		.from('transacoes')
		.select('id, tipo, categoria, descricao, valor, data_competencia, status, cliente:clientes(nome)')
		.order('data_competencia', { ascending: false });

	if (tipo) query = query.eq('tipo', tipo);
	if (status) query = query.eq('status', status);

	const [{ data: transacoes, error }, { data: all }] = await Promise.all([
		query,
		supabase.from('transacoes').select('tipo, valor')
	]);

	const receitas = (all ?? [])
		.filter((t) => t.tipo === 'receita')
		.reduce((s, t) => s + Number(t.valor ?? 0), 0);
	const despesas = (all ?? [])
		.filter((t) => t.tipo === 'despesa')
		.reduce((s, t) => s + Number(t.valor ?? 0), 0);

	return {
		transacoes: transacoes ?? [],
		tipo,
		status,
		receitas,
		despesas,
		saldo: receitas - despesas,
		loadError: error?.message ?? null
	};
};
