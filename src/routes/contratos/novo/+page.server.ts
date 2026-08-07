import { clientesLite } from '$lib/server/lookups';
import { acaoCriar } from '$lib/server/crud';
import { contratos } from '$lib/server/recursos';
import { ocultarValores, podeVerValores } from '$lib/valores';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, permissoes } }) => {
	const [{ data: clientes }, { data: planos }] = await Promise.all([
		clientesLite(supabase),
		supabase.from('planos').select('id, nome, valor_mensal').eq('ativo', true).order('valor_mensal')
	]);
	return {
		clientes: clientes ?? [],
		planos: ocultarValores(planos ?? [], podeVerValores(permissoes), 'valor_mensal')
	};
};

export const actions: Actions = { default: acaoCriar(contratos) };
