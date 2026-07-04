import { LOGIN_FOTOS } from '$lib/loginFotos';
import type { PageServerLoad } from './$types';

// Sorteia uma foto do painel direito a cada acesso ao login (server-side, sem
// flash nem mismatch de hidratação). Vazio → o hero cai no gradiente da marca.
export const load: PageServerLoad = () => {
	const hero =
		LOGIN_FOTOS.length > 0 ? LOGIN_FOTOS[Math.floor(Math.random() * LOGIN_FOTOS.length)] : null;
	return { hero };
};
