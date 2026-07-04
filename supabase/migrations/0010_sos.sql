-- ============================================================
-- Dunamis Space — Central SOS
-- Chamados rápidos de problema abertos pelo botão SOS (canto inferior direito),
-- disponível em todas as telas. Listados em Administrativo → Central SOS.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0010_sos.sql
-- ============================================================

create table if not exists public.sos_chamados (
	id uuid primary key default gen_random_uuid(),
	titulo text not null,
	descricao text,
	autor_nome text,
	autor_email text,
	rota text,                 -- rota onde o problema foi relatado (contexto)
	status text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'resolvido')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists sos_chamados_status_idx on public.sos_chamados (status);
create index if not exists sos_chamados_created_idx on public.sos_chamados (created_at desc);

-- updated_at automático (função criada em 0001_init)
drop trigger if exists set_sos_chamados_updated_at on public.sos_chamados;
create trigger set_sos_chamados_updated_at
	before update on public.sos_chamados
	for each row execute function public.set_updated_at();

-- RLS: single-tenant (qualquer autenticado), igual ao restante do schema.
alter table public.sos_chamados enable row level security;
drop policy if exists "auth_all" on public.sos_chamados;
create policy "auth_all" on public.sos_chamados
	for all to authenticated using (true) with check (true);
