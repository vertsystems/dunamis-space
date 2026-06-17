import { fail, redirect } from '@sveltejs/kit';
import { kbFromForm } from '$lib/kb';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data } = await supabase.from('clientes').select('id, nome').order('nome');
	return { clientes: data ?? [] };
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const values = kbFromForm(await request.formData());
		if (!values.titulo) return fail(400, { error: 'O título é obrigatório.', values });
		const { data, error } = await supabase.from('kb_artigos').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/base-conhecimento/${data.id}`);
	}
};
