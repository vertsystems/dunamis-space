import { error } from '@sveltejs/kit';
import { acoesDeItem } from '$lib/server/crud';
import { equipe } from '$lib/server/recursos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data: colaborador, error: e } = await supabase
		.from('colaboradores')
		.select('*')
		.eq('id', params.id)
		.single();
	if (e || !colaborador) throw error(404, 'Colaborador não encontrado');
	return { colaborador };
};

export const actions: Actions = acoesDeItem(equipe);
