import { clientesLite } from '$lib/server/lookups';
import { um } from '$lib/db';
import { sel } from '$lib/server/query';
import type { PageServerLoad } from './$types';

/** Quantas transações a listagem carrega por vez. */
const POR_PAGINA = 100;

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const tipo = url.searchParams.get('tipo') ?? '';
	const status = url.searchParams.get('status') ?? '';
	const pagina = Math.max(1, Number(url.searchParams.get('pagina') ?? '1') || 1);
	const de = (pagina - 1) * POR_PAGINA;

	let query = supabase
		.from('transacoes')
		.select(
			'id, tipo, categoria, descricao, valor, data_competencia, data_pagamento, status, cliente_id, recorrente, cliente:clientes(nome)',
			{ count: 'exact' }
		)
		.order('data_competencia', { ascending: false })
		.range(de, de + POR_PAGINA - 1);

	if (tipo) query = query.eq('tipo', tipo);
	if (status) query = query.eq('status', status);

	const [{ data: transacoes, error, count }, totaisRes, clientes] = await Promise.all([
		query,
		// Somado no banco. Antes eram todas as linhas trazidas para dois reduce em
		// JS — e, passando do teto de linhas do PostgREST, os cards mostravam
		// números truncados sem nenhum aviso. Ver migration 0041.
		supabase.from('v_financeiro_totais').select('receitas, despesas').maybeSingle(),
		sel(clientesLite(supabase), 'financeiro: clientes')
	]);

	const receitas = Number(totaisRes.data?.receitas ?? 0);
	const despesas = Number(totaisRes.data?.despesas ?? 0);
	const total = count ?? 0;

	return {
		transacoes: (transacoes ?? []).map((t) => ({ ...t, cliente: um(t.cliente) })),
		clientes,
		tipo,
		status,
		receitas,
		despesas,
		saldo: receitas - despesas,
		paginacao: {
			pagina,
			porPagina: POR_PAGINA,
			total,
			paginas: Math.max(1, Math.ceil(total / POR_PAGINA))
		},
		loadError: error?.message ?? totaisRes.error?.message ?? null
	};
};
