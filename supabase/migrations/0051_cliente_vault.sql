-- ============================================================
-- Vault do cliente — acessos (login/senha) guardados na área de cada cliente.
--
-- Por que uma tabela nova e não adm_acessos: aquela alimenta a tela
-- Ferramentas & Contas, que é uma visão geral da agência. O cofre de um cliente
-- não deve vazar para lá — fica só dentro da área do cliente.
--
-- A senha é gravada em texto (decisão de produto): a proteção é a permissão do
-- módulo 'vault' + estas policies. Módulo NOVO e sem seed em permissoes_cargo,
-- então nasce 'nenhum' para todos os cargos; só CEO/Admin (super-admin, ver
-- 0034) enxergam, até que alguém libere na tela de Permissões.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='<senha-postgres>' node scripts/run_migration.mjs supabase/migrations/0051_cliente_vault.sql
-- ============================================================

create table if not exists public.cliente_vault (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.clientes (id) on delete cascade,
	-- Nome do acesso: "Instagram", "Meta Business", "Google Ads"…
	titulo text not null,
	categoria text,
	url text,
	login text,
	senha text,
	-- Espaço livre para 2FA, e-mail de recuperação, perguntas de segurança…
	observacoes text,
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	-- Ordem manual dentro do cliente (o mais usado primeiro).
	posicao integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- A tela sempre lista por cliente, na ordem manual.
create index if not exists idx_cliente_vault_cliente
	on public.cliente_vault (cliente_id, posicao, titulo);

drop trigger if exists set_cliente_vault_updated_at on public.cliente_vault;
create trigger set_cliente_vault_updated_at
	before update on public.cliente_vault
	for each row execute function public.set_updated_at();

-- ---------- RLS por módulo (mesmo padrão da 0036) ----------
do $$
declare pol record;
begin
	for pol in
		select policyname from pg_policies
		where schemaname = 'public' and tablename = 'cliente_vault'
	loop
		execute format('drop policy %I on public.cliente_vault', pol.policyname);
	end loop;
end $$;

alter table public.cliente_vault enable row level security;

create policy cliente_vault_perm_sel on public.cliente_vault
	for select to authenticated using ((select public.tem_permissao('vault', 'ver')));

create policy cliente_vault_perm_ins on public.cliente_vault
	for insert to authenticated with check ((select public.tem_permissao('vault', 'editar')));

create policy cliente_vault_perm_upd on public.cliente_vault
	for update to authenticated
	using ((select public.tem_permissao('vault', 'editar')))
	with check ((select public.tem_permissao('vault', 'editar')));

create policy cliente_vault_perm_del on public.cliente_vault
	for delete to authenticated using ((select public.tem_permissao('vault', 'excluir')));

comment on table public.cliente_vault is
	'Acessos (login/senha) por cliente, exibidos só na área do cliente. Governado pelo módulo de permissão vault.';
