import { error, fail, redirect } from '@sveltejs/kit';
import { contratoFromForm } from '$lib/contratos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: contrato, error: e }, { data: clientes }, { data: planos }] = await Promise.all([
		supabase.from('contratos').select('*, cliente:clientes(nome)').eq('id', params.id).single(),
		supabase.from('clientes').select('id, nome').order('nome'),
		supabase.from('planos').select('id, nome, valor_mensal').order('valor_mensal')
	]);
	if (e || !contrato) throw error(404, 'Contrato não encontrado');
	return { contrato, clientes: clientes ?? [], planos: planos ?? [] };
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = contratoFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		const { error: e } = await supabase.from('contratos').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('contratos').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/contratos');
	}
};
