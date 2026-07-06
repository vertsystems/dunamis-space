-- ============================================================
-- 0029: Organyze — descrição (rich text) + subtarefas
--
-- - `descricao`: HTML enxuto do editor (negrito/itálico/sublinhado/lista).
-- - `subtarefas`: lista JSON de { id, titulo, feita } dentro da tarefa principal.
--
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

alter table public.organyze_tarefas
	add column if not exists descricao text not null default '';

alter table public.organyze_tarefas
	add column if not exists subtarefas jsonb not null default '[]'::jsonb;

comment on column public.organyze_tarefas.descricao is
	'Descrição em HTML enxuto (editor leve: negrito/itálico/sublinhado/lista).';
comment on column public.organyze_tarefas.subtarefas is
	'Subtarefas: array JSON de { id, titulo, feita }.';
