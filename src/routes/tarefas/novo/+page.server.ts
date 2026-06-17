import { fail, redirect } from '@sveltejs/kit';
import { tarefaFromForm } from '$lib/tarefas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data: projetos }, { data: colaboradores }] = await Promise.all([
		supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
		supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome')
	]);
	return { projetos: projetos ?? [], colaboradores: colaboradores ?? [] };
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const values = tarefaFromForm(await request.formData());
		if (!values.titulo) return fail(400, { error: 'O título é obrigatório.', values });
		const { error } = await supabase.from('tarefas').insert(values);
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, '/tarefas');
	}
};
