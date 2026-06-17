import { error, fail, redirect } from '@sveltejs/kit';
import { transacaoFromForm } from '$lib/financeiro';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: transacao, error: e }, { data: clientes }] = await Promise.all([
		supabase.from('transacoes').select('*').eq('id', params.id).single(),
		supabase.from('clientes').select('id, nome').order('nome')
	]);
	if (e || !transacao) throw error(404, 'Transação não encontrada');
	return { transacao, clientes: clientes ?? [] };
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = transacaoFromForm(await request.formData());
		const { error: e } = await supabase.from('transacoes').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('transacoes').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/financeiro');
	}
};
