import { fail, redirect } from '@sveltejs/kit';
import { conteudoFromForm } from '$lib/conteudo';
import { nomesDeCampanha } from '$lib/server/conteudo';
import { exigirPermissao } from '$lib/server/permissao';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data: clientes }, { data: projetos }, { data: colaboradores }, campanhas] = await Promise.all([
		supabase.from('clientes').select('id, nome').order('nome'),
		supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
		supabase.from('colaboradores').select('id, nome, avatar_url, funcao, funcoes').eq('ativo', true).order('nome'),
		nomesDeCampanha(supabase)
	]);
	return { clientes: clientes ?? [], projetos: projetos ?? [], colaboradores: colaboradores ?? [], campanhas };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		exigirPermissao(locals, 'conteudo', 'editar');
		const { supabase } = locals;
		const values = conteudoFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		const { data, error } = await supabase.from('conteudos').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/conteudo/${data.id}`);
	}
};
