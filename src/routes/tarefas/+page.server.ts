import { fail } from '@sveltejs/kit';
import { um } from '$lib/db';
import { exigirPermissao } from '$lib/server/permissao';
import { sel, selUm } from '$lib/server/query';
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

	const [{ data, error }, projetos, colaboradores] = await Promise.all([
		query,
		sel(
			supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
			'tarefas: lista de projetos'
		),
		sel(
			supabase
				.from('colaboradores')
				.select('id, nome, avatar_url, funcao, funcoes')
				.eq('ativo', true)
				.order('nome'),
			'tarefas: colaboradores ativos'
		)
	]);

	let projetoNome: string | null = null;
	if (projeto) {
		const p = await selUm<{ nome: string }>(
			supabase.from('projetos').select('nome').eq('id', projeto).single(),
			`tarefas: nome do projeto ${projeto}`
		);
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
		projetos,
		colaboradores,
		loadError: error?.message ?? null
	};
};

export const actions: Actions = {
	move: async ({ request, locals }) => {
		exigirPermissao(locals, 'tarefas', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = fd.get('id');
		const status = fd.get('status');
		if (typeof id !== 'string' || typeof status !== 'string') return fail(400, { error: 'Dados inválidos' });
		const { error } = await supabase.from('tarefas').update({ status }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},
	excluir: async ({ request, locals }) => {
		exigirPermissao(locals, 'tarefas', 'excluir');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = fd.get('id');
		if (typeof id !== 'string') return fail(400, { error: 'Dados inválidos' });
		const { error } = await supabase.from('tarefas').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	}
};
