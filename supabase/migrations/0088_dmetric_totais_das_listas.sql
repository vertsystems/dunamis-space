-- ============================================================
-- DMetric — cada lista do painel com o seu total de verdade
--
-- dmetric_painel mandava só os 25 primeiros de cada lista (0080) e a tela
-- tratava esses 25 como se fossem tudo: o quadro "Cidades" dizia 25 quando
-- havia 403, a porcentagem de cada cidade saía da soma das 25, o total de
-- cliques da página do site somava só os 25 primeiros destinos, e o botão
-- dizia "Ver todos (25)".
--
-- Agora as duas funções do painel mandam também `totais`: para cada lista,
-- quantos valores existem (n) e a soma das visitas e das páginas vistas de
-- todos eles, antes do corte. O valor vazio ('', cidade ou origem que não deu
-- para saber) fica fora do total, como fica fora das listas na tela.
--
-- O corte fica por lista: países todos (o mapa precisa de todos), cidades as
-- 100 primeiras, páginas as 50 primeiras, o resto as 25 primeiras. A lista
-- recente (última hora, 24 horas) passa a ter o mesmo corte — antes mandava
-- tudo.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0088_dmetric_totais_das_listas.sql
-- ============================================================

-- Quantos itens de cada lista vão para a tela.
create or replace function public.dmetric_corte_da_lista(p_dimensao text)
returns integer
language sql
immutable
as $$
	select case p_dimensao
		when 'pais' then 1000000
		when 'cidade' then 100
		when 'pagina' then 50
		else 25
	end;
$$;
grant execute on function public.dmetric_corte_da_lista(text) to authenticated;

-- ---------- Painel dos períodos de dias (o mesmo da 0080, mais os totais) ----------
create or replace function public.dmetric_painel(p_site uuid, p_de date, p_ate date)
returns jsonb
language sql
stable
set search_path = public
as $$
	with base as (
		select site_id, dimensao, valor, dia, visitas, visualizacoes, segundos
		from public.dmetric_diario
		where dia between p_de and p_ate
			and (p_site is null or site_id = p_site)
	),
	-- Cada valor de cada lista, somado no período (a página é separada por site).
	itens as (
		select dimensao, case when dimensao = 'pagina' then site_id end as site_id, valor,
			sum(visitas)::int as visitas, sum(visualizacoes)::int as visualizacoes, sum(segundos)::bigint as segundos
		from base
		where dimensao not in ('total', 'hora')
		group by dimensao, 2, valor
	),
	dims as (
		select dimensao, jsonb_agg(jsonb_build_object('valor', valor, 'site_id', site_id, 'visitas', visitas,
			'visualizacoes', visualizacoes, 'segundos', segundos) order by visitas desc, visualizacoes desc) as itens
		from (
			select *, row_number() over (partition by dimensao order by visitas desc, visualizacoes desc) as pos
			from itens
		) s
		where pos <= public.dmetric_corte_da_lista(dimensao)
		group by dimensao
	),
	-- O tamanho de verdade de cada lista, antes do corte.
	totais as (
		select dimensao,
			count(*) filter (where valor <> '')::int as n,
			coalesce(sum(visitas) filter (where valor <> ''), 0)::int as visitas,
			coalesce(sum(visualizacoes) filter (where valor <> ''), 0)::int as visualizacoes
		from itens
		group by dimensao
	)
	select jsonb_build_object(
		'visitas', coalesce((select sum(visitas) from base where dimensao = 'total'), 0),
		'visualizacoes', coalesce((select sum(visualizacoes) from base where dimensao = 'total'), 0),
		'segundos', coalesce((select sum(segundos) from base where dimensao = 'total'), 0),
		'por_dia', coalesce((
			select jsonb_agg(jsonb_build_object('dia', dia, 'visitas', v, 'visualizacoes', vz) order by dia)
			from (select dia, sum(visitas)::int v, sum(visualizacoes)::int vz from base where dimensao = 'total' group by dia) t
		), '[]'::jsonb),
		'dimensoes', coalesce((select jsonb_object_agg(dimensao, itens) from dims), '{}'::jsonb),
		'totais', coalesce((
			select jsonb_object_agg(dimensao, jsonb_build_object('n', n, 'visitas', visitas, 'visualizacoes', visualizacoes))
			from totais
		), '{}'::jsonb),
		-- Dia da semana (0 = domingo) × hora, para o mapa de horários de pico.
		'por_hora', coalesce((
			select jsonb_agg(jsonb_build_object('dow', dow, 'hora', hora, 'visitas', v, 'visualizacoes', vz))
			from (
				select extract(dow from dia)::int as dow, valor::int as hora,
					sum(visitas)::int as v, sum(visualizacoes)::int as vz
				from base where dimensao = 'hora' group by 1, 2
			) t
		), '[]'::jsonb)
	);
