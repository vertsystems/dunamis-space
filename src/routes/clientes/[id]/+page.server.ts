import { colaboradoresAtivos } from '$lib/server/lookups';
import { error, fail, redirect } from '@sveltejs/kit';
import { clienteFromForm } from '$lib/clientes';
import { exigirPermissao } from '$lib/server/permissao';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: cliente, error: e }, { data: colaboradores }] = await Promise.all([
		supabase.from('clientes').select('*').eq('id', params.id).single(),
		colaboradoresAtivos(supabase)
	]);

	if (e || !cliente) throw error(404, 'Cliente não encontrado');

	return { cliente, colaboradores: colaboradores ?? [] };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		exigirPermissao(locals, 'clientes', 'editar');
		const { supabase } = locals;
		const values = clienteFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { error: e } = await supabase.from('clientes').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals }) => {
		exigirPermissao(locals, 'clientes', 'excluir');
		const { supabase } = locals;
		const { error: e } = await supabase.from('clientes').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/cadastro');
	}
};
