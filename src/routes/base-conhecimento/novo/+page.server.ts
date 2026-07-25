import { fail, redirect } from '@sveltejs/kit';
import { kbFromForm } from '$lib/kb';
import { exigirPermissao } from '$lib/server/permissao';
import { selComErro } from '$lib/server/query';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Lookup do formulário: sem tratar o erro, uma falha aqui deixa o select de
	// clientes vazio e parece que não há cliente cadastrado.
	const { dados: clientes, erro } = await selComErro(
		supabase.from('clientes').select('id, nome').order('nome'),
		'base-conhecimento/novo: lista de clientes'
	);
	return {
		clientes,
		loadError: erro ? 'Não foi possível carregar a lista de clientes. Recarregue a página.' : null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		exigirPermissao(locals, 'base_conhecimento', 'editar');
		const values = kbFromForm(await request.formData());
		if (!values.titulo) return fail(400, { error: 'O título é obrigatório.', values });
		const { data, error } = await locals.supabase.from('kb_artigos').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/base-conhecimento/${data.id}`);
	}
};
