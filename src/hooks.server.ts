import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/public';
import { MODULO_IDS, podeAcessarRota, type Permissoes } from '$lib/permissoes';

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	// Valida a sessão contra o servidor de auth (getUser), não só o cookie.
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;
	event.locals.permissoes = {};

	// Rotas públicas: login, redefinição de senha e o portal externo de aprovação.
	const publicRoute =
		event.url.pathname.startsWith('/login') ||
		event.url.pathname.startsWith('/redefinir-senha') ||
		event.url.pathname.startsWith('/aprovar');

	if (!session && !publicRoute) {
		throw redirect(303, '/login');
	}

	if (session && event.url.pathname === '/login') {
		throw redirect(303, '/');
	}

	// Permissões efetivas do usuário (calculadas no banco) + guarda de rota.
	if (session && !publicRoute) {
		const { data } = await event.locals.supabase.rpc('perm_niveis', { p_modulos: MODULO_IDS });
		event.locals.permissoes = (data ?? {}) as Permissoes;

		if (!podeAcessarRota(event.locals.permissoes, event.url.pathname)) {
			throw redirect(303, '/');
		}
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
