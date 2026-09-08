import { colaboradoresAtivos } from '$lib/server/lookups';
import { um } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const status = url.searchParams.get('status') ?? '';
	const q = url.searchParams.get('q')?.trim() ?? '';
	// Grade (cartões) é o padrão; a lista é para quando são muitos projetos e o
	// que importa é comparar linha a linha. Valor desconhecido cai na grade.
	const visao = url.searchParams.get('visao') === 'lista' ? 'lista' : 'grade';

	let query = supabase
		.from('projetos')
		.select('id, nome, status, descricao, url, responsavel_id, updated_at, responsavel:colaboradores(nome, avatar_url)')
		.order('created_at', { ascending: false });

	if (status) query = query.eq('status', status);
	if (q) query = query.ilike('nome', `%${q}%`);

	const [{ data, error }, { data: colaboradores }] = await Promise.all([
		query,
		colaboradoresAtivos(supabase)
	]);

	const projetos = (data ?? []).map((p) => ({ ...p, responsavel: um(p.responsavel) }));

	return {
		projetos,
		status,
		q,
		visao,
		colaboradores: colaboradores ?? [],
		loadError: error?.message ?? null
	};
};
