import { clientesLite } from '$lib/server/lookups';
import { um } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data, error }, { data: clientes }] = await Promise.all([
		supabase
			.from('campanhas')
			.select('id, nome, cliente_id, descricao, data_inicio, data_fim, cliente:clientes(nome)')
			.order('created_at', { ascending: false }),
		clientesLite(supabase)
	]);
	const campanhas = (data ?? []).map((c) => ({ ...c, cliente: um(c.cliente) }));
	return { campanhas, clientes: clientes ?? [], loadError: error?.message ?? null };
};
