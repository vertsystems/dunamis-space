import { error, fail, redirect } from '@sveltejs/kit';
import { clienteFromForm } from '$lib/clientes';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: cliente, error: e }, { data: colaboradores }] = await Promise.all([
		supabase.from('clientes').select('*').eq('id', params.id).single(),
		supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome')
	]);

	if (e || !cliente) throw error(404, 'Cliente não encontrado');

	return { cliente, colaboradores: colaboradores ?? [] };
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = clienteFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { error: e } = await supabase.from('clientes').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('clientes').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/clientes');
	}
};
