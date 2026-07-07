-- ============================================================
-- 0032: Organyze — responsáveis compartilhados
--
-- Uma tarefa pertence ao criador (`colaborador_id`) e pode ser compartilhada
-- com outros colaboradores em `responsaveis` (array de uuid). A tarefa aparece
-- no quadro do dono E de cada responsável.
--
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

alter table public.organyze_tarefas
	add column if not exists responsaveis uuid[] not null default '{}'::uuid[];

-- Índice GIN acelera o filtro "sou responsável" (responsaveis @> {uuid}).
create index if not exists organyze_tarefas_responsaveis_idx
	on public.organyze_tarefas using gin (responsaveis);

comment on column public.organyze_tarefas.responsaveis is
	'Colaboradores com quem a tarefa é compartilhada (além do dono colaborador_id).';
