import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { error, fail } from '@sveltejs/kit';
import { acoesDeItem } from '$lib/server/crud';
// Renomeado: `conteudo` é o nome da linha carregada no load logo abaixo.
import { conteudo as recursoConteudo } from '$lib/server/recursos';
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
		clientesLite(supabase),
		supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
		colaboradoresAtivos(supabase),
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
	...acoesDeItem(recursoConteudo),

	// Fora do CRUD: cria o link público de aprovação e move o conteúdo de status.
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
	}
};
