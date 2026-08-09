import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('colaboradores')
		// jornada_* entram porque o modal de edição preenche o formulário com a
		// linha da lista: sem elas, salvar pela lista reescreveria a jornada da
		// pessoa com o padrão de 8h/dia.
		.select('id, nome, email, funcao, funcoes, custo_hora, ativo, jornada_minutos, jornada_dias')
		.order('nome');
	return { colaboradores: data ?? [], loadError: error?.message ?? null };
};
