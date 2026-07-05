-- Remapeia conteúdos existentes para o novo vocabulário de status e atualiza o
-- fluxo de aprovação pública. Depende de 0012 (valores já committed). Idempotente.

-- Novo default da coluna (antes 'rascunho', que sai do vocabulário).
alter table public.conteudos alter column status set default 'ideia';

-- Status antigos sem equivalente direto → novo vocabulário.
update public.conteudos set status = 'ideia'            where status = 'rascunho';
update public.conteudos set status = 'aprovar_conteudo' where status = 'em_aprovacao';
update public.conteudos set status = 'programar'         where status = 'aprovado';
-- 'programado' e 'publicado' permanecem inalterados.

-- Resposta do cliente no link público passa a refletir o novo vocabulário:
--   aprovado        → 'programar'        (pronto para ser programado)
--   pediu alteração → 'aprovar_conteudo' (volta ao estágio de aprovação)
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
			when p_status = 'aprovado' then 'programar'::conteudo_status
			else 'aprovar_conteudo'::conteudo_status
		end
		from public.aprovacoes a
		where a.conteudo_id = c.id and a.token_publico = p_token;
end;
$$;

grant execute on function public.responder_aprovacao(uuid, text, text) to anon, authenticated;
