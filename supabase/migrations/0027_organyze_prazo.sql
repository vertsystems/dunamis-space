-- ============================================================
-- 0027: Organyze — prazo de entrega + remoção de etiquetas
--
-- - Adiciona `prazo` (data de entrega). A UI ordena as tarefas em execução por
--   urgência (prazo mais próximo primeiro; sem prazo por último).
-- - Remove `etiquetas` (recurso descartado).
-- - O rollover (tarefas não concluídas caem para o dia seguinte) é feito no app
--   (db.rolarPendentesParaHoje): UPDATE data = hoje onde data < hoje e não concluída.
--
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

alter table public.organyze_tarefas add column if not exists prazo date;

alter table public.organyze_tarefas drop column if exists etiquetas;

comment on column public.organyze_tarefas.prazo is
	'Prazo de entrega da tarefa (opcional). App ordena as em execução por urgência.';
