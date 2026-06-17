import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const projeto = url.searchParams.get('projeto') ?? '';

	let query = supabase
		.from('tarefas')
		.select(
			'id, titulo, status, prioridade, prazo, projeto_id, projeto:projetos(nome), responsavel:colaboradores(nome)'
		)
		.order('ordem', { ascending: true })
		.order('created_at', { ascending: false });

	if (projeto) query = query.eq('projeto_id', projeto);

	const { data, error } = await query;

	let projetoNome: string | null = null;
	if (projeto) {
		const { data: p } = await supabase.from('projetos').select('nome').eq('id', projeto).single();
		projetoNome = p?.nome ?? null;
	}

	return { tarefas: data ?? [], projeto, projetoNome, loadError: error?.message ?? null };
};

export const actions: Actions = {
	move: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const id = fd.get('id');
		const status = fd.get('status');
		if (typeof id !== 'string' || typeof status !== 'string') return fail(400, { error: 'Dados inválidos' });
		const { error } = await supabase.from('tarefas').update({ status }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	}
};
