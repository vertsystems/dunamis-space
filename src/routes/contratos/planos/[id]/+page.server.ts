import { error, fail, redirect } from '@sveltejs/kit';
import { planoFromForm } from '$lib/contratos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data: plano, error: e } = await supabase
		.from('planos')
		.select('*')
		.eq('id', params.id)
		.single();
	if (e || !plano) throw error(404, 'Plano não encontrado');
	return { plano };
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = planoFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { error: e } = await supabase.from('planos').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('planos').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/contratos/planos');
	}
};
