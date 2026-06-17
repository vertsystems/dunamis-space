import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('campanhas')
		.select('id, nome, data_inicio, data_fim, cliente:clientes(nome)')
		.order('created_at', { ascending: false });
	return { campanhas: data ?? [], loadError: error?.message ?? null };
};
