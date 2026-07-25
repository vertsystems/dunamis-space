import { fail, redirect } from '@sveltejs/kit';
import { clienteFromForm } from '$lib/clientes';
import { exigirPermissao } from '$lib/server/permissao';
import { selComErro } from '$lib/server/query';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Lookup do formulário: se a query falha e o erro é engolido, o select fica
	// vazio e o usuário conclui que não há colaboradores — daí o aviso na tela.
	const { dados: colaboradores, erro } = await selComErro(
		supabase.from('colaboradores').select('id, nome, avatar_url, funcao, funcoes').eq('ativo', true).order('nome'),
		'clientes/novo: colaboradores ativos'
	);
	return {
		colaboradores,
		loadError: erro
			? 'Não foi possível carregar a lista de colaboradores. Recarregue a página.'
			: null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		exigirPermissao(locals, 'clientes', 'editar');
		const { supabase } = locals;
		const values = clienteFromForm(await request.formData());
		if (!values.nome) {
			return fail(400, { error: 'O nome é obrigatório.', values });
		}
		const { data, error } = await supabase.from('clientes').insert(values).select('id').single();
		if (error) {
			return fail(500, { error: error.message, values });
		}
		throw redirect(303, `/clientes/${data.id}`);
	}
};
