-- ============================================================
-- 0030: Organyze — Metas do Mês (por colaborador)
--
-- Metas mensais por colaborador. Cada meta tem um alvo numérico e um valor atual
-- (progresso). Quadro de equipe compartilhado: RLS liberada para autenticados
-- (mesmo modelo das tarefas; o perfil é escolhido na tela).
--
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

create table if not exists public.organyze_metas (
	id uuid primary key default gen_random_uuid(),
	colaborador_id uuid references public.colaboradores (id) on delete cascade,
	user_id uuid default auth.uid(),
	mes text not null, -- 'yyyy-mm'
	titulo text not null,
	alvo integer not null default 1,
	atual integer not null default 0,
	unidade text not null default '',
	posicao integer not null default 0,
	criada_em timestamptz not null default now()
);

comment on table public.organyze_metas is
	'Organyze (DTools): metas mensais por colaborador. alvo/atual = progresso.';

create index if not exists organyze_metas_colab_mes_idx
	on public.organyze_metas (colaborador_id, mes, posicao);

alter table public.organyze_metas enable row level security;

drop policy if exists organyze_metas_select on public.organyze_metas;
create policy organyze_metas_select on public.organyze_metas
	for select to authenticated using (true);

drop policy if exists organyze_metas_insert on public.organyze_metas;
create policy organyze_metas_insert on public.organyze_metas
	for insert to authenticated with check (true);

drop policy if exists organyze_metas_update on public.organyze_metas;
create policy organyze_metas_update on public.organyze_metas
	for update to authenticated using (true) with check (true);

drop policy if exists organyze_metas_delete on public.organyze_metas;
create policy organyze_metas_delete on public.organyze_metas
	for delete to authenticated using (true);
