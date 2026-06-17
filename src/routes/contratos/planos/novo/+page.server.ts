import { fail, redirect } from '@sveltejs/kit';
import { planoFromForm } from '$lib/contratos';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const values = planoFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { error } = await supabase.from('planos').insert(values);
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, '/contratos/planos');
	}
};
