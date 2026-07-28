import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Esta tela foi absorvida pelo Calendário Editorial (?view=aprovacoes). O redirect fica
// no lugar para não quebrar link salvo, favorito nem histórico do navegador.
export const load: PageServerLoad = async () => {
	redirect(308, '/calendario?view=aprovacoes');
};
