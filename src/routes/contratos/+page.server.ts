import { um } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const status = url.searchParams.get('status') ?? '';

	let query = supabase
		.from('contratos')
		.select(
			'id, valor_mensal, data_inicio, data_fim, status, renovacao_automatica, cliente:clientes(nome), plano:planos(nome)'
		)
		.order('created_at', { ascending: false });

	if (status) query = query.eq('status', status);

	const { data, error } = await query;
	const contratos = (data ?? []).map((c) => ({
		...c,
		cliente: um(c.cliente),
		plano: um(c.plano)
	}));

	return { contratos, status, loadError: error?.message ?? null };
};
