-- ============================================================
-- Serviços & Ferramentas do cliente.
--
-- O que resolve: um cliente contrata coisas por fora da agência (Rádio Indoor,
-- PDV, ERP, telefonia) e cada uma dessas coisas tem UM endereço de acesso e
-- VÁRIOS logins — um por loja/unidade. No cofre (0051) isso viraria doze linhas
-- soltas "Rádio Indoor — Loja X", com a URL repetida em todas e nenhum lugar
-- para o fornecedor e o telefone do suporte.
--
-- Por isso duas tabelas: o serviço (a ficha) e seus acessos (os logins).
--
-- Permissão em DOIS módulos de propósito:
--   - a ficha do serviço segue o módulo NOVO 'servicos', liberado a todos os
--     cargos no seed abaixo (mesmo rollout da 0034) — saber que o cliente usa
--     Rádio Indoor e a quem ligar quando cai não é segredo;
--   - os logins de dentro seguem o módulo 'vault', o mesmo do cofre, que nasce
--     'nenhum' para todo mundo: só super-admin (ceo/admin) vê senha, até que
--     alguém libere na tela de Permissões.
-- Quem tem 'servicos' e não tem 'vault' vê a ferramenta e o suporte, e não vê
-- login nenhum — o RLS derruba as linhas antes de saírem do banco.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='<senha-postgres>' node scripts/run_migration.mjs supabase/migrations/0061_cliente_servicos.sql
-- ============================================================

-- ---------- A ficha do serviço ----------
create table if not exists public.cliente_servicos (
	id uuid primary key default gen_random_uuid(),
	cliente_id uuid not null references public.clientes (id) on delete cascade,
	-- "Rádio Indoor", "Sistema PDV", "Telefonia"…
	nome text not null,
	categoria text,
	-- Endereço único do serviço (o painel onde se entra com qualquer login).
	url text,
	-- Quem fornece e como acionar quando dá problema.
	fornecedor text,
	suporte_contato text,
	-- Quanto o cliente paga por mês. Sigiloso: governado pelo módulo 'valores'.
	custo_mensal numeric(12, 2),
	responsavel_id uuid references public.colaboradores (id) on delete set null,
	observacoes text,
	-- Ordem manual dentro do cliente (o mais usado primeiro).
	posicao integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ---------- Os logins de dentro do serviço ----------
create table if not exists public.cliente_servico_acessos (
	id uuid primary key default gen_random_uuid(),
	servico_id uuid not null references public.cliente_servicos (id) on delete cascade,
	-- Qual unidade é este login: "Loja Centro", "Matriz", "Depósito"…
	rotulo text not null,
	login text,
	senha text,
	-- URL própria só quando a unidade entra por um endereço diferente do serviço.
	url text,
	observacoes text,
	posicao integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- A tela sempre lista por cliente / por serviço, na ordem manual.
create index if not exists idx_cliente_servicos_cliente
	on public.cliente_servicos (cliente_id, posicao, nome);
create index if not exists idx_cliente_servico_acessos_servico
	on public.cliente_servico_acessos (servico_id, posicao, rotulo);

drop trigger if exists set_cliente_servicos_updated_at on public.cliente_servicos;
create trigger set_cliente_servicos_updated_at
	before update on public.cliente_servicos
	for each row execute function public.set_updated_at();

drop trigger if exists set_cliente_servico_acessos_updated_at on public.cliente_servico_acessos;
create trigger set_cliente_servico_acessos_updated_at
	before update on public.cliente_servico_acessos
	for each row execute function public.set_updated_at();

-- ---------- RLS por módulo (mesmo padrão da 0036/0051) ----------
do $$
declare pol record;
begin
	for pol in
		select tablename, policyname from pg_policies
		where schemaname = 'public'
		  and tablename in ('cliente_servicos', 'cliente_servico_acessos')
	loop
		execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
	end loop;
end $$;

alter table public.cliente_servicos enable row level security;
alter table public.cliente_servico_acessos enable row level security;

create policy cliente_servicos_perm_sel on public.cliente_servicos
	for select to authenticated using ((select public.tem_permissao('servicos', 'ver')));

create policy cliente_servicos_perm_ins on public.cliente_servicos
	for insert to authenticated with check ((select public.tem_permissao('servicos', 'editar')));

create policy cliente_servicos_perm_upd on public.cliente_servicos
	for update to authenticated
	using ((select public.tem_permissao('servicos', 'editar')))
	with check ((select public.tem_permissao('servicos', 'editar')));

create policy cliente_servicos_perm_del on public.cliente_servicos
	for delete to authenticated using ((select public.tem_permissao('servicos', 'excluir')));

-- Os logins são cofre: módulo 'vault', não 'servicos'.
create policy cliente_servico_acessos_perm_sel on public.cliente_servico_acessos
	for select to authenticated using ((select public.tem_permissao('vault', 'ver')));

create policy cliente_servico_acessos_perm_ins on public.cliente_servico_acessos
	for insert to authenticated with check ((select public.tem_permissao('vault', 'editar')));

create policy cliente_servico_acessos_perm_upd on public.cliente_servico_acessos
	for update to authenticated
	using ((select public.tem_permissao('vault', 'editar')))
	with check ((select public.tem_permissao('vault', 'editar')));

create policy cliente_servico_acessos_perm_del on public.cliente_servico_acessos
	for delete to authenticated using ((select public.tem_permissao('vault', 'excluir')));

-- ---------- Seed do módulo novo (rollout "todos liberados", 0034) ----------
-- Ninguém perde acesso a nada por causa desta migration; restringir é feito na
-- tela /administrativo/permissoes. As SENHAS continuam fora disto (módulo vault).
insert into public.permissoes_cargo (funcao, modulo, nivel)
select f.funcao, 'servicos', 'excluir'::perm_nivel
from unnest(enum_range(null::colaborador_funcao)) as f(funcao)
on conflict (funcao, modulo) do nothing;

comment on table public.cliente_servicos is
	'Serviços e ferramentas contratados pelo cliente (Rádio Indoor, PDV…). Módulo de permissão: servicos.';
comment on table public.cliente_servico_acessos is
	'Logins de cada unidade dentro de um serviço do cliente. Módulo de permissão: vault (o mesmo do cofre).';
