import { LOGIN_FOTOS } from '$lib/loginFotos';
import { FRASES } from '$lib/frases';
import type { PageServerLoad } from './$types';

// Sorteia (server-side, sem flash/mismatch) a foto e a frase do painel direito
// a cada acesso ao login — de forma independente ("mescladas").
export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const hero =
		LOGIN_FOTOS.length > 0 ? LOGIN_FOTOS[Math.floor(Math.random() * LOGIN_FOTOS.length)] : null;
	const frase = FRASES.length > 0 ? FRASES[Math.floor(Math.random() * FRASES.length)] : null;

	// Perfis para as bolinhas. Vem da função login_perfis (migration 0045), que é
	// security definer porque a RLS de colaboradores não libera nada a anônimo.
	// Se a migration ainda não rodou, a tela cai no formulário de e-mail.
	const { data: perfis } = await supabase.rpc('login_perfis');

	return {
		hero,
		frase,
		perfis: (perfis ?? []) as {
			id: string;
			nome: string;
			email: string;
			avatar_url: string | null;
			funcao: string | null;
		}[]
	};
};
