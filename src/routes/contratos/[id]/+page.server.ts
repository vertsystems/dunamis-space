import { clientesLite } from '$lib/server/lookups';
import { error } from '@sveltejs/kit';
import { acoesDeItem } from '$lib/server/crud';
import { contratos } from '$lib/server/recursos';
import { ocultarValores, podeVerValores } from '$lib/valores';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, permissoes } }) => {
	const [{ data: contrato, error: e }, { data: clientes }, { data: planos }] = await Promise.all([
		supabase.from('contratos').select('*, cliente:clientes(nome)').eq('id', params.id).single(),
		clientesLite(supabase),
		supabase.from('planos').select('id, nome, valor_mensal').order('valor_mensal')
	]);
	if (e || !contrato) throw error(404, 'Contrato não encontrado');
	const podeValores = podeVerValores(permissoes);
	return {
		contrato: { ...contrato, valor_mensal: podeValores ? contrato.valor_mensal : null },
		clientes: clientes ?? [],
		planos: ocultarValores(planos ?? [], podeValores, 'valor_mensal')
	};
};

export const actions: Actions = acoesDeItem(contratos);
