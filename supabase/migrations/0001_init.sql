-- ============================================================
-- Dunamis Space — schema inicial (single-tenant)
-- SvelteKit + Supabase. Rode via `supabase db push` ou cole no SQL Editor.
-- ============================================================

-- ---------- Enums ----------
create type colaborador_funcao as enum ('admin', 'gestor', 'social_media', 'designer', 'trafego');
create type cliente_status     as enum ('lead', 'ativo', 'pausado', 'cancelado');
create type interacao_tipo     as enum ('reuniao', 'ligacao', 'email', 'whatsapp', 'nota');
create type contrato_status    as enum ('ativo', 'suspenso', 'encerrado');
create type projeto_tipo       as enum ('social_media', 'design', 'trafego', 'impresso', 'site', 'outro');
create type projeto_status     as enum ('em_andamento', 'aguardando_cliente', 'em_aprovacao', 'finalizado');
create type tarefa_status      as enum ('backlog', 'fazendo', 'em_aprovacao', 'concluido');
create type prioridade         as enum ('baixa', 'media', 'alta');
create type conteudo_tipo      as enum ('feed', 'reels', 'carrossel', 'story');
create type conteudo_status    as enum ('rascunho', 'em_aprovacao', 'aprovado', 'programado', 'publicado');
create type aprovacao_status   as enum ('pendente', 'aprovado', 'alteracao_solicitada');
create type material_tipo      as enum ('feed', 'story', 'faixa', 'jornal');
create type transacao_tipo     as enum ('receita', 'despesa');
create type transacao_status   as enum ('previsto', 'pago', 'atrasado');
create type comentario_entidade as enum ('projeto', 'tarefa', 'conteudo', 'cliente');

-- ---------- Função de updated_at ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
	new.updated_at = now();
	return new;
end;
$$ language plpgsql;

