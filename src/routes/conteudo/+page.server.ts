import { um } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const status = url.searchParams.get('status') ?? '';
	const tipo = url.searchParams.get('tipo') ?? '';

	let query = supabase
		.from('conteudos')
		.select('id, titulo, tipo, status, data_publicacao, cliente:clientes(nome)')
		.order('data_publicacao', { ascending: false, nullsFirst: false });

	if (status) query = query.eq('status', status);
	if (tipo) query = query.eq('tipo', tipo);

	const { data, error } = await query;
	const conteudos = (data ?? []).map((c) => ({ ...c, cliente: um(c.cliente) }));
	return { conteudos, status, tipo, loadError: error?.message ?? null };
};
