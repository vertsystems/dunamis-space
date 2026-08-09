-- ============================================================
-- Dunamis Space — Registro de Ponto
-- ------------------------------------------------------------
-- O colaborador bate quatro pontos por dia (entrada, saída para o almoço,
-- volta do almoço e fim do expediente) no Meu Dia. CEO/Admin acompanham em
-- /administrativo/ponto: quem está trabalhando agora, horas e saldo do mês.
--
-- Decisões do modelo:
--  * Um registro por (colaborador, dia) com as quatro batidas como colunas —
--    o dia tem forma fixa, então nada de tabela de eventos: a leitura da tela
--    vira um SELECT direto e "qual é a próxima batida?" é ler quatro colunas.
--  * Batida é um INSTANTE, então timestamptz. A exibição/edição converte para
--    America/Sao_Paulo no app (src/lib/ponto.ts) — nunca com toISOString().
--  * Horas trabalhadas e saldo NÃO são colunas: dependem de "agora" (o dia em
--    curso) e de expressões não-imutáveis, que o Postgres recusa em coluna
--    gerada. Ficam em ponto.ts, com testes.
--  * Correção de batida não é edição direta: o colaborador abre um pedido
--    (ponto_ajustes) e CEO/Admin aprova, o que deixa trilha de quem mudou o quê.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0053_ponto.sql
-- ============================================================

-- ---------- Jornada esperada (por pessoa) ----------
-- Sem jornada não existe saldo: 480 min = 8h/dia, de segunda a sexta.
-- jornada_dias usa a mesma convenção do Mapa de Rotina: 0=Domingo … 6=Sábado.
alter table public.colaboradores
	add column if not exists jornada_minutos int not null default 480,
	add column if not exists jornada_dias smallint[] not null default '{1,2,3,4,5}';

alter table public.colaboradores
	drop constraint if exists colaboradores_jornada_minutos_ck;
alter table public.colaboradores
	add constraint colaboradores_jornada_minutos_ck
	check (jornada_minutos between 0 and 1440);

-- ---------- Registro do dia ----------
create table if not exists public.ponto_registros (
	id uuid primary key default gen_random_uuid(),
	colaborador_id uuid not null references public.colaboradores (id) on delete cascade,
	data date not null,
	entrada timestamptz,
	almoco_saida timestamptz,
	almoco_volta timestamptz,
	saida timestamptz,
	-- Preenchida quando um gestor edita à mão ou aprova um ajuste.
	observacao text,
	editado_por uuid references public.colaboradores (id) on delete set null,
	editado_em timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (colaborador_id, data)
);

create index if not exists ponto_registros_data_idx on public.ponto_registros (data desc);
create index if not exists ponto_registros_colab_data_idx on public.ponto_registros (colaborador_id, data desc);

-- ---------- Pedidos de ajuste ----------
-- Um pedido cobre um dia inteiro: o colaborador manda as quatro batidas como
-- elas deveriam ter sido (null = sem batida) e o motivo. Aprovar aplica tudo.
create table if not exists public.ponto_ajustes (
	id uuid primary key default gen_random_uuid(),
	colaborador_id uuid not null references public.colaboradores (id) on delete cascade,
	data date not null,
	entrada timestamptz,
	almoco_saida timestamptz,
	almoco_volta timestamptz,
	saida timestamptz,
	motivo text not null,
	status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
	resposta text,
	decidido_por uuid references public.colaboradores (id) on delete set null,
	decidido_em timestamptz,
	created_at timestamptz not null default now()
);

create index if not exists ponto_ajustes_status_idx on public.ponto_ajustes (status, created_at desc);
create index if not exists ponto_ajustes_colab_idx on public.ponto_ajustes (colaborador_id, data desc);

-- Um pedido pendente por dia: o segundo envio edita o primeiro, em vez de
-- encher a fila do gestor com pedidos concorrentes para o mesmo dia.
create unique index if not exists ponto_ajustes_pendente_unico
	on public.ponto_ajustes (colaborador_id, data)
	where status = 'pendente';