-- ============================================================
-- Identidade & Equipe
-- ============================================================
create table public.colaboradores (
	id uuid primary key default gen_random_uuid(),
	auth_user_id uuid references auth.users (id) on delete set null,
	nome text not null,
	email text unique not null,
	funcao colaborador_funcao not null default 'social_media',
	custo_hora numeric(12, 2),
	ativo boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ============================================================
-- Clientes (CRM)
-- ============================================================
create table public.clientes (
	id uuid primary key default gen_random_uuid(),
	nome text not null,
	razao_social text,
	cnpj_cpf text,
	contato_nome text,
	contato_email text,
	contato_whatsapp text,
	status cliente_status not null default 'lead',
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	segmento text,
	data_inicio date,
	mrr numeric(12, 2) default 0,
	observacoes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index idx_clientes_status on public.clientes (status);
create index idx_clientes_responsavel on public.clientes (responsavel_id);

create table public.cliente_interacoes (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.clientes (id) on delete cascade,
	colaborador_id uuid references public.colaboradores (id) on delete set null,
	tipo interacao_tipo not null default 'nota',
	descricao text,
	data timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index idx_interacoes_cliente on public.cliente_interacoes (cliente_id);

-- ============================================================
-- Contratos & Planos
-- ============================================================
create table public.planos (
	id uuid primary key default gen_random_uuid(),
	nome text not null,
	descricao text,
	valor_mensal numeric(12, 2) not null default 0,
	limite_posts int,
	limite_stories int,
	limite_reels int,
	escopo jsonb,
	ativo boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.contratos (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.clientes (id) on delete cascade,
	plano_id uuid references public.planos (id) on delete set null,
	valor_mensal numeric(12, 2) not null default 0,
	data_inicio date,
	data_fim date,
	status contrato_status not null default 'ativo',
	renovacao_automatica boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index idx_contratos_cliente on public.contratos (cliente_id);
create index idx_contratos_status on public.contratos (status);

-- ============================================================
-- Projetos / Jobs
-- ============================================================
create table public.projeto_templates (
	id uuid primary key default gen_random_uuid(),
	nome text not null,
	tipo projeto_tipo not null default 'social_media',
	checklist jsonb,
	tarefas_padrao jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.projetos (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.clientes (id) on delete cascade,
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	template_id uuid references public.projeto_templates (id) on delete set null,
	nome text not null,
	descricao text,
	tipo projeto_tipo not null default 'social_media',
	status projeto_status not null default 'em_andamento',
	recorrente boolean not null default false,
	valor numeric(12, 2),
	data_inicio date,
	prazo date,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index idx_projetos_cliente on public.projetos (cliente_id);
create index idx_projetos_status on public.projetos (status);

-- ============================================================
-- Tarefas
-- ============================================================
create table public.tarefas (
	id uuid primary key default gen_random_uuid(),
	projeto_id uuid references public.projetos (id) on delete cascade,
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	titulo text not null,
	descricao text,
	status tarefa_status not null default 'backlog',
	prioridade prioridade not null default 'media',
	prazo date,
	ordem int not null default 0,
	tempo_estimado numeric(8, 2),
	tempo_gasto numeric(8, 2),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index idx_tarefas_projeto on public.tarefas (projeto_id);
create index idx_tarefas_status on public.tarefas (status);
create index idx_tarefas_responsavel on public.tarefas (responsavel_id);

create table public.tarefa_checklist (
	id uuid primary key default gen_random_uuid(),
	tarefa_id uuid not null references public.tarefas (id) on delete cascade,
	item text not null,
	concluido boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ============================================================
-- Conteúdo (planejamento editorial)
-- ============================================================
create table public.conteudos (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.clientes (id) on delete cascade,
	projeto_id uuid references public.projetos (id) on delete set null,
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	tipo conteudo_tipo not null default 'feed',
	titulo text,
	legenda text,
	arte_url text,
	data_publicacao timestamptz,
	status conteudo_status not null default 'rascunho',
	publicado_manual boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index idx_conteudos_cliente on public.conteudos (cliente_id);
create index idx_conteudos_data on public.conteudos (data_publicacao);
create index idx_conteudos_status on public.conteudos (status);

-- ============================================================
-- Aprovação de Cliente (Fase 2)
-- ============================================================
create table public.aprovacoes (
	id uuid primary key default gen_random_uuid(),
	conteudo_id uuid not null references public.conteudos (id) on delete cascade,
	status aprovacao_status not null default 'pendente',
	comentario_cliente text,
	token_publico uuid not null default gen_random_uuid(),
	data_envio timestamptz not null default now(),
	data_resposta timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index idx_aprovacoes_conteudo on public.aprovacoes (conteudo_id);

-- ============================================================
-- Campanhas (jornal / promoções) (Fase 2)
-- ============================================================
create table public.campanhas (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.clientes (id) on delete cascade,
	nome text not null,
	descricao text,
	data_inicio date,
	data_fim date,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.campanha_produtos (
	id uuid primary key default gen_random_uuid(),
	campanha_id uuid not null references public.campanhas (id) on delete cascade,
	ref text,
	nome text not null,
	preco numeric(12, 2),
	preco_promocional numeric(12, 2),
	limite int,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.campanha_materiais (
	id uuid primary key default gen_random_uuid(),
	campanha_id uuid not null references public.campanhas (id) on delete cascade,
	conteudo_id uuid references public.conteudos (id) on delete set null,
	tipo material_tipo not null default 'feed',
	arquivo_url text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ============================================================
-- Financeiro
-- ============================================================
create table public.transacoes (
	id uuid primary key default gen_random_uuid(),
	tipo transacao_tipo not null,
	categoria text,
	descricao text,
	valor numeric(12, 2) not null default 0,
	cliente_id uuid references public.clientes (id) on delete set null,
	contrato_id uuid references public.contratos (id) on delete set null,
	recorrente boolean not null default false,
	data_competencia date not null default current_date,
	data_pagamento date,
	status transacao_status not null default 'previsto',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index idx_transacoes_tipo on public.transacoes (tipo);
create index idx_transacoes_cliente on public.transacoes (cliente_id);
create index idx_transacoes_competencia on public.transacoes (data_competencia);

-- ============================================================
-- Base de Conhecimento (Fase 2)
-- ============================================================
create table public.kb_artigos (
	id uuid primary key default gen_random_uuid(),
	titulo text not null,
	categoria text,
	conteudo text,
	tags text[],
	cliente_id uuid references public.clientes (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ============================================================
-- Colaboração & Alertas
-- ============================================================
create table public.comentarios (
	id uuid primary key default gen_random_uuid(),
	entidade_tipo comentario_entidade not null,
	entidade_id uuid not null,
	colaborador_id uuid references public.colaboradores (id) on delete set null,
	texto text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index idx_comentarios_entidade on public.comentarios (entidade_tipo, entidade_id);

create table public.notificacoes (
	id uuid primary key default gen_random_uuid(),
	colaborador_id uuid references public.colaboradores (id) on delete cascade,
	tipo text,
	mensagem text not null,
	link text,
	lida boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ============================================================
-- View: lucro por cliente (receitas - despesas alocadas)
-- ============================================================
create or replace view public.v_lucro_cliente as
select
	c.id as cliente_id,
	c.nome,
	coalesce(sum(t.valor) filter (where t.tipo = 'receita'), 0) as receitas,
	coalesce(sum(t.valor) filter (where t.tipo = 'despesa'), 0) as despesas,
	coalesce(sum(t.valor) filter (where t.tipo = 'receita'), 0)
		- coalesce(sum(t.valor) filter (where t.tipo = 'despesa'), 0) as lucro
from public.clientes c
left join public.transacoes t on t.cliente_id = c.id
group by c.id, c.nome;

-- ============================================================
-- Triggers de updated_at + RLS (todos autenticados têm acesso)
-- ============================================================
do $$
declare t text;
begin
	for t in
		select tablename from pg_tables where schemaname = 'public'
	loop
		execute format(
			'create trigger trg_%1$s_updated before update on public.%1$I for each row execute function public.set_updated_at();',
			t
		);
		execute format('alter table public.%I enable row level security;', t);
		execute format(
			'create policy "auth_all" on public.%I for all to authenticated using (true) with check (true);',
			t
		);
	end loop;
end $$;
