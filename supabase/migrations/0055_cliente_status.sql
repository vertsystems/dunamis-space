-- ============================================================
-- Clientes — novos status: Ativo, Stand-by, Pausado, Inativo
--
-- Sai 'lead': prospecção mora no Comercial/CRM, não no cadastro de clientes —
-- quem está aqui já é cliente. Sai 'cancelado', que virou 'inativo' (mesma
-- ideia, sem o tom de ruptura). Entra 'standby', o cliente que existe mas está
-- esperando para começar.
--
-- Como enum não permite remover rótulo, o tipo é recriado. O índice
-- idx_clientes_status é reconstruído sozinho pelo ALTER COLUMN TYPE, e nenhuma
-- view, policy ou função depende do tipo (conferido no banco antes).
--
-- Idempotente: o bloco só roda enquanto 'lead' ainda existir no enum.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0055_cliente_status.sql
-- ============================================================

do $$
begin
	if not exists (
		select 1
		from pg_enum e
		join pg_type t on t.oid = e.enumtypid
		where t.typname = 'cliente_status' and e.enumlabel = 'lead'
	) then
		return;
	end if;

	create type public.cliente_status_novo as enum ('ativo', 'standby', 'pausado', 'inativo');

	-- O default é 'lead' e precisa sair antes da troca de tipo.
	alter table public.clientes alter column status drop default;

	alter table public.clientes
		alter column status type public.cliente_status_novo
		using (
			case status::text
				when 'lead' then 'standby'
				when 'cancelado' then 'inativo'
				else status::text
			end
		)::public.cliente_status_novo;

	-- Cliente novo entra ativo: o cadastro é de quem já fechou.
	alter table public.clientes alter column status set default 'ativo';

	drop type public.cliente_status;
	alter type public.cliente_status_novo rename to cliente_status;
end $$;

comment on column public.clientes.status is
	'Situação do cliente: ativo, standby (vai começar), pausado, inativo.';

-- Sem isto o PostgREST segue anunciando os rótulos antigos.
notify pgrst, 'reload schema';