-- ---------- RLS ----------
-- Bater o próprio ponto não exige o módulo 'ponto' (o Meu Dia é rota livre):
-- toda pessoa autenticada lê e escreve as PRÓPRIAS batidas — e só as de hoje,
-- para que o passado não possa ser reescrito pela API. Quem tem o módulo
-- 'ponto' (ceo/admin por super-admin, ou quem for liberado na tela de
-- Permissões) lê todo mundo, corrige qualquer dia e decide os ajustes.
alter table public.ponto_registros enable row level security;
alter table public.ponto_ajustes enable row level security;

do $$
declare pol record;
begin
	for pol in
		select tablename, policyname from pg_policies
		where schemaname = 'public' and tablename in ('ponto_registros', 'ponto_ajustes')
	loop
		execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
	end loop;
end $$;

-- Hoje em São Paulo, para travar a escrita do próprio ponto no dia corrente.
create or replace function public.hoje_sp()
returns date
language sql
stable
as $$
	select (now() at time zone 'America/Sao_Paulo')::date;
$$;

grant execute on function public.hoje_sp() to authenticated;

create policy ponto_registros_sel on public.ponto_registros
	for select to authenticated
	using (
		colaborador_id = (select public.colaborador_atual())
		or (select public.tem_permissao('ponto', 'ver'))
	);

create policy ponto_registros_ins on public.ponto_registros
	for insert to authenticated
	with check (
		(colaborador_id = (select public.colaborador_atual()) and data = public.hoje_sp())
		or (select public.tem_permissao('ponto', 'editar'))
	);

create policy ponto_registros_upd on public.ponto_registros
	for update to authenticated
	using (
		(colaborador_id = (select public.colaborador_atual()) and data = public.hoje_sp())
		or (select public.tem_permissao('ponto', 'editar'))
	)
	with check (
		(colaborador_id = (select public.colaborador_atual()) and data = public.hoje_sp())
		or (select public.tem_permissao('ponto', 'editar'))
	);

create policy ponto_registros_del on public.ponto_registros
	for delete to authenticated
	using ((select public.tem_permissao('ponto', 'excluir')));

create policy ponto_ajustes_sel on public.ponto_ajustes
	for select to authenticated
	using (
		colaborador_id = (select public.colaborador_atual())
		or (select public.tem_permissao('ponto', 'ver'))
	);

-- Pedir ajuste é do colaborador; só nasce pendente e só para si mesmo.
create policy ponto_ajustes_ins on public.ponto_ajustes
	for insert to authenticated
	with check (
		(colaborador_id = (select public.colaborador_atual()) and status = 'pendente')
		or (select public.tem_permissao('ponto', 'editar'))
	);

-- Editar o próprio pedido enquanto ninguém decidiu; decidir é do gestor.
create policy ponto_ajustes_upd on public.ponto_ajustes
	for update to authenticated
	using (
		(colaborador_id = (select public.colaborador_atual()) and status = 'pendente')
		or (select public.tem_permissao('ponto', 'editar'))
	)
	with check (
		(colaborador_id = (select public.colaborador_atual()) and status = 'pendente')
		or (select public.tem_permissao('ponto', 'editar'))
	);

create policy ponto_ajustes_del on public.ponto_ajustes
	for delete to authenticated
	using (
		(colaborador_id = (select public.colaborador_atual()) and status = 'pendente')
		or (select public.tem_permissao('ponto', 'excluir'))
	);

-- updated_at do registro (o app depende dele para ordenar correções).
create or replace function public.ponto_touch()
returns trigger
language plpgsql
as $$
begin
	new.updated_at := now();
	return new;
end;
$$;

drop trigger if exists ponto_registros_touch on public.ponto_registros;
create trigger ponto_registros_touch
	before update on public.ponto_registros
	for each row execute function public.ponto_touch();

-- ---------- Permissão ----------
-- Nada de seed: o módulo 'ponto' nasce 'nenhum' para todos os cargos, e só
-- ceo/admin (super-admin) enxergam o painel até que alguém libere na tela de
-- Permissões. O registro do próprio ponto independe disso.
