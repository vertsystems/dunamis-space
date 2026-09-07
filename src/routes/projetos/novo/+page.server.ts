import { colaboradoresAtivos } from '$lib/server/lookups';
import { acaoCriar } from '$lib/server/crud';
import { projetos } from '$lib/server/recursos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: colaboradores } = await colaboradoresAtivos(supabase);
	return { colaboradores: colaboradores ?? [] };
};

export const actions: Actions = { default: acaoCriar(projetos) };
