import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
// `$env/dynamic/public` (em vez de `static`) não exige a var em tempo de build —
// build passa em qualquer ambiente (ex.: Preview da Vercel sem as vars setadas);
// os valores são lidos em runtime. Vars PUBLIC_ continuam expostas ao cliente.
import { env } from '$env/dynamic/public';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
				global: { fetch }
			})
		: createServerClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
				global: { fetch },
				cookies: {
					getAll: () => data.cookies
				}
			});

	const {
		data: { session }
	} = await supabase.auth.getSession();

	const {
		data: { user }
	} = await supabase.auth.getUser();

	return { supabase, session, user };
};
