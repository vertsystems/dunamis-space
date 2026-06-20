import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/public';

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

	// Rotas públicas: login, portal externo de aprovação (/aprovar/[token]) e
	// os endpoints de cron (protegidos pelo próprio CRON_SECRET, não pela sessão).
	const publicRoute =
		event.url.pathname.startsWith('/login') ||
		event.url.pathname.startsWith('/aprovar') ||
		event.url.pathname.startsWith('/api/cron');

	if (!session && !publicRoute) {
		throw redirect(303, '/login');
	}

	if (session && event.url.pathname === '/login') {
		throw redirect(303, '/');
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
