import { clientesLite } from '$lib/server/lookups';
import { error } from '@sveltejs/kit';
import { acoesDeItem } from '$lib/server/crud';
import { financeiro } from '$lib/server/recursos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: transacao, error: e }, { data: clientes }] = await Promise.all([
		supabase.from('transacoes').select('*').eq('id', params.id).single(),
		clientesLite(supabase)
	]);
	if (e || !transacao) throw error(404, 'Transação não encontrada');
	return { transacao, clientes: clientes ?? [] };
};

export const actions: Actions = acoesDeItem(financeiro);
