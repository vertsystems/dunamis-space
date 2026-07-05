import { error, fail, redirect } from '@sveltejs/kit';
import { clienteFromForm } from '$lib/clientes';
import { carregarCalendario } from '$lib/server/calendario';
import type { Actions, PageServerLoad } from './$types';

/** Erro de coluna inexistente → migration 0006 ainda não aplicada. */
const PENDENTE_RX = /does not exist|column|schema cache|relation/i;

export const load: PageServerLoad = async ({ params, url, locals: { supabase } }) => {
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
		const { data: rs } = await supabase
			.from('colaboradores')
			.select('id, nome, avatar_url, funcao, funcoes')
			.in('id', ids);
		responsaveis = ids
			.map((id) => rs?.find((r) => r.id === id))
			.filter((r): r is NonNullable<typeof r> => !!r)
			.map((r) => ({
				id: r.id,
				nome: r.nome,
				avatar_url: r.avatar_url ?? null,
				funcoes: r.funcoes?.length ? r.funcoes : r.funcao ? [r.funcao] : []
			}));
	}

	return {
		cliente: { ...cliente, responsaveis },
		calendario
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = clienteFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { error: e } = await supabase
			.from('clientes')
			.update({ ...values, updated_at: new Date().toISOString() })
			.eq('id', params.id);
		if (e) {
			const msg = PENDENTE_RX.test(e.message)
				? 'Módulo ainda não ativado. Aplique a migration 0006_administrativo.sql no Supabase.'
				: e.message;
			return fail(500, { error: msg, values });
		}
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('clientes').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/cadastro');
	}
};
