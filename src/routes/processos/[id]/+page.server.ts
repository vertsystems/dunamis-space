import { error as svelteError } from '@sveltejs/kit';
import { acoesDeItem } from '$lib/server/crud';
import { processos } from '$lib/server/recursos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('processos')
		.select('id, numero, nome, secretaria, responsavel, prazo, situacao, etapas')
		.eq('id', params.id)
		.single();

	if (error || !data) throw svelteError(404, 'Processo não encontrado');
	return { processo: data };
};

export const actions: Actions = acoesDeItem(processos);
