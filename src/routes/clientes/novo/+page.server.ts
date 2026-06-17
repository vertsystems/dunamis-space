import { fail, redirect } from '@sveltejs/kit';
import { clienteFromForm } from '$lib/clientes';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data } = await supabase
		.from('colaboradores')
		.select('id, nome')
		.eq('ativo', true)
		.order('nome');
	return { colaboradores: data ?? [] };
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
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
