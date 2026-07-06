-- ============================================================
-- 0025: Organyze — lista de tarefas do dia (por usuário)
-- Cada tarefa pertence a um usuário (user_id) e a um dia (data).
-- RLS: o usuário só enxerga/edita as próprias tarefas.
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

create table if not exists public.organyze_tarefas (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	titulo text not null,
	concluida boolean not null default false,
	data date not null default current_date,
	posicao integer not null default 0,
	criada_em timestamptz not null default now()
);

comment on table public.organyze_tarefas is
	'Organyze (DTools): tarefas do dia por usuário. Uma linha por tarefa.';

-- Índice para o filtro principal (tarefas de um usuário num dia).
create index if not exists organyze_tarefas_user_data_idx
	on public.organyze_tarefas (user_id, data, posicao);

alter table public.organyze_tarefas enable row level security;

-- Políticas: cada usuário acessa apenas as próprias linhas.
drop policy if exists organyze_tarefas_select on public.organyze_tarefas;
create policy organyze_tarefas_select on public.organyze_tarefas
	for select to authenticated using (user_id = auth.uid());

drop policy if exists organyze_tarefas_insert on public.organyze_tarefas;
create policy organyze_tarefas_insert on public.organyze_tarefas
	for insert to authenticated with check (user_id = auth.uid());

drop policy if exists organyze_tarefas_update on public.organyze_tarefas;
create policy organyze_tarefas_update on public.organyze_tarefas
	for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists organyze_tarefas_delete on public.organyze_tarefas;
create policy organyze_tarefas_delete on public.organyze_tarefas
	for delete to authenticated using (user_id = auth.uid());
