import { clientesLite } from '$lib/server/lookups';
import { acaoCriar } from '$lib/server/crud';
import { financeiro } from '$lib/server/recursos';
import { selComErro } from '$lib/server/query';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Lookup do formulário: sem tratar o erro, uma falha aqui deixa o select de
	// clientes vazio e parece que não há cliente cadastrado.
	const { dados: clientes, erro } = await selComErro(
		clientesLite(supabase),
		'financeiro/novo: lista de clientes'
	);
	return {
		clientes,
		loadError: erro ? 'Não foi possível carregar a lista de clientes. Recarregue a página.' : null
	};
};

export const actions: Actions = { default: acaoCriar(financeiro) };
