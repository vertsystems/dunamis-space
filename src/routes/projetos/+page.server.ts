import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { um } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const status = url.searchParams.get('status') ?? '';

	let query = supabase
		.from('projetos')
		.select('id, nome, tipo, status, cliente_id, responsavel_id, data_inicio, prazo, valor, recorrente, descricao, cliente:clientes(nome), responsavel:colaboradores(nome)')
		.order('created_at', { ascending: false });

	if (status) query = query.eq('status', status);

	const [{ data, error }, { data: clientes }, { data: colaboradores }] = await Promise.all([
		query,
		clientesLite(supabase),
		colaboradoresAtivos(supabase)
	]);
	const projetos = (data ?? []).map((p) => ({
		...p,
		cliente: um(p.cliente),
		responsavel: um(p.responsavel)
	}));
	return {
		projetos,
		status,
		clientes: clientes ?? [],
		colaboradores: colaboradores ?? [],
		loadError: error?.message ?? null
	};
};
