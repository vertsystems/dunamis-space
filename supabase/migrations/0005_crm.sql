-- ============================================================
-- Dunamis Space — CRM Master (funil de vendas)
-- Sistema de gestão de leads, negócios (pipeline kanban),
-- contatos e atividades — inspirado em Pipedrive / Attio / Monday.
--
-- Idempotente: pode ser re-aplicada com segurança.
-- Rodar:  PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0005_crm.sql
-- (ou colar no SQL Editor do Supabase)
-- ============================================================

-- ---------- Enums (idempotentes) ----------
do $$ begin
	create type crm_negocio_status as enum ('aberto', 'ganho', 'perdido');
exception when duplicate_object then null; end $$;

do $$ begin
	create type crm_atividade_tipo as enum ('ligacao', 'reuniao', 'email', 'whatsapp', 'tarefa', 'nota');
exception when duplicate_object then null; end $$;

-- ============================================================
-- Funis (pipelines) e etapas (stages)
-- ============================================================
create table if not exists public.crm_pipelines (
	id uuid primary key default gen_random_uuid(),
	nome text not null,
	ordem int not null default 0,
	ativo boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.crm_stages (
	id uuid primary key default gen_random_uuid(),
	pipeline_id uuid not null references public.crm_pipelines (id) on delete cascade,
	nome text not null,
	ordem int not null default 0,
	cor text not null default 'neutral',        -- token de tom: neutral|info|brand|warning|success|danger
	probabilidade int not null default 0 check (probabilidade between 0 and 100),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists crm_stages_pipeline_idx on public.crm_stages (pipeline_id, ordem);

-- ============================================================
-- Contatos (leads: pessoa / empresa)
-- ============================================================
create table if not exists public.crm_contatos (
	id uuid primary key default gen_random_uuid(),
	nome text not null,
	empresa text,
	cargo text,
	email text,
	telefone text,
	whatsapp text,
	origem text,                                 -- Indicação, Instagram, Site, WhatsApp, Google, Evento, Outbound, Outro
	segmento text,
	tags text[] not null default '{}',
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	cliente_id uuid references public.clientes (id) on delete set null,   -- vínculo opcional com cliente existente
	observacoes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists crm_contatos_responsavel_idx on public.crm_contatos (responsavel_id);
create index if not exists crm_contatos_origem_idx on public.crm_contatos (origem);
create index if not exists crm_contatos_cliente_idx on public.crm_contatos (cliente_id);

-- ============================================================
-- Negócios / Oportunidades (objeto central do funil)
-- ============================================================
create table if not exists public.crm_negocios (
	id uuid primary key default gen_random_uuid(),
	titulo text not null,
	contato_id uuid references public.crm_contatos (id) on delete set null,
	pipeline_id uuid not null references public.crm_pipelines (id) on delete cascade,
	stage_id uuid references public.crm_stages (id) on delete set null,
	valor numeric(12, 2) not null default 0,
	status crm_negocio_status not null default 'aberto',
	motivo_perda text,
	previsao_fechamento date,
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	ordem int not null default 0,                -- posição dentro da coluna (stage)
	ganho_em timestamptz,
	perdido_em timestamptz,
	observacoes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists crm_negocios_pipeline_idx on public.crm_negocios (pipeline_id);
create index if not exists crm_negocios_stage_idx on public.crm_negocios (stage_id, ordem);
create index if not exists crm_negocios_status_idx on public.crm_negocios (status);
create index if not exists crm_negocios_responsavel_idx on public.crm_negocios (responsavel_id);
create index if not exists crm_negocios_contato_idx on public.crm_negocios (contato_id);

-- ============================================================
-- Atividades / follow-ups / timeline
--   tipo 'nota' = entrada de timeline (sem vencimento).
-- ============================================================
create table if not exists public.crm_atividades (
	id uuid primary key default gen_random_uuid(),
	negocio_id uuid references public.crm_negocios (id) on delete cascade,
	contato_id uuid references public.crm_contatos (id) on delete cascade,
	tipo crm_atividade_tipo not null default 'tarefa',
	titulo text,
	descricao text,
	data_hora timestamptz,
	concluida boolean not null default false,
	concluida_em timestamptz,
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists crm_atividades_negocio_idx on public.crm_atividades (negocio_id);
create index if not exists crm_atividades_contato_idx on public.crm_atividades (contato_id);
create index if not exists crm_atividades_agenda_idx on public.crm_atividades (concluida, data_hora);

-- ============================================================
-- Triggers de updated_at (a função set_updated_at() vem de 0001)
-- ============================================================
do $$
declare t text;
begin
	foreach t in array array['crm_pipelines', 'crm_stages', 'crm_contatos', 'crm_negocios', 'crm_atividades']
	loop
		execute format('drop trigger if exists trg_%1$s_updated on public.%1$I;', t);
		execute format(
			'create trigger trg_%1$s_updated before update on public.%1$I for each row execute function public.set_updated_at();',
			t
		);
	end loop;
end $$;

-- ============================================================
-- RLS — single-tenant interno: autenticados têm acesso total
-- ============================================================
do $$
declare t text;
begin
	foreach t in array array['crm_pipelines', 'crm_stages', 'crm_contatos', 'crm_negocios', 'crm_atividades']
	loop
		execute format('alter table public.%I enable row level security;', t);
		execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
		execute format(
			'create policy %I on public.%I for all to authenticated using (true) with check (true);',
			t || '_authenticated_all', t
		);
	end loop;
end $$;

-- ============================================================
-- Seed idempotente: funil padrão + etapas
-- ============================================================
do $$
declare pid uuid;
begin
	select id into pid from public.crm_pipelines order by ordem, created_at limit 1;
	if pid is null then
		insert into public.crm_pipelines (nome, ordem) values ('Funil de Vendas', 0) returning id into pid;
	end if;

	if not exists (select 1 from public.crm_stages where pipeline_id = pid) then
		insert into public.crm_stages (pipeline_id, nome, ordem, cor, probabilidade) values
			(pid, 'Novo Lead',        0, 'neutral', 10),
			(pid, 'Qualificação',     1, 'info',    25),
			(pid, 'Proposta Enviada', 2, 'warning', 50),
			(pid, 'Negociação',       3, 'brand',   75);
	end if;
end $$;
