import { ocultarValores, podeVerValores } from '$lib/valores';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, permissoes } }) => {
	const { data, error } = await supabase
		.from('planos')
		.select('id, nome, valor_mensal, limite_posts, limite_stories, limite_reels, descricao, ativo')
		.order('valor_mensal', { ascending: true });

	// A ordenação por valor continua vindo do banco: a lista chega na ordem certa
	// mesmo para quem só vê a máscara.
	return {
		planos: ocultarValores(data ?? [], podeVerValores(permissoes), 'valor_mensal'),
		loadError: error?.message ?? null
	};
};
