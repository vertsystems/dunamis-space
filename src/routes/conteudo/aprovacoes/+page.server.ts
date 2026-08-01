import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Esta tela foi aposentada junto com a aba Aprovações do Calendário Editorial.
// O redirect fica no lugar para não quebrar link salvo, favorito nem histórico.
export const load: PageServerLoad = async () => {
	redirect(308, '/calendario?view=lista');
};
