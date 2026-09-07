-- ============================================================
-- Status "Suspenso" — o projeto que está parado.
--
-- Faltava o estado mais comum de um projeto próprio: aquele que ficou pelo
-- caminho. Sem ele, um projeto parado tinha de mentir que está "em construção"
-- (e some entre os que realmente andam) ou "em produção" (pior ainda).
--
-- A ordem do enum é a que o Bruno pediu — Suspenso, Em construção, Em produção
-- — e ela vale além do <select>: `order by status` no Postgres segue a ordem de
-- declaração do enum, não a alfabética.
--
-- Por que recriar o tipo em vez de `alter type ... add value`: o ADD VALUE não
-- roda dentro de bloco de transação, e o run_migration.mjs manda o arquivo
-- inteiro numa query só (que o Postgres embrulha em transação implícita).
-- Recriar também é o que garante a POSIÇÃO do novo valor. Mesmo caminho da 0065.
--
-- Idempotente, e preserva o status de quem já existe. Rodar no SQL Editor ou:
--   PGPASSWORD='<senha-postgres>' node scripts/run_migration.mjs supabase/migrations/0067_projeto_status_suspenso.sql
-- ============================================================

do $$
begin
	if not exists (
		select 1 from pg_type t
		join pg_enum e on e.enumtypid = t.oid
		where t.typname = 'projeto_status' and e.enumlabel = 'suspenso'
	) then
		-- O default sai antes: um default do tipo velho impede a troca do tipo.
		alter table public.projetos alter column status drop default;
		alter table public.projetos alter column status type text using status::text;

		drop type if exists projeto_status;
		create type projeto_status as enum ('suspenso', 'em_construcao', 'em_producao');

		-- Ninguém muda de estado aqui: quem estava em construção continua em
		-- construção. O `case` só reafirma os valores conhecidos.
		alter table public.projetos
			alter column status type projeto_status
			using (
				case status
					when 'em_producao' then 'em_producao'
					when 'suspenso' then 'suspenso'
					else 'em_construcao'
				end
			)::projeto_status;

		alter table public.projetos alter column status set default 'em_construcao';
	end if;
end $$;
