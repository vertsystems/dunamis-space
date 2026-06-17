-- ============================================================
-- Aprovação de cliente — acesso público por token
-- Funções security definer (rodam como owner, ignoram RLS) e
-- liberadas para o papel anônimo, para o portal externo /aprovar/[token].
-- ============================================================

-- Busca os dados de uma aprovação + conteúdo pelo token público.
create or replace function public.aprovacao_por_token(p_token uuid)
returns table (
	aprovacao_id uuid,
	status text,
	comentario_cliente text,
	data_resposta timestamptz,
	titulo text,
	legenda text,
	arte_url text,
	tipo text,
	data_publicacao timestamptz,
	cliente_nome text
)
language sql
security definer
set search_path = public
as $$
	select
		a.id,
		a.status::text,
		a.comentario_cliente,
		a.data_resposta,
		c.titulo,
		c.legenda,
		c.arte_url,
		c.tipo::text,
		c.data_publicacao,
		cl.nome
	from public.aprovacoes a
	join public.conteudos c on c.id = a.conteudo_id
	left join public.clientes cl on cl.id = c.cliente_id
	where a.token_publico = p_token;
$$;

-- Registra a resposta do cliente (aprovar / pedir alteração) e reflete no conteúdo.
create or replace function public.responder_aprovacao(
	p_token uuid,
	p_status text,
	p_comentario text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.aprovacoes
		set status = p_status::aprovacao_status,
			comentario_cliente = p_comentario,
			data_resposta = now()
		where token_publico = p_token;

	update public.conteudos c
		set status = case
			when p_status = 'aprovado' then 'aprovado'::conteudo_status
			else 'em_aprovacao'::conteudo_status
		end
		from public.aprovacoes a
		where a.conteudo_id = c.id and a.token_publico = p_token;
end;
$$;

grant execute on function public.aprovacao_por_token(uuid) to anon, authenticated;
grant execute on function public.responder_aprovacao(uuid, text, text) to anon, authenticated;
