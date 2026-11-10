-- ============================================================
-- DGathe — consumo do Claude no topo do jogo, reuniões de alinhamento e a
-- hora do servidor para a rotina dos agentes
--
-- Pedidos do Bruno (10/11/2026):
--   1. Um ícone no topo do jogo com o consumo do plano do Claude em tempo real
--      (janela de 5 h, quanto falta para zerar, semana, Fable). A ponte do Mac
--      pergunta ao Claude Code (get_usage, sem gastar limite) a cada minuto e
--      grava em dgathe_uso; o jogo lê por dgathe_uso() (só quem comanda os
--      agentes: é a conta do Bruno).
--   2. Agentes 80% do tempo no posto e 20% em pausas (src/lib/dgathe/rotina.ts);
--      para todas as telas fazerem a mesma conta, dgathe_agentes_agora passa a
--      mandar a hora do servidor ('agora').
--   3. "Se forem chamados para alguma sala para reunião de alinhamento, se
--      moverem e ao fim retornarem a seus postos": dgathe_reunioes. A ponte
--      abre uma reunião de 2 min quando um líder distribui um projeto para 2 ou
--      mais especialistas; quem comanda os agentes também chama e encerra pelo
--      jogo (dgathe_chamar_reuniao / dgathe_encerrar_reuniao).
--
-- Para desfazer:
--   drop function if exists public.dgathe_encerrar_reuniao(uuid);
--   drop function if exists public.dgathe_chamar_reuniao(text, text[], int);
--   drop function if exists public.dgathe_uso();
--   drop table if exists public.dgathe_reunioes, public.dgathe_uso;
--   (e recriar dgathe_agentes_agora pela 0102)
-- ============================================================

-- ---------------------------------------------------------------- consumo

create table if not exists public.dgathe_uso (
	ponte text primary key,
	plano text,
	sessao_pct real,
	sessao_zera timestamptz,
	semanal_pct real,
	semanal_zera timestamptz,
	-- [{"nome":"Fable","pct":0,"zera":"…"}]
	modelos jsonb not null default '[]'::jsonb,
	lido_em timestamptz not null default now()
);
alter table public.dgathe_uso enable row level security;
revoke all on public.dgathe_uso from anon, authenticated;
grant select, insert, update on public.dgathe_uso to dgathe_ponte;
drop policy if exists "dgathe: a ponte grava o consumo" on public.dgathe_uso;
create policy "dgathe: a ponte grava o consumo" on public.dgathe_uso for all to dgathe_ponte using (true) with check (true);
comment on table public.dgathe_uso is 'DGathe: consumo do plano do Claude da conta do Mac da ponte (janela de 5 h, semana, por modelo). Gravado pela ponte a cada minuto.';

create or replace function public.dgathe_uso()
returns jsonb
language sql
volatile
security definer
set search_path = public
as $$
	select case when public.tem_permissao('dgathe_agentes', 'editar') then (
		select jsonb_build_object(
			'plano', u.plano,
			'sessao_pct', u.sessao_pct,
			'sessao_zera', u.sessao_zera,
			'semanal_pct', u.semanal_pct,
			'semanal_zera', u.semanal_zera,
			'modelos', u.modelos,
			'lido_ha', extract(epoch from clock_timestamp() - u.lido_em)::real
		)
		from public.dgathe_uso u
		order by u.lido_em desc
		limit 1
	) end;
$$;
revoke execute on function public.dgathe_uso() from public, anon;
grant execute on function public.dgathe_uso() to authenticated;

-- ---------------------------------------------------------------- reuniões

create table if not exists public.dgathe_reunioes (
	id uuid primary key default gen_random_uuid(),
	sala text not null,
	titulo text not null default 'Reunião de alinhamento' check (length(titulo) <= 120),
	participantes text[] not null check (cardinality(participantes) between 1 and 30),
	-- Reunião aberta pela ponte no começo de uma rodada de delegação (uma por rodada)
	tarefa_id uuid references public.dgathe_tarefas (id) on delete cascade,
	rodada int,
	criada_por text not null default '',
	inicio timestamptz not null default now(),
	fim timestamptz not null,
	check (fim > inicio)
);
create unique index if not exists dgathe_reunioes_rodada on public.dgathe_reunioes (tarefa_id, rodada) where tarefa_id is not null;
create index if not exists dgathe_reunioes_fim on public.dgathe_reunioes (fim);
alter table public.dgathe_reunioes enable row level security;
revoke all on public.dgathe_reunioes from anon, authenticated;
grant select, insert on public.dgathe_reunioes to dgathe_ponte;
drop policy if exists "dgathe: a ponte abre reuniões" on public.dgathe_reunioes;
create policy "dgathe: a ponte abre reuniões" on public.dgathe_reunioes for all to dgathe_ponte using (true) with check (true);
comment on table public.dgathe_reunioes is 'DGathe: reuniões de alinhamento (quem, onde, até quando). Abertas pela ponte quando um líder distribui um projeto, ou pelo jogo.';

-- Chamar agentes para uma sala (só quem comanda os agentes). Devolve o id.
create or replace function public.dgathe_chamar_reuniao(p_sala text, p_agentes text[], p_minutos int default 15)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_eu uuid := public.colaborador_atual();
	v_nome text;
	v_validos text[];
	v_id uuid;
