import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';

	let query = supabase
		.from('clientes')
		.select('id, nome, cnpj_cpf, cidade, estado, plano_ref, mrr, dia_vencimento')
		.order('nome', { ascending: true });

	if (q) query = query.ilike('nome', `%${q}%`);

	const { data, error } = await query;

	// Degradação: a migration 0006 pode não ter sido aplicada (colunas novas).
	const pendente =
		!!error && /adm_|does not exist|column|schema cache|relation/i.test(error?.message ?? '');

	return {
		clientes: pendente ? [] : (data ?? []),
		q,
		pendente,
		loadError: pendente ? null : (error?.message ?? null)
	};
};
