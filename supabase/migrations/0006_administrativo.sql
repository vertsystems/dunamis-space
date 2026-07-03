-- ============================================================
-- Dunamis Space — Administrativo
-- Enriquece o cadastro de clientes (ficha + referência financeira,
-- sem gestão financeira aqui) e cria os módulos:
--   Ferramentas & Contas, Fornecedores/Freelancers, Onboarding.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0006_administrativo.sql
-- ============================================================

-- ---------- Ficha cadastral / referência no cliente ----------
alter table public.clientes add column if not exists endereco text;
alter table public.clientes add column if not exists cidade text;
alter table public.clientes add column if not exists estado text;
alter table public.clientes add column if not exists cep text;
alter table public.clientes add column if not exists dia_vencimento int;
alter table public.clientes add column if not exists forma_pagamento text;
alter table public.clientes add column if not exists plano_ref text;
alter table public.clientes add column if not exists contato_financeiro text;

-- ---------- Ferramentas & Assinaturas da agência ----------
create table if not exists public.adm_ferramentas (
	id uuid primary key default gen_random_uuid(),
	nome text not null,
	categoria text,
	url text,
	custo_mensal numeric(12, 2) not null default 0,
	ciclo text not null default 'mensal' check (ciclo in ('mensal', 'anual', 'unico')),
	proxima_renovacao date,
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	ativo boolean not null default true,
	observacoes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ---------- Acessos / Contas (registro — SEM senha em texto puro) ----------
create table if not exists public.adm_acessos (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid references public.clientes (id) on delete set null, -- null = conta da própria agência
	plataforma text not null,
	login text,                                -- usuário/e-mail (NÃO a senha)
	url text,
	local_senha text,                          -- onde a senha está guardada (ex.: 1Password, com o João)
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	observacoes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists adm_acessos_cliente_idx on public.adm_acessos (cliente_id);

-- ---------- Fornecedores / Freelancers ----------
create table if not exists public.adm_fornecedores (
	id uuid primary key default gen_random_uuid(),
	nome text not null,
	tipo text not null default 'freelancer' check (tipo in ('freelancer', 'fornecedor', 'parceiro')),
	especialidade text,
	email text,
	telefone text,
	custo_referencia numeric(12, 2),
	avaliacao int check (avaliacao between 1 and 5),
	ativo boolean not null default true,
	observacoes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ---------- Onboarding de clientes (checklist por cliente) ----------
create table if not exists public.adm_onboarding_itens (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.clientes (id) on delete cascade,
	texto text not null,
	concluido boolean not null default false,
	ordem int not null default 0,
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	concluido_em timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists adm_onboarding_cliente_idx on public.adm_onboarding_itens (cliente_id, ordem);

-- ============================================================
-- Triggers de updated_at + RLS (autenticados têm acesso total)
-- ============================================================
do $$
declare t text;
begin
	foreach t in array array['adm_ferramentas', 'adm_acessos', 'adm_fornecedores', 'adm_onboarding_itens']
	loop
		execute format('drop trigger if exists trg_%1$s_updated on public.%1$I;', t);
		execute format(
			'create trigger trg_%1$s_updated before update on public.%1$I for each row execute function public.set_updated_at();',
			t
		);
		execute format('alter table public.%I enable row level security;', t);
		execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
		execute format(
			'create policy %I on public.%I for all to authenticated using (true) with check (true);',
			t || '_authenticated_all', t
		);
	end loop;
end $$;