$$;
grant execute on function public.dmetric_painel(uuid, date, date) to authenticated;

-- ---------- Painel das últimas horas (o mesmo da 0078, com o corte e os totais) ----------
create or replace function public.dmetric_painel_recente(p_site uuid, p_desde timestamptz, p_passo interval)
returns jsonb
language sql
stable
set search_path = public
as $$
	with r as (
		select * from public.dmetric_recentes
		where em >= p_desde and (p_site is null or site_id = p_site)
	),
	v as (select * from r where tipo = 'v'),
	chegada as (
		select distinct on (site_id, visitante) * from v order by site_id, visitante, em
	),
	dims as (
		select 'pais' as dimensao, null::uuid as site_id, pais as valor, count(distinct (site_id, visitante))::int as visitas, count(*)::int as visualizacoes from v group by pais
		union all select 'cidade', null, cidade, count(distinct (site_id, visitante))::int, count(*)::int from v group by cidade
		union all select 'pagina', site_id, caminho, count(distinct visitante)::int, count(*)::int from v group by site_id, caminho
		union all select 'dispositivo', null, dispositivo, count(distinct (site_id, visitante))::int, count(*)::int from v group by dispositivo
		union all select 'navegador', null, navegador, count(distinct (site_id, visitante))::int, count(*)::int from v group by navegador
		union all select 'sistema', null, sistema, count(distinct (site_id, visitante))::int, count(*)::int from v group by sistema
		union all select 'origem', null, origem, count(*)::int, count(*)::int from chegada group by origem
		union all select 'campanha', null, campanha, count(*)::int, count(*)::int from chegada where campanha is not null group by campanha
		union all select 'clique', null, valor, 0, count(*)::int from r where tipo = 'clique' group by valor
	),
	degraus as (
		select g as momento
		from generate_series(
			date_bin(p_passo, p_desde, timestamptz '2000-01-01'),
			date_bin(p_passo, now(), timestamptz '2000-01-01'),
			p_passo
		) g
	),
	por_degrau as (
		select date_bin(p_passo, em, timestamptz '2000-01-01') as momento,
			count(distinct (site_id, visitante))::int as visitas, count(*)::int as visualizacoes
		from v group by 1
	)
	select jsonb_build_object(
		'visitas', (select count(distinct (site_id, visitante)) from v),
		'visualizacoes', (select count(*) from v),
		'segundos', coalesce((select sum(segundos) from r where tipo = 'tempo'), 0),
		'por_dia', '[]'::jsonb,
		'serie', coalesce((
			select jsonb_agg(jsonb_build_object('momento', d.momento, 'visitas', coalesce(p.visitas, 0), 'visualizacoes', coalesce(p.visualizacoes, 0)) order by d.momento)
			from degraus d left join por_degrau p using (momento)
		), '[]'::jsonb),
		'dimensoes', coalesce((
			select jsonb_object_agg(dimensao, itens) from (
				select dimensao, jsonb_agg(jsonb_build_object('valor', coalesce(valor, ''), 'site_id', site_id, 'visitas', visitas, 'visualizacoes', visualizacoes)
					order by visitas desc, visualizacoes desc) as itens
				from (
					select *, row_number() over (partition by dimensao order by visitas desc, visualizacoes desc) as pos
					from dims
				) s
				where pos <= public.dmetric_corte_da_lista(dimensao)
				group by dimensao
			) x
		), '{}'::jsonb),
		'totais', coalesce((
			select jsonb_object_agg(dimensao, jsonb_build_object('n', n, 'visitas', visitas, 'visualizacoes', visualizacoes))
			from (
				select dimensao,
					count(*) filter (where coalesce(valor, '') <> '')::int as n,
					coalesce(sum(visitas) filter (where coalesce(valor, '') <> ''), 0)::int as visitas,
					coalesce(sum(visualizacoes) filter (where coalesce(valor, '') <> ''), 0)::int as visualizacoes
				from dims
				group by dimensao
			) t
		), '{}'::jsonb)
	);
$$;
grant execute on function public.dmetric_painel_recente(uuid, timestamptz, interval) to authenticated;

notify pgrst, 'reload schema';
