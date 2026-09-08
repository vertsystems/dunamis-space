import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { acaoCriar } from '$lib/server/crud';
import { conteudo } from '$lib/server/recursos';
import { nomesDeCampanha } from '$lib/server/conteudo';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data: clientes }, { data: colaboradores }, campanhas] = await Promise.all([
		clientesLite(supabase),
		colaboradoresAtivos(supabase),
		nomesDeCampanha(supabase)
	]);
	return { clientes: clientes ?? [], colaboradores: colaboradores ?? [], campanhas };
};

export const actions: Actions = { default: acaoCriar(conteudo) };
