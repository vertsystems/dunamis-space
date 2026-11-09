import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
// `$env/dynamic/public` (em vez de `static`) não exige a var em tempo de build —
// build passa em qualquer ambiente (ex.: Preview da Vercel sem as vars setadas);
// os valores são lidos em runtime. Vars PUBLIC_ continuam expostas ao cliente.
import { env } from '$env/dynamic/public';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	const supabase: SupabaseClient<Database> = isBrowser()
		? createBrowserClient<Database>(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
				global: { fetch },
				// O "estou vivo" do Realtime sai de um Web Worker: com a aba em segundo
				// plano o navegador atrasa os timers da página, a conexão caía e voltava,
				// e no DGathe a pessoa sumia e reaparecia na tela dos outros.
				realtime: { worker: true }
			})
		: createServerClient<Database>(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
				global: { fetch },
				cookies: {
					getAll: () => data.cookies
				}
			});

	// Sessão e usuário vêm prontos do +layout.server.ts, que por sua vez os recebe
	// do hooks.server.ts — onde o getUser() já validou contra o servidor de auth.
	// Este load refazia getSession() + getUser() por conta própria, o que em SSR
	// era um SEGUNDO round-trip ao GoTrue em toda navegação, para chegar
	// exatamente no mesmo resultado.
	const { session, user } = data;

	// Encaminha aprovacoesPendentes + perfil do +layout.server.ts (o universal load
	// NÃO mescla o server load automaticamente).
	return {
		supabase,
		session,
		user,
		aprovacoesPendentes: data.aprovacoesPendentes,
		sosAbertos: data.sosAbertos,
		perfil: data.perfil,
		permissoes: data.permissoes,
		podeValores: data.podeValores
	};
};
