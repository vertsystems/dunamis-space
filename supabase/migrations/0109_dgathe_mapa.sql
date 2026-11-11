-- ============================================================
-- DGathe — o mapa dos Bandoletes
--
-- Pedido do Bruno (10/11/2026): um botão no topo do jogo que abre o fluxo do
-- trabalho, como o mapa de agentes do Claude Code. Cada pedido aparece como
-- uma árvore: o Bandolete que recebeu (o líder, quando é equipe) e, ligados a
-- ele, os da equipe com as subtarefas; em cada um, o estado, o tempo, os
-- tokens em contexto e o que está fazendo.
--
-- 1. dgathe_tarefas ganha `tokens` (tokens em contexto na última chamada ao
--    modelo, a mesma conta do Claude Code) e `modelo` (o que a sessão usou). A
--    ponte (versão 1.4) grava os dois junto das gravações que já faz, sem
--    escrita a mais no banco.
-- 2. dgathe_mapa(p_horas): as tarefas de cima ainda abertas e as que terminaram
--    nas últimas p_horas (até 20), cada uma com as subtarefas. Só para quem vê
--    os Bandoletes (módulo dgathe_agentes), como as outras leituras de tarefa.
--
-- Para desfazer:
--   drop function if exists public.dgathe_mapa(int);
--   alter table public.dgathe_tarefas drop column if exists tokens, drop column if exists modelo;
--   (e voltar a ponte para a versão 1.3, que não grava as duas colunas)
-- ============================================================

alter table public.dgathe_tarefas
	add column if not exists tokens int check (tokens is null or tokens >= 0),
	add column if not exists modelo text check (modelo is null or length(modelo) <= 60);

comment on column public.dgathe_tarefas.tokens is 'Tokens em contexto na última chamada ao modelo (entrada + cache + saída), gravado pela ponte. É o que o mapa dos Bandoletes mostra.';
comment on column public.dgathe_tarefas.modelo is 'O modelo que a sessão do Claude Code usou (ex.: claude-opus-5-5), gravado pela ponte.';

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
	nos as (
		select r.*, 0 as nivel from raizes r
		union all
		select s.*, 1 as nivel from public.dgathe_tarefas s where s.pai_id in (select id from raizes)
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
