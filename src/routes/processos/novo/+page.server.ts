import { fail, redirect } from '@sveltejs/kit';
import { processoFromForm } from '$lib/processos';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const values = processoFromForm(fd);
		if (!values.nome) return fail(400, { error: 'Informe o nome do processo.', values });

		const { data, error } = await supabase.from('processos').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });

		throw redirect(303, `/processos/${data.id}`);
	}
};
