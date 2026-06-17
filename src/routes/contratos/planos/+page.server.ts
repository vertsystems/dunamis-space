import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('planos')
		.select('id, nome, valor_mensal, limite_posts, limite_stories, limite_reels, ativo')
		.order('valor_mensal', { ascending: true });

	return { planos: data ?? [], loadError: error?.message ?? null };
};
