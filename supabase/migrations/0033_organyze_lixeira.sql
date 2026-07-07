-- ============================================================
-- 0033: Organyze — Lixeira (soft delete de tarefas)
--
-- Excluir uma tarefa passa a marcá-la com `deleted_at` (soft delete) em vez de
-- apagar a linha. Assim é possível desfazer a exclusão e manter uma Lixeira onde
-- a tarefa pode ser restaurada ou removida em definitivo.
--
-- As consultas do quadro filtram por `deleted_at is null`; a Lixeira busca o
-- inverso. A exclusão definitiva continua sendo um DELETE real da linha.
--
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

alter table public.organyze_tarefas
	add column if not exists deleted_at timestamptz;

comment on column public.organyze_tarefas.deleted_at is
	'Quando preenchido, a tarefa está na Lixeira (soft delete). null = ativa.';

-- Índice parcial: acelera o filtro padrão (tarefas ativas) sem inchar com lixo.
create index if not exists organyze_tarefas_ativas_idx
	on public.organyze_tarefas (colaborador_id, data, posicao)
	where deleted_at is null;
