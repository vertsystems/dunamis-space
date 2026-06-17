import { error, fail, redirect } from '@sveltejs/kit';
import { tarefaFromForm } from '$lib/tarefas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: tarefa, error: e }, { data: projetos }, { data: colaboradores }] = await Promise.all([
		supabase.from('tarefas').select('*').eq('id', params.id).single(),
		supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
		supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome')
	]);
	if (e || !tarefa) throw error(404, 'Tarefa não encontrada');
	return { tarefa, projetos: projetos ?? [], colaboradores: colaboradores ?? [] };
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = tarefaFromForm(await request.formData());
		if (!values.titulo) return fail(400, { error: 'O título é obrigatório.', values });
		const { error: e } = await supabase.from('tarefas').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('tarefas').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/tarefas');
	}
};
