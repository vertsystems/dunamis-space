import { fail, redirect } from '@sveltejs/kit';
import { colaboradorFromForm } from '$lib/equipe';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const values = colaboradorFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		if (!values.email) return fail(400, { error: 'O e-mail é obrigatório.', values });
		const { error } = await supabase.from('colaboradores').insert(values);
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, '/equipe');
	}
};
