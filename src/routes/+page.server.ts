import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ count: ativos }, { data: mrrRows }] = await Promise.all([
		supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
		supabase.from('clientes').select('mrr').eq('status', 'ativo')
	]);

	const recorrente = (mrrRows ?? []).reduce((sum, r) => sum + Number(r.mrr ?? 0), 0);

	return { ativos: ativos ?? 0, recorrente };
};
