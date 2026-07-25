import { clientesLite } from '$lib/server/lookups';
import { fail, redirect } from '@sveltejs/kit';
import { campanhaFromForm } from '$lib/campanhas';
import { exigirPermissao } from '$lib/server/permissao';
import { selComErro } from '$lib/server/query';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Lookup do formulário: sem tratar o erro, uma falha aqui deixa o select de
	// clientes vazio e parece que não há cliente cadastrado.
	const { dados: clientes, erro } = await selComErro(
		clientesLite(supabase),
		'campanhas/novo: lista de clientes'
	);
	return {
		clientes,
		loadError: erro ? 'Não foi possível carregar a lista de clientes. Recarregue a página.' : null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		exigirPermissao(locals, 'campanhas', 'editar');
		const { supabase } = locals;
		const values = campanhaFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { data, error } = await supabase.from('campanhas').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/campanhas/${data.id}`);
	}
};
