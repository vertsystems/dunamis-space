import { um } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';

	let query = supabase
		.from('kb_artigos')
		.select('id, titulo, categoria, tags, cliente:clientes(nome), updated_at')
		.order('updated_at', { ascending: false });

	if (q) query = query.ilike('titulo', `%${q}%`);

	const { data, error } = await query;
	const artigos = (data ?? []).map((a) => ({ ...a, cliente: um(a.cliente) }));
	return { artigos, q, loadError: error?.message ?? null };
};
