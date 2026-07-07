import { fail, redirect } from '@sveltejs/kit';
import { contratoFromForm } from '$lib/contratos';
import { exigirPermissao } from '$lib/server/permissao';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data: clientes }, { data: planos }] = await Promise.all([
		supabase.from('clientes').select('id, nome').order('nome'),
		supabase.from('planos').select('id, nome, valor_mensal').eq('ativo', true).order('valor_mensal')
	]);
	return { clientes: clientes ?? [], planos: planos ?? [] };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		exigirPermissao(locals, 'contratos', 'editar');
		const values = contratoFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		const { data, error } = await locals.supabase.from('contratos').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/contratos/${data.id}`);
	}
};
