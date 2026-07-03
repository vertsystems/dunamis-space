import { um } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('campanhas')
		.select('id, nome, data_inicio, data_fim, cliente:clientes(nome)')
		.order('created_at', { ascending: false });
	const campanhas = (data ?? []).map((c) => ({ ...c, cliente: um(c.cliente) }));
	return { campanhas, loadError: error?.message ?? null };
};
