import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { session, user, supabase }, cookies }) => {
	let aprovacoesPendentes = 0;
	// Perfil do usuário logado (nome/avatar p/ o topo + cor de tema pessoal).
	// select('*') p/ degradar bem caso a migration 0009 ainda não tenha rodado.
	let perfil: Record<string, unknown> | null = null;
	if (session && user?.email) {
		const [aprov, perf] = await Promise.all([
			supabase
				.from('aprovacoes')
				.select('id', { count: 'exact', head: true })
				.eq('status', 'pendente'),
			supabase.from('colaboradores').select('*').eq('email', user.email).maybeSingle()
		]);
		aprovacoesPendentes = aprov.count ?? 0;
		perfil = perf.data ?? null;
	}

	return {
		session,
		user,
		cookies: cookies.getAll(),
		aprovacoesPendentes,
		perfil
	};
};
