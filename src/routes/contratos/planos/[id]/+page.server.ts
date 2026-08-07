import { error } from '@sveltejs/kit';
import { acoesDeItem } from '$lib/server/crud';
import { planos } from '$lib/server/recursos';
import { podeVerValores } from '$lib/valores';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, permissoes } }) => {
	const { data: plano, error: e } = await supabase
		.from('planos')
		.select('*')
		.eq('id', params.id)
		.single();
	if (e || !plano) throw error(404, 'Plano não encontrado');
	return {
		plano: { ...plano, valor_mensal: podeVerValores(permissoes) ? plano.valor_mensal : null }
	};
};

export const actions: Actions = acoesDeItem(planos);
