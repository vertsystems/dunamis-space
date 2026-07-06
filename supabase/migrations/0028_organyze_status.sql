-- ============================================================
-- 0028: Organyze — status de 3 estados (não iniciado / em execução / concluída)
--
-- Substitui o booleano `concluida` por um `status` com 3 valores, para o quadro
-- com 3 seções (arrastar entre elas). `concluida` é mantido em sincronia por
-- compatibilidade (concluida = status = 'concluida').
--
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

alter table public.organyze_tarefas
	add column if not exists status text not null default 'em_execucao';

-- Backfill a partir do antigo `concluida`.
update public.organyze_tarefas
	set status = case when concluida then 'concluida' else 'em_execucao' end
	where status is null or status = 'em_execucao';

-- Valida os valores de status.
do $$
begin
	if not exists (
		select 1 from pg_constraint where conname = 'organyze_status_check'
	) then
		alter table public.organyze_tarefas
			add constraint organyze_status_check
			check (status in ('nao_iniciado', 'em_execucao', 'concluida'));
	end if;
end $$;

comment on column public.organyze_tarefas.status is
	'Estado da tarefa: nao_iniciado | em_execucao | concluida (seções do quadro).';
