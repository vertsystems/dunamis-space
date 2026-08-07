import { createServerClient } from '@supabase/ssr';
import type { Database } from '$lib/database.types';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/public';
import { MODULO_IDS, podeAcessarRota, type Permissoes } from '$lib/permissoes';

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient<Database>(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
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
	// Rotas públicas: login, redefinição de senha e o portal externo de aprovação.
	const publicRoute =
		event.url.pathname.startsWith('/login') ||
		event.url.pathname.startsWith('/redefinir-senha') ||
		event.url.pathname.startsWith('/aprovar');

	// getSession() só lê e decodifica o cookie — é local, sem rede. As duas
	// chamadas CARAS são getUser() (valida no servidor de auth) e o RPC de
	// permissões, e elas não dependem uma da outra: ambas precisam apenas do
	// cookie. Antes rodavam em série e esse era o piso de latência de TODA
	// requisição, inclusive dos __data.json de navegação e de toda action.
	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	const precisaPerms = !!session && !publicRoute;
	const [userRes, permsRes] = await Promise.all([
		session
			? event.locals.supabase.auth.getUser()
			: Promise.resolve({ data: { user: null }, error: null }),
		precisaPerms
			? event.locals.supabase.rpc('perm_niveis', { p_modulos: MODULO_IDS })
			: Promise.resolve({ data: null })
	]);

	// getUser() com erro = sessão inválida; o RPC feito em paralelo é descartado.
	const sessaoValida = !!session && !userRes.error;
	event.locals.session = sessaoValida ? session : null;
	event.locals.user = sessaoValida ? userRes.data.user : null;
	event.locals.permissoes = {};

	if (!sessaoValida && !publicRoute) {
		throw redirect(303, '/login');
	}

	if (sessaoValida && event.url.pathname === '/login') {
		throw redirect(303, '/');
	}

	// Permissões efetivas do usuário (calculadas no banco) + guarda de rota.
	if (sessaoValida && !publicRoute) {
		event.locals.permissoes = (permsRes.data ?? {}) as Permissoes;

		if (!podeAcessarRota(event.locals.permissoes, event.url.pathname)) {
			throw redirect(303, '/');
		}
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