begin
	if v_eu is null or not public.tem_permissao('dgathe_agentes', 'editar') then
		raise exception 'Sem permissão para chamar os agentes';
	end if;
	if coalesce(btrim(p_sala), '') = '' or length(p_sala) > 40 then
		raise exception 'Sala inválida';
	end if;
	select array_agg(id order by ordem, id) into v_validos
	from public.dgathe_agentes where ativo and id = any (coalesce(p_agentes, '{}'));
	if v_validos is null then
		raise exception 'Escolha pelo menos um agente';
	end if;
	select nome into v_nome from public.colaboradores where id = v_eu;
	insert into public.dgathe_reunioes (sala, titulo, participantes, criada_por, fim)
	values (p_sala, 'Reunião de alinhamento', v_validos, coalesce(split_part(v_nome, ' ', 1), ''),
		clock_timestamp() + make_interval(mins => greatest(1, least(coalesce(p_minutos, 15), 120))))
	returning id into v_id;
	return v_id;
end;
$$;

create or replace function public.dgathe_encerrar_reuniao(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
	if not public.tem_permissao('dgathe_agentes', 'editar') then
		raise exception 'Sem permissão para encerrar a reunião';
	end if;
	update public.dgathe_reunioes set fim = greatest(inicio + interval '1 second', clock_timestamp())
	where id = p_id and fim > clock_timestamp();
end;
$$;

revoke execute on function public.dgathe_chamar_reuniao(text, text[], int) from public, anon;
revoke execute on function public.dgathe_encerrar_reuniao(uuid) from public, anon;
grant execute on function public.dgathe_chamar_reuniao(text, text[], int) to authenticated;
grant execute on function public.dgathe_encerrar_reuniao(uuid) to authenticated;

-- ---------------------------------------------------------------- o que o jogo lê

-- A mesma da 0102, com 'agora', 'reunioes' e a 'reuniao' de cada agente.
create or replace function public.dgathe_agentes_agora()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_detalhe boolean;
	v_pode text;
begin
	if not public.tem_permissao('dgathe', 'ver') then
		return null;
	end if;
	v_detalhe := public.tem_permissao('dgathe_agentes', 'ver');
	v_pode := case
		when public.tem_permissao('dgathe_agentes', 'editar') then 'editar'
		when v_detalhe then 'ver'
		else 'nenhum' end;
	return jsonb_build_object(
		'pode', v_pode,
		-- Hora do servidor (s desde 1970): a rotina dos agentes (pausas) dá igual em todas as telas
		'agora', extract(epoch from clock_timestamp())::double precision,
		'reunioes', coalesce((
			select jsonb_agg(jsonb_build_object(
				'id', r.id,
				'sala', r.sala,
				'titulo', r.titulo,
				'participantes', to_jsonb(r.participantes),
				'criada_por', r.criada_por,
				'ate', extract(epoch from r.fim)::double precision
			) order by r.inicio)
			from public.dgathe_reunioes r
			where r.inicio <= clock_timestamp() and r.fim > clock_timestamp()
		), '[]'::jsonb),
		'ponte', (
			select jsonb_build_object(
				'id', p.id,
				'visto_ha', extract(epoch from clock_timestamp() - p.visto_em)::real,
				'trabalhando', p.trabalhando
			)
			from public.dgathe_ponte p
			order by p.visto_em desc
			limit 1
		),
		'agentes', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', a.id,
					'nome', a.nome,
					'cargo', a.cargo,
					'sala', a.sala,
					'cadeira', a.cadeira,
					'aparencia', a.aparencia,
					'ordem', a.ordem,
					'equipe', a.equipe,
					'lider', a.lider,
					'reuniao', (
						select jsonb_build_object('id', r.id, 'sala', r.sala, 'titulo', r.titulo, 'ate', extract(epoch from r.fim)::double precision)
						from public.dgathe_reunioes r
						where a.id = any (r.participantes) and r.inicio <= clock_timestamp() and r.fim > clock_timestamp()
						order by r.inicio desc
						limit 1
					),
					'na_fila', (select count(*) from public.dgathe_tarefas f where f.agente_id = a.id and f.status = 'fila'),
					'pedidos', (
						select count(*) from public.dgathe_pedidos q
						join public.dgathe_tarefas t on t.id = q.tarefa_id
						where t.agente_id = a.id and q.resposta is null and not q.cancelado
							and t.status in ('trabalhando', 'esperando')
					),
					'tarefa', (
						select jsonb_build_object(
							'id', case when v_detalhe then t.id end,
							'status', t.status,
							'titulo', case when v_detalhe then t.titulo end,
							'atividade', case when v_detalhe then t.atividade end,
							'desde', extract(epoch from clock_timestamp() - case when t.status = 'aguardando' then t.atualizada_em else coalesce(t.iniciada_em, t.criada_em) end)::real,
							'pai_id', case when v_detalhe then t.pai_id end,
							'subtarefas_abertas', case when v_detalhe then (
								select count(*) from public.dgathe_tarefas s
								where s.pai_id = t.id and s.status in ('fila', 'trabalhando', 'esperando')
							) end
						)
						from public.dgathe_tarefas t
						where t.agente_id = a.id and t.status in ('fila', 'trabalhando', 'esperando', 'aguardando')
						order by case t.status when 'esperando' then 0 when 'trabalhando' then 1 when 'aguardando' then 2 else 3 end, t.criada_em
						limit 1
					)
				)
				order by a.ordem, a.nome
			)
			from public.dgathe_agentes a
			where a.ativo
		), '[]'::jsonb)
	);
end;
$$;
