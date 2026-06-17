import { error, fail, redirect } from '@sveltejs/kit';
import { kbFromForm } from '$lib/kb';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: artigo, error: e }, { data: clientes }] = await Promise.all([
		supabase.from('kb_artigos').select('*').eq('id', params.id).single(),
		supabase.from('clientes').select('id, nome').order('nome')
	]);
	if (e || !artigo) throw error(404, 'Artigo não encontrado');
	return { artigo, clientes: clientes ?? [] };
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = kbFromForm(await request.formData());
		if (!values.titulo) return fail(400, { error: 'O título é obrigatório.', values });
		const { error: e } = await supabase.from('kb_artigos').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('kb_artigos').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/base-conhecimento');
	}
};
