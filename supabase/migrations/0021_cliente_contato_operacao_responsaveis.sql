-- Cliente: contato de Operação (nome/email/whatsapp) e múltiplos responsáveis.
-- Idempotente. A coluna responsavel_id (single) é mantida = primeiro do array,
-- para compatibilidade com todas as telas/consultas existentes.

alter table public.clientes add column if not exists contato_operacao text;
alter table public.clientes add column if not exists contato_operacao_email text;
alter table public.clientes add column if not exists contato_operacao_whatsapp text;

alter table public.clientes add column if not exists responsaveis_ids uuid[] not null default '{}';

-- Backfill: quem já tinha um responsável entra no array.
update public.clientes
	set responsaveis_ids = array[responsavel_id]
	where responsavel_id is not null
		and coalesce(array_length(responsaveis_ids, 1), 0) = 0;
