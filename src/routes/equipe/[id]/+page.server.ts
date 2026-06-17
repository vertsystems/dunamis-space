import { error, fail, redirect } from '@sveltejs/kit';
import { colaboradorFromForm } from '$lib/equipe';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data: colaborador, error: e } = await supabase
		.from('colaboradores')
		.select('*')
		.eq('id', params.id)
		.single();
	if (e || !colaborador) throw error(404, 'Colaborador não encontrado');
	return { colaborador };
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = colaboradorFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		if (!values.email) return fail(400, { error: 'O e-mail é obrigatório.', values });
		const { error: e } = await supabase.from('colaboradores').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('colaboradores').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/equipe');
	}
};
