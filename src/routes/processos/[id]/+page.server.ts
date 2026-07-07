import { error as svelteError, fail, redirect } from '@sveltejs/kit';
import { processoFromForm } from '$lib/processos';
import { exigirPermissao } from '$lib/server/permissao';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('processos')
		.select('id, numero, nome, secretaria, responsavel, prazo, situacao, etapas')
		.eq('id', params.id)
		.single();

	if (error || !data) throw svelteError(404, 'Processo não encontrado');
	return { processo: data };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		exigirPermissao(locals, 'processos', 'editar');
		const fd = await request.formData();
		const values = processoFromForm(fd);
		if (!values.nome) return fail(400, { error: 'Informe o nome do processo.', values });

		const { error } = await locals.supabase
			.from('processos')
			.update({ ...values, updated_at: new Date().toISOString() })
			.eq('id', params.id);
		if (error) return fail(500, { error: error.message, values });
		return { saved: true };
	},

	delete: async ({ params, locals }) => {
		exigirPermissao(locals, 'processos', 'excluir');
		const { error } = await locals.supabase.from('processos').delete().eq('id', params.id);
		if (error) return fail(500, { error: error.message });
		throw redirect(303, '/processos');
	}
};
