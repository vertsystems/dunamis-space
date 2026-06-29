import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('processos')
		.select('id, numero, nome, secretaria, responsavel, prazo, situacao, etapas')
		.order('numero', { ascending: true, nullsFirst: false })
		.order('created_at', { ascending: true });

	return {
		processos: data ?? [],
		// "relation does not exist" → migration 0004 ainda não aplicada.
		processosPendente: !!error && /processos/.test(error.message)
	};
};
