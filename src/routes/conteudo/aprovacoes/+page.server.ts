import type { PageServerLoad } from './$types';

/** PostgREST tipa relações to-one como array; extrai o objeto único. */
function um<T>(v: T | T[] | null | undefined): T | null {
	if (Array.isArray(v)) return v[0] ?? null;
	return v ?? null;
}

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	// Por padrão mostra as pendentes; aceita ?status=todas|pendente|aprovado|alteracao_solicitada
	const status = url.searchParams.get('status') ?? 'pendente';

	let query = supabase
		.from('aprovacoes')
		.select(
			'id, status, data_envio, data_resposta, comentario_cliente, token_publico, conteudo:conteudos(id, titulo, tipo, cliente:clientes(nome))'
		)
		.order('data_envio', { ascending: false });

	if (status && status !== 'todas') query = query.eq('status', status);

	const { data, error } = await query;

	type Cliente = { nome: string } | { nome: string }[] | null;
	const aprovacoes = (data ?? []).map((a) => {
		const c = um<{ id: string; titulo: string | null; tipo: string; cliente: Cliente }>(a.conteudo);
		return {
			id: a.id as string,
			status: a.status as string,
			data_envio: a.data_envio as string | null,
			data_resposta: a.data_resposta as string | null,
			comentario_cliente: a.comentario_cliente as string | null,
			token_publico: a.token_publico as string,
			conteudo_id: c?.id ?? null,
			conteudo_titulo: c?.titulo ?? null,
			conteudo_tipo: c?.tipo ?? null,
			cliente_nome: um<{ nome: string }>(c?.cliente)?.nome ?? null
		};
	});

	return { aprovacoes, status, loadError: error?.message ?? null };
};
