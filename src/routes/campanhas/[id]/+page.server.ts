import { error, fail, redirect } from '@sveltejs/kit';
import { campanhaFromForm, produtoFromForm, materialFromForm } from '$lib/campanhas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: campanha, error: e }, { data: clientes }, { data: produtos }, { data: materiais }] =
		await Promise.all([
			supabase.from('campanhas').select('*, cliente:clientes(nome)').eq('id', params.id).single(),
			supabase.from('clientes').select('id, nome').order('nome'),
			supabase
				.from('campanha_produtos')
				.select('*')
				.eq('campanha_id', params.id)
				.order('created_at', { ascending: true }),
			supabase
				.from('campanha_materiais')
				.select('*')
				.eq('campanha_id', params.id)
				.order('created_at', { ascending: true })
		]);
	if (e || !campanha) throw error(404, 'Campanha não encontrada');
	return { campanha, clientes: clientes ?? [], produtos: produtos ?? [], materiais: materiais ?? [] };
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = campanhaFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		const { error: e } = await supabase.from('campanhas').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	addProduto: async ({ request, params, locals: { supabase } }) => {
		const values = produtoFromForm(await request.formData());
		if (!values.nome) return fail(400, { produtoError: 'Informe o nome do produto.' });
		const { error: e } = await supabase
			.from('campanha_produtos')
			.insert({ ...values, campanha_id: params.id });
		if (e) return fail(500, { produtoError: e.message });
		return { produtoOk: true };
	},
	delProduto: async ({ request, locals: { supabase } }) => {
		const id = (await request.formData()).get('id');
		if (typeof id === 'string') await supabase.from('campanha_produtos').delete().eq('id', id);
		return { produtoOk: true };
	},
	addMaterial: async ({ request, params, locals: { supabase } }) => {
		const values = materialFromForm(await request.formData());
		const { error: e } = await supabase
			.from('campanha_materiais')
			.insert({ ...values, campanha_id: params.id });
		if (e) return fail(500, { materialError: e.message });
		return { materialOk: true };
	},
	delMaterial: async ({ request, locals: { supabase } }) => {
		const id = (await request.formData()).get('id');
		if (typeof id === 'string') await supabase.from('campanha_materiais').delete().eq('id', id);
		return { materialOk: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('campanhas').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/campanhas');
	}
};
