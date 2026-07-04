-- ============================================================
-- Dunamis Space — CRM: Metas mensais por vendedor
-- Meta de faturamento (ganhos) por colaborador e mês, para o ranking
-- e as barras de progresso do CRM Master.
--
-- Idempotente: pode ser re-aplicada com segurança.
-- Rodar:  PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0007_crm_metas.sql
-- (ou colar no SQL Editor do Supabase)
--
-- Observação: motivo_perda (crm_negocios) e origem (crm_contatos) já existem
-- desde 0005 — as features de "motivos de perda" e "origem dos leads" não
-- precisam de novas colunas.
-- ============================================================

create table if not exists public.crm_metas (
	id uuid primary key default gen_random_uuid(),
	colaborador_id uuid not null references public.colaboradores (id) on delete cascade,
	ano int not null,
	mes int not null check (mes between 1 and 12),
	valor_meta numeric(12, 2) not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (colaborador_id, ano, mes)
);
create index if not exists crm_metas_periodo_idx on public.crm_metas (ano, mes);

-- Trigger de updated_at (a função set_updated_at() vem de 0001)
drop trigger if exists trg_crm_metas_updated on public.crm_metas;
create trigger trg_crm_metas_updated before update on public.crm_metas
	for each row execute function public.set_updated_at();

-- RLS — single-tenant interno: autenticados têm acesso total
alter table public.crm_metas enable row level security;
drop policy if exists crm_metas_authenticated_all on public.crm_metas;
create policy crm_metas_authenticated_all on public.crm_metas
	for all to authenticated using (true) with check (true);
