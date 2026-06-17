import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const status = url.searchParams.get('status') ?? '';

	let query = supabase
		.from('clientes')
		.select('id, nome, status, segmento, mrr, contato_email, responsavel:colaboradores(nome)')
		.order('created_at', { ascending: false });

	if (q) query = query.ilike('nome', `%${q}%`);
	if (status) query = query.eq('status', status);

	const { data, error } = await query;

	return {
		clientes: data ?? [],
		q,
		status,
		loadError: error?.message ?? null
	};
};
