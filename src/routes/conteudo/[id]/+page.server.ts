import { error, fail, redirect } from '@sveltejs/kit';
import { conteudoFromForm } from '$lib/conteudo';
import { nomesDeCampanha } from '$lib/server/conteudo';
import { exigirPermissao } from '$lib/server/permissao';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [
		{ data: conteudo, error: e },
		{ data: clientes },
		{ data: projetos },
		{ data: colaboradores },
		{ data: aprovacoes },
		campanhas
	] = await Promise.all([
		supabase.from('conteudos').select('*').eq('id', params.id).single(),
		supabase.from('clientes').select('id, nome').order('nome'),
		supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
		supabase.from('colaboradores').select('id, nome, avatar_url, funcao, funcoes').eq('ativo', true).order('nome'),
		supabase
			.from('aprovacoes')
			.select('id, status, token_publico, data_envio, data_resposta, comentario_cliente')
			.eq('conteudo_id', params.id)
			.order('created_at', { ascending: false })
			.limit(1),
		nomesDeCampanha(supabase)
	]);
	if (e || !conteudo) throw error(404, 'Conteúdo não encontrado');
	return {
		conteudo,
		clientes: clientes ?? [],
		projetos: projetos ?? [],
		colaboradores: colaboradores ?? [],
		campanhas,
		aprovacao: aprovacoes?.[0] ?? null
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		exigirPermissao(locals, 'conteudo', 'editar');
		const { supabase } = locals;
		const values = conteudoFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		const { error: e } = await supabase.from('conteudos').update(values).eq('id', params.id);
		if (e) return fail(500, { error: e.message, values });
		return { saved: true };
	},
	enviarAprovacao: async ({ params, locals }) => {
		exigirPermissao(locals, 'conteudo', 'editar');
		const { supabase } = locals;
		const { error: e } = await supabase.from('aprovacoes').insert({ conteudo_id: params.id });
		if (e) return fail(500, { error: e.message });
		// Sem checar este segundo erro, existia link de aprovação ativo com o
		// conteúdo parado no status anterior — fora da fila e do KPI.
		const { error: eStatus } = await supabase
			.from('conteudos')
			.update({ status: 'aprovar_conteudo' })
			.eq('id', params.id);
		if (eStatus) return fail(500, { error: `Link criado, mas o status não mudou: ${eStatus.message}` });
		return { aprovacaoCriada: true };
	},
	delete: async ({ params, locals }) => {
		exigirPermissao(locals, 'conteudo', 'excluir');
		const { supabase } = locals;
		const { error: e } = await supabase.from('conteudos').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/conteudo');
	}
};
