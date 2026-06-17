import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { session, user, supabase }, cookies }) => {
	let aprovacoesPendentes = 0;
	if (session) {
		const { count } = await supabase
			.from('aprovacoes')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'pendente');
		aprovacoesPendentes = count ?? 0;
	}

	return {
		session,
		user,
		cookies: cookies.getAll(),
		aprovacoesPendentes
	};
};
