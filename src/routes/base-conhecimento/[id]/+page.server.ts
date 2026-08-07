import { clientesLite } from '$lib/server/lookups';
import { error } from '@sveltejs/kit';
import { acoesDeItem } from '$lib/server/crud';
import { baseConhecimento } from '$lib/server/recursos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: artigo, error: e }, { data: clientes }] = await Promise.all([
		supabase.from('kb_artigos').select('*').eq('id', params.id).single(),
		clientesLite(supabase)
	]);
	if (e || !artigo) throw error(404, 'Artigo não encontrado');
	return { artigo, clientes: clientes ?? [] };
};

export const actions: Actions = acoesDeItem(baseConhecimento);
