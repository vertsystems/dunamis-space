import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	locals: { session, user, supabase, permissoes },
	cookies
}) => {
	let aprovacoesPendentes = 0;
	let sosAbertos = 0;
	// Perfil do usuário logado (nome/avatar p/ o topo + cor de tema pessoal).
	// select('*') p/ degradar bem caso a migration 0009 ainda não tenha rodado.
	let perfil: Record<string, unknown> | null = null;
	if (session && user?.email) {
		const [aprov, perf, sos] = await Promise.all([
			supabase
				.from('aprovacoes')
				.select('id', { count: 'exact', head: true })
				.eq('status', 'pendente'),
			supabase.from('colaboradores').select('*').eq('email', user.email).maybeSingle(),
			supabase
				.from('sos_chamados')
				.select('id', { count: 'exact', head: true })
				.eq('status', 'aberto')
		]);
		aprovacoesPendentes = aprov.count ?? 0;
		perfil = perf.data ?? null;
		sosAbertos = sos.count ?? 0;
	}

	return {
		session,
		user,
		cookies: cookies.getAll(),
		aprovacoesPendentes,
		sosAbertos,
		perfil,
		permissoes
	};
};
