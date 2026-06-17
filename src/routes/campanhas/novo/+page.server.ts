import { fail, redirect } from '@sveltejs/kit';
import { campanhaFromForm } from '$lib/campanhas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data } = await supabase.from('clientes').select('id, nome').order('nome');
	return { clientes: data ?? [] };
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const values = campanhaFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { data, error } = await supabase.from('campanhas').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/campanhas/${data.id}`);
	}
};
