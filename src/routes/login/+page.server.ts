import { LOGIN_FOTOS } from '$lib/loginFotos';
import { FRASES } from '$lib/frases';
import type { PageServerLoad } from './$types';

// Sorteia (server-side, sem flash/mismatch) a foto e a frase do painel direito
// a cada acesso ao login — de forma independente ("mescladas").
export const load: PageServerLoad = () => {
	const hero =
		LOGIN_FOTOS.length > 0 ? LOGIN_FOTOS[Math.floor(Math.random() * LOGIN_FOTOS.length)] : null;
	const frase = FRASES.length > 0 ? FRASES[Math.floor(Math.random() * FRASES.length)] : null;
	return { hero, frase };
};
