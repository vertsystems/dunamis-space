import { fail, redirect } from '@sveltejs/kit';
import { processoFromForm } from '$lib/processos';
import { exigirPermissao } from '$lib/server/permissao';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		exigirPermissao(locals, 'processos', 'editar');
		const fd = await request.formData();
		const values = processoFromForm(fd);
		if (!values.nome) return fail(400, { error: 'Informe o nome do processo.', values });

		const { data, error } = await locals.supabase.from('processos').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });

		throw redirect(303, `/processos/${data.id}`);
	}
};
