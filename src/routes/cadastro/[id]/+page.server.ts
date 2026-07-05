import { error, fail, redirect } from '@sveltejs/kit';
import { clienteFromForm } from '$lib/clientes';
import { carregarCalendario } from '$lib/server/calendario';
import { um } from '$lib/db';
import type { Actions, PageServerLoad } from './$types';

/** Erro de coluna inexistente → migration 0006 ainda não aplicada. */
const PENDENTE_RX = /does not exist|column|schema cache|relation/i;

export const load: PageServerLoad = async ({ params, url, locals: { supabase } }) => {
	const [{ data: cliente, error: e }, calendario] = await Promise.all([
		supabase
			.from('clientes')
			.select('*, responsavel:colaboradores(nome, avatar_url, funcao)')
			.eq('id', params.id)
			.single(),
		carregarCalendario(supabase, url, { clienteFixo: params.id })
	]);

	if (e || !cliente) throw error(404, 'Cliente não encontrado');

	const resp = um<{ nome: string; avatar_url: string | null; funcao: string | null }>(cliente.responsavel);

	return {
		cliente: {
			...cliente,
			responsavel_nome: resp?.nome ?? null,
			responsavel_avatar: resp?.avatar_url ?? null,
			responsavel_funcao: resp?.funcao ?? null
		},
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
