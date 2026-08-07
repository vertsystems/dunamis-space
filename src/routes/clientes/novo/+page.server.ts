import { colaboradoresAtivos } from '$lib/server/lookups';
import { acaoCriar } from '$lib/server/crud';
import { clientes } from '$lib/server/recursos';
import { selComErro } from '$lib/server/query';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Lookup do formulário: se a query falha e o erro é engolido, o select fica
	// vazio e o usuário conclui que não há colaboradores — daí o aviso na tela.
	const { dados: colaboradores, erro } = await selComErro(
		colaboradoresAtivos(supabase),
		'clientes/novo: colaboradores ativos'
	);
	return {
		colaboradores,
		loadError: erro
			? 'Não foi possível carregar a lista de colaboradores. Recarregue a página.'
			: null
	};
};

export const actions: Actions = { default: acaoCriar(clientes) };
