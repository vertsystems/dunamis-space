import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('colaboradores')
		.select('id, nome, email, funcao, custo_hora, ativo')
		.order('nome');
	return { colaboradores: data ?? [], loadError: error?.message ?? null };
};
