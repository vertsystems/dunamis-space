-- 0004_processos.sql — Cronograma de Processos (acompanhamento por etapas)
-- Cada processo passa por etapas fixas (DFD → ETP → Termo de Referência →
-- Cotação → Contabilidade → Controle Interno → Licitação). O status de cada
-- etapa fica num mapa jsonb `etapas` (etapa → 'pendente'|'em_andamento'|'concluido'|'atrasado').

create table if not exists public.processos (
	id uuid primary key default gen_random_uuid(),
	numero text,
	nome text not null,
	secretaria text,
	responsavel text,
	prazo date,
	situacao text not null default 'ativo' check (situacao in ('ativo', 'atrasado', 'devolvido', 'concluido')),
	etapas jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists processos_situacao_idx on public.processos (situacao, prazo);

alter table public.processos enable row level security;

-- Single-tenant interno: usuários autenticados têm acesso total.
drop policy if exists processos_authenticated_all on public.processos;
create policy processos_authenticated_all on public.processos
	for all to authenticated using (true) with check (true);
