import { fail, redirect } from '@sveltejs/kit';
import { transacaoFromForm } from '$lib/financeiro';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data } = await supabase.from('clientes').select('id, nome').order('nome');
	return { clientes: data ?? [] };
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const values = transacaoFromForm(await request.formData());
		if (!values.valor && values.valor !== 0) return fail(400, { error: 'Informe o valor.', values });
		const { data, error } = await supabase.from('transacoes').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/financeiro/${data.id}`);
	}
};
