import { um } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const status = url.searchParams.get('status') ?? '';

	let query = supabase
		.from('projetos')
		.select('id, nome, tipo, status, prazo, cliente:clientes(nome), responsavel:colaboradores(nome)')
		.order('created_at', { ascending: false });

	if (status) query = query.eq('status', status);

	const { data, error } = await query;
	const projetos = (data ?? []).map((p) => ({
		...p,
		cliente: um(p.cliente),
		responsavel: um(p.responsavel)
	}));
	return { projetos, status, loadError: error?.message ?? null };
};
