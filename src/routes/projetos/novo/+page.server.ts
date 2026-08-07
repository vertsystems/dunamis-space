import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { acaoCriar } from '$lib/server/crud';
import { projetos } from '$lib/server/recursos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data: clientes }, { data: colaboradores }] = await Promise.all([
		clientesLite(supabase),
		colaboradoresAtivos(supabase)
	]);
	return { clientes: clientes ?? [], colaboradores: colaboradores ?? [] };
};

export const actions: Actions = { default: acaoCriar(projetos) };
