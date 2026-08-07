import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { error } from '@sveltejs/kit';
import { acoesDeItem } from '$lib/server/crud';
import { projetos } from '$lib/server/recursos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: projeto, error: e }, { data: clientes }, { data: colaboradores }] = await Promise.all([
		supabase.from('projetos').select('*, cliente:clientes(nome)').eq('id', params.id).single(),
		clientesLite(supabase),
		colaboradoresAtivos(supabase)
	]);
	if (e || !projeto) throw error(404, 'Projeto não encontrado');
	return { projeto, clientes: clientes ?? [], colaboradores: colaboradores ?? [] };
};

export const actions: Actions = acoesDeItem(projetos);
