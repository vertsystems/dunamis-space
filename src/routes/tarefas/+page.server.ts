import { fail } from '@sveltejs/kit';
import { um } from '$lib/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const projeto = url.searchParams.get('projeto') ?? '';

	let query = supabase
		.from('tarefas')
		.select(
			'id, titulo, status, prioridade, prazo, projeto_id, responsavel_id, descricao, tempo_estimado, tempo_gasto, projeto:projetos(nome), responsavel:colaboradores(nome)'
		)
		.order('ordem', { ascending: true })
		.order('created_at', { ascending: false });

	if (projeto) query = query.eq('projeto_id', projeto);

	const [{ data, error }, { data: projetos }, { data: colaboradores }] = await Promise.all([
		query,
		supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
		supabase.from('colaboradores').select('id, nome, avatar_url, funcao, funcoes').eq('ativo', true).order('nome')
	]);

	let projetoNome: string | null = null;
	if (projeto) {
		const { data: p } = await supabase.from('projetos').select('nome').eq('id', projeto).single();
		projetoNome = p?.nome ?? null;
	}

	const tarefas = (data ?? []).map((t) => ({
		...t,
		projeto: um(t.projeto),
		responsavel: um(t.responsavel)
	}));
	return {
		tarefas,
		projeto,
		projetoNome,
		projetos: projetos ?? [],
		colaboradores: colaboradores ?? [],
		loadError: error?.message ?? null
	};
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
	},
	excluir: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const id = fd.get('id');
		if (typeof id !== 'string') return fail(400, { error: 'Dados inválidos' });
		const { error } = await supabase.from('tarefas').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	}
};
