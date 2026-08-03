-- ============================================================
-- Dunamis Space — Central SOS: só dois status
-- O chamado passa a ser apenas 'aberto' ou 'resolvido'. Os que estavam em
-- 'em_andamento' voltam para 'aberto' (ainda pedem ação).
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0043_sos_sem_em_andamento.sql
-- ============================================================

update public.sos_chamados set status = 'aberto' where status = 'em_andamento';

alter table public.sos_chamados drop constraint if exists sos_chamados_status_check;
alter table public.sos_chamados
	add constraint sos_chamados_status_check check (status in ('aberto', 'resolvido'));
