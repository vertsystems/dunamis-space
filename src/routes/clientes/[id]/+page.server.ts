import { colaboradoresAtivos } from '$lib/server/lookups';
import { error } from '@sveltejs/kit';
import { acoesDeItem } from '$lib/server/crud';
import { clientes } from '$lib/server/recursos';
import { podeVerValores } from '$lib/valores';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, permissoes } }) => {
	const [{ data: cliente, error: e }, { data: colaboradores }] = await Promise.all([
		supabase.from('clientes').select('*').eq('id', params.id).single(),
		colaboradoresAtivos(supabase)
	]);

	if (e || !cliente) throw error(404, 'Cliente não encontrado');

	return {
		cliente: { ...cliente, mrr: podeVerValores(permissoes) ? cliente.mrr : null },
		colaboradores: colaboradores ?? []
	};
};

export const actions: Actions = acoesDeItem(clientes);
