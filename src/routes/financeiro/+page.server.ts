import { um } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const tipo = url.searchParams.get('tipo') ?? '';
	const status = url.searchParams.get('status') ?? '';

	let query = supabase
		.from('transacoes')
		.select(
			'id, tipo, categoria, descricao, valor, data_competencia, data_pagamento, status, cliente_id, recorrente, cliente:clientes(nome)'
		)
		.order('data_competencia', { ascending: false });

	if (tipo) query = query.eq('tipo', tipo);
	if (status) query = query.eq('status', status);

	const [{ data: transacoes, error }, { data: all }, { data: clientes }] = await Promise.all([
		query,
		supabase.from('transacoes').select('tipo, valor'),
		supabase.from('clientes').select('id, nome').order('nome')
	]);

	const receitas = (all ?? [])
		.filter((t) => t.tipo === 'receita')
		.reduce((s, t) => s + Number(t.valor ?? 0), 0);
	const despesas = (all ?? [])
		.filter((t) => t.tipo === 'despesa')
		.reduce((s, t) => s + Number(t.valor ?? 0), 0);

	return {
		transacoes: (transacoes ?? []).map((t) => ({ ...t, cliente: um(t.cliente) })),
		clientes: clientes ?? [],
		tipo,
		status,
		receitas,
		despesas,
		saldo: receitas - despesas,
		loadError: error?.message ?? null
	};
};
