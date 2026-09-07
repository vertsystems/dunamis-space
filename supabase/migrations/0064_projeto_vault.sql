-- ============================================================
-- Vault do projeto — acessos (login/senha) guardados na área de cada projeto.
--
-- Espelha `cliente_vault` (0051), trocando o dono: lá o cofre é do cliente,
-- aqui é do projeto. Por que tabela separada e não uma coluna `projeto_id` na
-- cliente_vault: o cofre do cliente é a conta permanente da marca (Instagram,
-- Meta Business, domínio) e o do projeto é o acesso efêmero daquele job (FTP da
-- landing, painel do fornecedor, conta de teste). Misturar os dois faria o
-- cofre do cliente inchar com credenciais que morrem junto com o projeto.
--
-- Mesmo módulo de permissão ('vault') do cofre do cliente: quem tem o cofre
-- liberado tem os dois. Continua valendo que ver o projeto NÃO implica ver as
-- senhas dele — o load nem consulta esta tabela sem a permissão.
--
-- A senha é gravada em texto, pela mesma decisão de produto da 0051: quem
-- protege é a permissão do módulo + estas policies.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='<senha-postgres>' node scripts/run_migration.mjs supabase/migrations/0064_projeto_vault.sql
-- ============================================================

create table if not exists public.projeto_vault (
	id uuid primary key default gen_random_uuid(),
	projeto_id uuid not null references public.projetos (id) on delete cascade,
	-- Nome do acesso: "FTP da landing", "Painel do fornecedor", "Figma"…
	titulo text not null,
	categoria text,
	url text,
	login text,
	senha text,
	-- Espaço livre para 2FA, e-mail de recuperação, perguntas de segurança…
	observacoes text,
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	-- Ordem manual dentro do projeto (o mais usado primeiro).
	posicao integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- A tela sempre lista por projeto, na ordem manual.
create index if not exists idx_projeto_vault_projeto
	on public.projeto_vault (projeto_id, posicao, titulo);

-- FK sem índice próprio vira seq scan no delete do colaborador (mesmo motivo da 0062).
create index if not exists idx_projeto_vault_responsavel
	on public.projeto_vault (responsavel_id);

drop trigger if exists set_projeto_vault_updated_at on public.projeto_vault;
create trigger set_projeto_vault_updated_at
	before update on public.projeto_vault
	for each row execute function public.set_updated_at();

-- ---------- RLS por módulo (mesmo padrão da 0036/0051) ----------
do $$
declare pol record;
begin
	for pol in
		select policyname from pg_policies
		where schemaname = 'public' and tablename = 'projeto_vault'
	loop
		execute format('drop policy %I on public.projeto_vault', pol.policyname);
	end loop;
end $$;

alter table public.projeto_vault enable row level security;

create policy projeto_vault_perm_sel on public.projeto_vault
	for select to authenticated using ((select public.tem_permissao('vault', 'ver')));

create policy projeto_vault_perm_ins on public.projeto_vault
	for insert to authenticated with check ((select public.tem_permissao('vault', 'editar')));

create policy projeto_vault_perm_upd on public.projeto_vault
	for update to authenticated
	using ((select public.tem_permissao('vault', 'editar')))
	with check ((select public.tem_permissao('vault', 'editar')));

create policy projeto_vault_perm_del on public.projeto_vault
	for delete to authenticated using ((select public.tem_permissao('vault', 'excluir')));

comment on table public.projeto_vault is
	'Acessos (login/senha) por projeto, exibidos só na área do projeto. Governado pelo módulo de permissão vault, o mesmo do cofre do cliente.';
