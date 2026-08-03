import { podeVerValores } from '$lib/valores';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	locals: { session, user, supabase, permissoes },
	cookies
}) => {
	let aprovacoesPendentes = 0;
	let sosAbertos = 0;
	// Perfil do usuário logado (nome/avatar p/ o topo + cor de tema pessoal).
	// Colunas explícitas: o select('*') anterior trazia custo_hora, super_admin e
	// telefone em TODA navegação, sem nenhum uso no shell.
	let perfil: Record<string, unknown> | null = null;
	if (session && user?.email) {
		const [aprov, perf, sos] = await Promise.all([
			supabase
				.from('aprovacoes')
				.select('id', { count: 'exact', head: true })
				.eq('status', 'pendente'),
			supabase
				.from('colaboradores')
				.select('id, nome, avatar_url, cor_tema, funcao, funcoes')
				.eq('email', user.email)
				.maybeSingle(),
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
		// Alimenta o createServerClient do +layout.ts durante o SSR.
		cookies: cookies.getAll(),
		aprovacoesPendentes,
		sosAbertos,
		perfil,
		permissoes,
		// Sai daqui (e não de cada página) para nenhuma tela esquecer de repassar.
		// Como `data` da página já traz o do layout, `data.podeValores` funciona
		// em qualquer rota. Não custa query: vem das permissões já carregadas.
		podeValores: podeVerValores(permissoes)
	};
};
