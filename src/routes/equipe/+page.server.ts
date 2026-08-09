import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('colaboradores')
		// `*` em vez da lista de colunas: o modal de edição preenche o formulário
		// com a linha da lista, então ela precisa trazer jornada_minutos/dias —
		// e pedir coluna por nome faz o PostgREST recusar a QUERY INTEIRA quando
		// o banco ainda não tem a coluna (migration não aplicada), deixando a
		// tela de Equipe vazia. Tabela pequena, o `*` sai barato.
		.select('*')
		.order('nome');
	return { colaboradores: data ?? [], loadError: error?.message ?? null };
};
