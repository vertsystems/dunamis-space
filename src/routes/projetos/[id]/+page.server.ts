import { error, fail, redirect } from '@sveltejs/kit';
import { projetoFromForm } from '$lib/projetos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: projeto, error: e }, { data: clientes }, { data: colaboradores }] = await Promise.all([
		supabase.from('projetos').select('*, cliente:clientes(nome)').eq('id', params.id).single(),
		supabase.from('clientes').select('id, nome').order('nome'),
		supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome')
	]);
	if (e || !projeto) throw error(404, 'Projeto não encontrado');
	return { projeto, clientes: clientes ?? [], colaboradores: colaboradores ?? [] };
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = projetoFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { error: e } = await supabase.from('projetos').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('projetos').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/projetos');
	}
};
