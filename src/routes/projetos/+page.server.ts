import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const status = url.searchParams.get('status') ?? '';

	let query = supabase
		.from('projetos')
		.select('id, nome, tipo, status, prazo, cliente:clientes(nome), responsavel:colaboradores(nome)')
		.order('created_at', { ascending: false });

	if (status) query = query.eq('status', status);

	const { data, error } = await query;
	return { projetos: data ?? [], status, loadError: error?.message ?? null };
};
