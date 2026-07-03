import type { PageServerLoad } from './$types';

function um<T>(v: T | T[] | null | undefined): T | null {
	return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const {
		data: { user }
	} = await supabase.auth.getUser();

	const { data: colab } = user
		? await supabase
				.from('colaboradores')
				.select('id, nome')
				.eq('auth_user_id', user.id)
				.maybeSingle()
		: { data: null };
	const meuId = (colab?.id as string | undefined) ?? null;

	// Minhas tarefas em aberto (todas da equipe se o login não estiver vinculado).
	let tq = supabase
		.from('tarefas')
		.select('id, titulo, prazo, prioridade, projeto:projetos(nome)')
		.neq('status', 'concluido')
		.order('prazo', { ascending: true, nullsFirst: false })
		.limit(60);
	if (meuId) tq = tq.eq('responsavel_id', meuId);
	const { data: tarefasRaw } = await tq;

	// Minhas atividades do CRM pendentes (degrada se a migration 0005 não existir).
	let aq = supabase
		.from('crm_atividades')
		.select(
			'id, tipo, titulo, data_hora, negocio:crm_negocios(id, titulo), contato:crm_contatos(id, nome)'
		)
		.eq('concluida', false)
		.order('data_hora', { ascending: true, nullsFirst: false })
		.limit(60);
	if (meuId) aq = aq.eq('responsavel_id', meuId);
	const { data: atividadesRaw, error: aErr } = await aq;

	const tarefas = (tarefasRaw ?? []).map((t) => ({
		id: t.id as string,
		titulo: t.titulo as string,
		prazo: (t.prazo as string | null) ?? null,
		prioridade: t.prioridade as string,
		projeto_nome: um<{ nome: string }>(t.projeto)?.nome ?? null
	}));

	const atividades = aErr
		? []
		: (atividadesRaw ?? []).map((a) => ({
				id: a.id as string,
				tipo: a.tipo as string,
				titulo: (a.titulo as string | null) ?? null,
				data_hora: (a.data_hora as string | null) ?? null,
				negocio_titulo: um<{ id: string; titulo: string }>(a.negocio)?.titulo ?? null,
				contato_nome: um<{ id: string; nome: string }>(a.contato)?.nome ?? null
			}));

	return {
		nome: (colab?.nome as string | undefined) ?? null,
		semColaborador: !meuId,
		tarefas,
		atividades
	};
};
