-- ============================================================
-- DGathe — a Diretoria: três diretores Bandoletes logo abaixo dos CEOs
--
-- Pedido do Bruno (11/11/2026): um Diretor Estratégico, um Tático e um
-- Operacional para coordenar a operação inteira. Eles passam trabalho aos
-- gerentes (hoje o Lewis), que redistribuem para a equipe deles; o Bruno e a
-- Aline continuam podendo passar direto a qualquer gerente.
--
-- 1. A diretoria é a equipe 'diretoria', sem líder (check novo). As definições
--    ficam em agentes/diretoria/*.md e vão para o banco com node ponte/agentes.mjs;
--    aqui só entram as linhas com o personagem de cada um (o sincronizador
--    nunca mexe na aparência), ainda desativadas.
-- 2. A trava das subtarefas (dgathe_subtarefa_valida) passa a aceitar dois
--    níveis: diretor → gerente de outra equipe → equipe do gerente. O diretor
--    só delega da tarefa que recebeu (de cima); o gerente só redistribui uma
--    subtarefa que veio direto de um diretor. O resto continua igual.
-- 3. Parar uma tarefa para a árvore inteira, inclusive o gerente que estava
--    esperando a equipe ('aguardando') e a equipe dele.
-- 4. dgathe_agentes_agora conta como aberta a subtarefa 'aguardando' (o diretor
--    esperando um gerente que espera a equipe).
-- 5. dgathe_mapa traz o segundo nível (o mapa dos Bandoletes desenha a árvore inteira).
--
-- Para desfazer: reaplicar dgathe_subtarefa_valida e dgathe_parar da 0102,
-- dgathe_agentes_agora da 0106, dgathe_mapa da 0109 e
--   alter table public.dgathe_agentes drop constraint if exists dgathe_agentes_diretoria_check;
--   update public.dgathe_agentes set ativo = false where equipe = 'diretoria';
-- ============================================================

-- ------------------------------------------------------------ diretoria sem líder

alter table public.dgathe_agentes drop constraint if exists dgathe_agentes_diretoria_check;
alter table public.dgathe_agentes add constraint dgathe_agentes_diretoria_check
	check (not (equipe = 'diretoria' and lider));

comment on column public.dgathe_agentes.equipe is 'DGathe: equipe do agente (ex.: dev). null = sem equipe (os assessores). ''diretoria'' = os diretores, sem líder: passam trabalho aos gerentes das outras equipes.';

-- Os três diretores, com o personagem. O resto (instruções, sala, cadeira,
-- ativo) vem de agentes/diretoria/*.md pelo node ponte/agentes.mjs
insert into public.dgathe_agentes (id, nome, cargo, sala, cadeira, pasta, autonomia, equipe, lider, ordem, ativo, aparencia)
values
	('sun', 'Sun', 'Diretor Estratégico', 'diretoria', 'Cadeira de diretor', 'dunamiscompany', 'editar', 'diretoria', false, 2, false, '{"personagem":"barao"}'::jsonb),
	('pep', 'Pep', 'Diretor Tático', 'diretoria', 'Cadeira de diretor', 'dunamiscompany', 'editar', 'diretoria', false, 3, false, '{"personagem":"executivo"}'::jsonb),
	('henry', 'Henry', 'Diretor Operacional', 'diretoria', 'Cadeira de diretor', 'dunamiscompany', 'editar', 'diretoria', false, 4, false, '{"personagem":"veterano"}'::jsonb)
on conflict (id) do nothing;

-- ------------------------------------------------------------ a trava, com dois níveis

create or replace function public.dgathe_subtarefa_valida()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	v_pai record;
	v_quem record;
	v_destino record;
	v_acima record;
begin
	select id, agente_id, pai_id into v_pai from public.dgathe_tarefas where id = new.pai_id;
	if v_pai.id is null then raise exception 'DGathe: a tarefa-pai não existe'; end if;
	if v_pai.agente_id = new.agente_id then raise exception 'DGathe: ninguém delega para si mesmo'; end if;
	select equipe, lider into v_quem from public.dgathe_agentes where id = v_pai.agente_id;
	select equipe, lider, ativo into v_destino from public.dgathe_agentes where id = new.agente_id;
	if v_quem.equipe = 'diretoria' then
		-- Diretor: só da tarefa que recebeu, e só para o gerente de outra equipe
		if v_pai.pai_id is not null then raise exception 'DGathe: o diretor só delega da tarefa que recebeu dos CEOs'; end if;
		if not coalesce(v_destino.lider, false) or v_destino.equipe is null or v_destino.equipe = 'diretoria' then
			raise exception 'DGathe: o diretor passa o trabalho ao gerente de uma equipe';
		end if;
	elsif coalesce(v_quem.lider, false) then
		-- Gerente: da tarefa dele ou de uma que veio direto de um diretor (dois níveis no máximo)
		if v_pai.pai_id is not null then
			select t.pai_id, a.equipe into v_acima
			from public.dgathe_tarefas t join public.dgathe_agentes a on a.id = t.agente_id
			where t.id = v_pai.pai_id;
			if v_acima.equipe is distinct from 'diretoria' or v_acima.pai_id is not null then
				raise exception 'DGathe: subtarefa não cria subtarefa';
			end if;
		end if;
		if v_destino.equipe is distinct from v_quem.equipe then raise exception 'DGathe: o agente não é da equipe do líder'; end if;
	else
		raise exception 'DGathe: só o líder da equipe ou um diretor delega';
	end if;
	if tg_op = 'INSERT' and not coalesce(v_destino.ativo, false) then raise exception 'DGathe: o agente está desativado'; end if;
	return new;
end;
$$;
revoke execute on function public.dgathe_subtarefa_valida() from public, anon, authenticated;

-- ------------------------------------------------------------ parar a árvore inteira

create or replace function public.dgathe_parar(p_tarefa uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_achou boolean;
begin
	if not public.tem_permissao('dgathe_agentes', 'editar') then
		raise exception 'Sem permissão para parar os agentes';
	end if;
	update public.dgathe_tarefas
	set status = case when status in ('fila', 'aguardando') then 'cancelada' else status end,
		terminada_em = case when status in ('fila', 'aguardando') then now() else terminada_em end,
		atividade = case when status = 'fila' then 'Cancelada antes de começar'
			when status = 'aguardando' then 'Parada a pedido' else atividade end,
		cancelar = status in ('trabalhando', 'esperando'),
		atualizada_em = now()
	where id = p_tarefa and status in ('fila', 'trabalhando', 'esperando', 'aguardando')
	returning true into v_achou;
	-- Parar o projeto para também quem está embaixo: a equipe e, num pedido de
	-- diretor, o gerente (mesmo esperando a equipe dele) e a equipe do gerente
	if v_achou then
		with recursive abaixo as (
			select id, 1 as n from public.dgathe_tarefas where pai_id = p_tarefa
			union all
			select s.id, abaixo.n + 1 from public.dgathe_tarefas s join abaixo on s.pai_id = abaixo.id where abaixo.n < 3
		)
		update public.dgathe_tarefas t
		set status = case when t.status in ('fila', 'aguardando') then 'cancelada' else t.status end,
			terminada_em = case when t.status in ('fila', 'aguardando') then now() else t.terminada_em end,
			atividade = case when t.status in ('fila', 'aguardando') then 'Parada junto com o projeto' else t.atividade end,
			cancelar = t.status in ('trabalhando', 'esperando'),
			atualizada_em = now()
		from abaixo
		where t.id = abaixo.id and t.status in ('fila', 'trabalhando', 'esperando', 'aguardando');
	end if;
end;
$$;

-- ------------------------------------------------------------ o que o jogo lê

CREATE OR REPLACE FUNCTION public.dgathe_agentes_agora()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
							-- Quem aprova os pedidos desta tarefa: quem a passou, ou, numa
							-- subtarefa (criada pelo líder), quem passou a tarefa de cima
							'aprovador', (
								with recursive cima as (
									select x.id, x.pai_id, x.criada_por, 0 as n from public.dgathe_tarefas x where x.id = t.id
									union all
									select p.id, p.pai_id, p.criada_por, cima.n + 1
									from public.dgathe_tarefas p join cima on p.id = cima.pai_id
									where cima.n < 10
								)
								select criada_por from cima where criada_por is not null order by n limit 1
							),
							'subtarefas_abertas', case when v_detalhe then (
								select count(*) from public.dgathe_tarefas s
								where s.pai_id = t.id and s.status in ('fila', 'trabalhando', 'esperando', 'aguardando')
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
$function$;

create or replace function public.dgathe_mapa(p_horas int default 12)
returns jsonb
language sql
volatile
security definer
set search_path = public
as $$
	with raizes as (
		select t.*
		from public.dgathe_tarefas t
		where t.pai_id is null
			and (
				t.status in ('fila', 'trabalhando', 'esperando', 'aguardando')
				or t.terminada_em >= clock_timestamp() - make_interval(hours => greatest(1, least(coalesce(p_horas, 12), 72)))
			)
		order by (t.status in ('fila', 'trabalhando', 'esperando', 'aguardando')) desc, coalesce(t.terminada_em, t.criada_em) desc
		limit 20
	),
	primeiro as (
		select s.* from public.dgathe_tarefas s where s.pai_id in (select id from raizes)
	),
	nos as (
		select r.*, 0 as nivel from raizes r
		union all
		select p.*, 1 as nivel from primeiro p
		union all
		-- O segundo nível: a equipe do gerente que recebeu de um diretor
		select s.*, 2 as nivel from public.dgathe_tarefas s where s.pai_id in (select id from primeiro)
	)
	select case when public.tem_permissao('dgathe_agentes', 'ver') then jsonb_build_object(
		'tarefas', coalesce((
			select jsonb_agg(jsonb_build_object(
				'id', n.id,
				'pai_id', n.pai_id,
				'agente_id', n.agente_id,
				'agente_nome', a.nome,
				'agente_cargo', a.cargo,
				'titulo', n.titulo,
				'status', n.status,
				'atividade', n.atividade,
				'criada_por_nome', n.criada_por_nome,
				'resumo', left(n.resultado, 280),
				'erro', left(n.erro, 280),
				'passos', n.passos,
				'tokens', n.tokens,
				'modelo', n.modelo,
				'rodada_do_pai', n.rodada_do_pai,
				'pedidos', (
					select count(*) from public.dgathe_pedidos q
					where q.tarefa_id = n.id and q.resposta is null and not q.cancelado and n.status in ('trabalhando', 'esperando')
				),
				'duracao', extract(epoch from coalesce(n.terminada_em, clock_timestamp()) - coalesce(n.iniciada_em, n.criada_em))::real,
				'criada_ha', extract(epoch from clock_timestamp() - n.criada_em)::real,
				'terminada_ha', extract(epoch from clock_timestamp() - n.terminada_em)::real
			) order by n.nivel, n.criada_em, n.id)
			from nos n
			join public.dgathe_agentes a on a.id = n.agente_id
		), '[]'::jsonb)
	) end;
$$;

revoke execute on function public.dgathe_mapa(int) from public, anon;
grant execute on function public.dgathe_mapa(int) to authenticated;
