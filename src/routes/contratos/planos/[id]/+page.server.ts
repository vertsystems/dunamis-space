import { error, fail, redirect } from '@sveltejs/kit';
import { planoFromForm } from '$lib/contratos';
import { exigirPermissao } from '$lib/server/permissao';
import { podeVerValores, preservarValores } from '$lib/valores';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, permissoes } }) => {
	const { data: plano, error: e } = await supabase
		.from('planos')
		.select('*')
		.eq('id', params.id)
		.single();
	if (e || !plano) throw error(404, 'Plano não encontrado');
	return {
		plano: { ...plano, valor_mensal: podeVerValores(permissoes) ? plano.valor_mensal : null }
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		exigirPermissao(locals, 'contratos', 'editar');
		const values = planoFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		// Sem permissão de valores, o valor_mensal sai do update (fica o do banco).
		const patch = preservarValores(values, podeVerValores(locals.permissoes), 'valor_mensal');
		const { error: e } = await locals.supabase.from('planos').update(patch).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals }) => {
		exigirPermissao(locals, 'contratos', 'excluir');
		const { error: e } = await locals.supabase.from('planos').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/contratos/planos');
	}
};
