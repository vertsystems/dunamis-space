import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';

	let query = supabase
		.from('kb_artigos')
		.select('id, titulo, categoria, tags, cliente:clientes(nome), updated_at')
		.order('updated_at', { ascending: false });

	if (q) query = query.ilike('titulo', `%${q}%`);

	const { data, error } = await query;
	return { artigos: data ?? [], q, loadError: error?.message ?? null };
};
