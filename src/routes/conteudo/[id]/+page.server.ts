import { error, fail, redirect } from '@sveltejs/kit';
import { conteudoFromForm } from '$lib/conteudo';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [{ data: conteudo, error: e }, { data: clientes }, { data: projetos }, { data: colaboradores }] =
		await Promise.all([
			supabase.from('conteudos').select('*').eq('id', params.id).single(),
			supabase.from('clientes').select('id, nome').order('nome'),
			supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
			supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome')
		]);
	if (e || !conteudo) throw error(404, 'Conteúdo não encontrado');
	return { conteudo, clientes: clientes ?? [], projetos: projetos ?? [], colaboradores: colaboradores ?? [] };
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const values = conteudoFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		const { error: e } = await supabase.from('conteudos').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	delete: async ({ params, locals: { supabase } }) => {
		const { error: e } = await supabase.from('conteudos').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/conteudo');
	}
};
