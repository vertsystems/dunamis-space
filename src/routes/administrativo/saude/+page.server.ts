import { error } from '@sveltejs/kit';
import type { ResumoSaude } from '$lib/saude';
import type { PageServerLoad } from './$types';

/**
 * Uma chamada só ao banco: a função `saude_resumo()` (0063) percorre as tabelas
 * lá dentro e devolve contagem, data da última linha e tamanho de cada uma.
 * A permissão do módulo 'administrativo' é conferida pela própria função — a
 * rota já está atrás da mesma guarda no hooks.server.ts.
 */
export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error: e } = await supabase.rpc('saude_resumo');
	if (e) {
		// Função ausente = migration 0063 pendente; o resto é erro de verdade.
		if (/saude_resumo|does not exist|schema cache/i.test(e.message)) {
			return { resumo: null, pendente: true, erro: null };
		}
		throw error(500, e.message);
	}
	return { resumo: data as unknown as ResumoSaude, pendente: false, erro: null };
};
