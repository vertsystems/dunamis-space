-- ============================================================
-- 0031: Organyze — Habit Tracker (por colaborador)
--
-- Um card por hábito (Bíblia, Leitura, Treinos, Água...). Cada hábito guarda as
-- marcações do mês num JSON `dias`: { "1": "feito", "5": "falhou", ... }.
-- Quadro de equipe compartilhado: RLS liberada para autenticados.
--
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

create table if not exists public.organyze_habitos (
	id uuid primary key default gen_random_uuid(),
	colaborador_id uuid references public.colaboradores (id) on delete cascade,
	user_id uuid default auth.uid(),
	mes text not null, -- 'yyyy-mm'
	nome text not null,
	dias jsonb not null default '{}'::jsonb, -- { "1": "feito" | "falhou" }
	posicao integer not null default 0,
	criada_em timestamptz not null default now()
);

comment on table public.organyze_habitos is
	'Organyze (DTools): hábitos do mês por colaborador. dias = marcações por dia.';

create index if not exists organyze_habitos_colab_mes_idx
	on public.organyze_habitos (colaborador_id, mes, posicao);

alter table public.organyze_habitos enable row level security;

drop policy if exists organyze_habitos_select on public.organyze_habitos;
create policy organyze_habitos_select on public.organyze_habitos
	for select to authenticated using (true);

drop policy if exists organyze_habitos_insert on public.organyze_habitos;
create policy organyze_habitos_insert on public.organyze_habitos
	for insert to authenticated with check (true);

drop policy if exists organyze_habitos_update on public.organyze_habitos;
create policy organyze_habitos_update on public.organyze_habitos
	for update to authenticated using (true) with check (true);

drop policy if exists organyze_habitos_delete on public.organyze_habitos;
create policy organyze_habitos_delete on public.organyze_habitos
	for delete to authenticated using (true);
