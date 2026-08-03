import { clientesLite } from '$lib/server/lookups';
import { um } from '$lib/db';
import { ocultarValores, podeVerValores } from '$lib/valores';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, permissoes }, url }) => {
	const status = url.searchParams.get('status') ?? '';

	let query = supabase
		.from('contratos')
		.select(
			'id, cliente_id, plano_id, valor_mensal, data_inicio, data_fim, status, renovacao_automatica, cliente:clientes(nome), plano:planos(nome)'
		)
		.order('created_at', { ascending: false });

	if (status) query = query.eq('status', status);

	const [{ data, error }, { data: clientes }, { data: planos }] = await Promise.all([
		query,
		clientesLite(supabase),
		supabase.from('planos').select('id, nome, valor_mensal').eq('ativo', true).order('valor_mensal')
	]);

	const podeValores = podeVerValores(permissoes);
	const contratos = (data ?? []).map((c) => ({
		...c,
		cliente: um(c.cliente),
		plano: um(c.plano)
	}));

	return {
		// Some o valor dos contratos e o dos planos (que alimentam o formulário)
		// para quem não pode vê-los — nem no payload da navegação.
		contratos: ocultarValores(contratos, podeValores, 'valor_mensal'),
		clientes: clientes ?? [],
		planos: ocultarValores(planos ?? [], podeValores, 'valor_mensal'),
		status,
		loadError: error?.message ?? null
	};
};
