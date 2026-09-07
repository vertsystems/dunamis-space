import { error } from '@sveltejs/kit';
import { acoesDeItem } from '$lib/server/crud';
import { projetos } from '$lib/server/recursos';
import { colaboradoresAtivos } from '$lib/server/lookups';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: projeto, error: e }, { data: colaboradores }] = await Promise.all([
		supabase.from('projetos').select('*').eq('id', params.id).single(),
		colaboradoresAtivos(supabase)
	]);

	if (e || !projeto) throw error(404, 'Projeto não encontrado');

	// O responsável vem do mesmo lookup que alimenta o formulário — sem uma
	// segunda consulta só para exibir nome e avatar no cabeçalho.
	const responsavel = (colaboradores ?? []).find((c) => c.id === projeto.responsavel_id) ?? null;

	return {
		projeto: { ...projeto, responsavel },
		colaboradores: colaboradores ?? []
	};
};

export const actions: Actions = acoesDeItem(projetos);
