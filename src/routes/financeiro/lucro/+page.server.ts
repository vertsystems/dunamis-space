import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('v_lucro_cliente')
		.select('cliente_id, nome, receitas, despesas, lucro')
		.order('lucro', { ascending: false });

	return { linhas: data ?? [], loadError: error?.message ?? null };
};
