-- ============================================================
-- Organyze — hora da tarefa
--
-- Agendar já dizia em que DIA a tarefa cai no quadro (migration anterior no
-- código, 0056 do cadastro); faltava a que HORAS. Reunião das 14h e "responder
-- e-mails" não são a mesma coisa dentro do dia.
--
-- Nulo = tarefa do dia sem horário marcado, que é o caso da maioria — por isso
-- a coluna é opcional em vez de ter um default.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0057_organyze_tarefa_hora.sql
-- ============================================================

alter table public.organyze_tarefas
	add column if not exists hora time;

comment on column public.organyze_tarefas.hora is
	'Horário da tarefa no dia (HH:MM). Nulo = sem hora marcada.';

notify pgrst, 'reload schema';
