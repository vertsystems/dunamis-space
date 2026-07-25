import { fail, redirect } from '@sveltejs/kit';
import { transacaoFromForm } from '$lib/financeiro';
import { exigirPermissao } from '$lib/server/permissao';
import { selComErro } from '$lib/server/query';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Lookup do formulário: sem tratar o erro, uma falha aqui deixa o select de
	// clientes vazio e parece que não há cliente cadastrado.
	const { dados: clientes, erro } = await selComErro(
		supabase.from('clientes').select('id, nome').order('nome'),
		'financeiro/novo: lista de clientes'
	);
	return {
		clientes,
		loadError: erro ? 'Não foi possível carregar a lista de clientes. Recarregue a página.' : null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		exigirPermissao(locals, 'financeiro', 'editar');
		const values = transacaoFromForm(await request.formData());
		if (!values.valor && values.valor !== 0) return fail(400, { error: 'Informe o valor.', values });
		const { data, error } = await locals.supabase.from('transacoes').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/financeiro/${data.id}`);
	}
};
