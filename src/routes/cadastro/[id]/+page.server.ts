import { error, fail, redirect } from '@sveltejs/kit';
import { clienteFromForm, erroDeMigration } from '$lib/clientes';
import { carregarCalendario } from '$lib/server/calendario';
import { exigirPermissao } from '$lib/server/permissao';
import { sel } from '$lib/server/query';
import { podeVerValores, preservarValores } from '$lib/valores';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals: { supabase, permissoes } }) => {
	const [{ data: cliente, error: e }, calendario] = await Promise.all([
		supabase.from('clientes').select('*').eq('id', params.id).single(),
		carregarCalendario(supabase, url, { clienteFixo: params.id })
	]);

	if (e || !cliente) throw error(404, 'Cliente não encontrado');

	// Responsáveis (multi): busca os colaboradores preservando a ordem do array.
	const ids: string[] = cliente.responsaveis_ids?.length
		? cliente.responsaveis_ids
		: cliente.responsavel_id
			? [cliente.responsavel_id]
			: [];
	let responsaveis: { id: string; nome: string; avatar_url: string | null; funcoes: string[] }[] = [];
	if (ids.length) {
		const rs = await sel(
			supabase.from('colaboradores').select('id, nome, avatar_url, funcao, funcoes').in('id', ids),
			'cadastro/[id]: responsáveis do cliente'
		);
		responsaveis = ids
			.map((id) => rs.find((r) => r.id === id))
			.filter((r): r is NonNullable<typeof r> => !!r)
			.map((r) => ({
				id: r.id,
				nome: r.nome,
				avatar_url: r.avatar_url ?? null,
				funcoes: r.funcoes?.length ? r.funcoes : r.funcao ? [r.funcao] : []
			}));
	}

	return {
		// O mrr nem chega ao navegador de quem não pode ver valores; o formulário
		// de edição preserva o que está no banco (ver a action update). A flag
		// `podeValores` para a UI vem do +layout.server.ts.
		cliente: {
			...cliente,
			mrr: podeVerValores(permissoes) ? cliente.mrr : null,
			responsaveis
		},
		calendario
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		exigirPermissao(locals, 'clientes', 'editar');
		const { supabase } = locals;
		const values = clienteFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		// Quem não vê o MRR também não o altera: o campo sai do update e a coluna
		// fica como está no banco.
		const patch = preservarValores(values, podeVerValores(locals.permissoes), 'mrr');
		const { error: e } = await supabase
			.from('clientes')
			.update({ ...patch, updated_at: new Date().toISOString() })
			.eq('id', params.id);
		if (e) {
			return fail(500, { error: erroDeMigration(e.message) ?? e.message, values });
		}
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
