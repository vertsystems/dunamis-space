import { fail, redirect } from '@sveltejs/kit';
import { projetoFromForm } from '$lib/projetos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data: clientes }, { data: colaboradores }] = await Promise.all([
		supabase.from('clientes').select('id, nome').order('nome'),
		supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome')
	]);
	return { clientes: clientes ?? [], colaboradores: colaboradores ?? [] };
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const values = projetoFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { data, error } = await supabase.from('projetos').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/projetos/${data.id}`);
	}
};
