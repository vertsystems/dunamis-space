import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { fail, redirect } from '@sveltejs/kit';
import { projetoFromForm } from '$lib/projetos';
import { exigirPermissao } from '$lib/server/permissao';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data: clientes }, { data: colaboradores }] = await Promise.all([
		clientesLite(supabase),
		colaboradoresAtivos(supabase)
	]);
	return { clientes: clientes ?? [], colaboradores: colaboradores ?? [] };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		exigirPermissao(locals, 'projetos', 'editar');
		const values = projetoFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { data, error } = await locals.supabase.from('projetos').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/projetos/${data.id}`);
	}
};
