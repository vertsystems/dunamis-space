-- ============================================================
-- DMetric — resultados (metas e conversão)
--
-- "Quantas visitas deram resultado?" é o número que o cliente entende. Cada
-- site escolhe quais cliques contam como resultado — WhatsApp, Mapa (como
-- chegar), o site da loja… —, e o painel mostra a taxa de conversão, o funil
-- visita → clicou em algo → deu resultado, e a taxa por origem, campanha,
-- cidade e site.
--
--   1. dmetric_metas: os cliques que contam como resultado em cada site. Site
--      sem nenhum escolhido usa o padrão (dmetric_metas_padrao): WhatsApp,
--      Telefone, E-mail e Mapa — o mesmo de METAS_PADRAO, em
--      src/lib/dmetric/resultados.ts.
--   2. dmetric_recorte_sql: a montagem dos filtros do painel (0091) sai para
--      uma função só, usada pelo painel filtrado e pela conversão — os dois
--      nunca contam o recorte de jeitos diferentes. O painel continua igual.
--   3. dmetric_conversao: visitas, quantas clicaram em algo, quantas deram
--      resultado, os cliques de cada meta e a taxa por origem, campanha,
--      cidade e site — com os mesmos filtros do painel. A janela começa, no
--      mínimo, quando o clique passou a saber de quem é ("desde", "cortado").
--   4. dmetric_destinos_do_site: os destinos de clique que o site já teve,
--      para escolher as metas.
--
-- Conversão precisa saber quem clicou: conta a partir de 23/10/2026 (0091).
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0093_dmetric_resultados.sql
-- ============================================================

-- ---------- 1. As metas de cada site ----------
create table if not exists public.dmetric_metas (
	site_id uuid not null references public.dmetric_sites (id) on delete cascade,
	-- O destino do clique, como aparece na lista de cliques: "WhatsApp", "Mapa", "lojasmari.com.br"…
	valor text not null,
	criado_em timestamptz not null default now(),
	primary key (site_id, valor)
);
alter table public.dmetric_metas enable row level security;
drop policy if exists dmetric_metas_ver on public.dmetric_metas;
create policy dmetric_metas_ver on public.dmetric_metas
	for select to authenticated using ((select public.tem_permissao('dmetric', 'ver')));
drop policy if exists dmetric_metas_editar on public.dmetric_metas;
create policy dmetric_metas_editar on public.dmetric_metas
	for all to authenticated
	using ((select public.tem_permissao('dmetric', 'editar')))
	with check ((select public.tem_permissao('dmetric', 'editar')));

-- O padrão de quem não escolheu (igual a METAS_PADRAO no app).
create or replace function public.dmetric_metas_padrao()
returns text[]
language sql
immutable
as $$
	select array['WhatsApp', 'Telefone', 'E-mail', 'Mapa'];
$$;

-- Os destinos de clique que o site já teve (todos os dias contados), os mais clicados primeiro.
create or replace function public.dmetric_destinos_do_site(p_site uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
	select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'cliques', n) order by n desc, valor), '[]'::jsonb)
	from (
		select valor, sum(visualizacoes)::int as n
		from public.dmetric_diario
		where site_id = p_site and dimensao = 'clique' and valor <> ''
		group by valor
		order by 2 desc
		limit 60
	) t;
$$;
grant execute on function public.dmetric_destinos_do_site(uuid) to authenticated;

-- ---------- 2. O recorte do painel numa função só ----------
-- As partes da consulta dinâmica (ver a 0091): a base com as páginas vistas da janela
-- (todas) e as visitas filtradas (quem), e os pedaços para as consultas de cada um. O
-- texto só tem a estrutura (quais filtros existem); os valores vão como parâmetros do
-- EXECUTE — $1 os filtros, $2 o começo, $3 o fim, $4 o site, $5 o degrau —, e o Postgres
-- planeja com eles na mão. Na 0091 os valores iam escritos no texto, e um valor com
-- "{pagina}" no meio (campanha "{{campaign.name}}" acontece) virava outro pedaço da consulta.
create or replace function public.dmetric_recorte_sql(p_site uuid, p_filtros jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $fn$
declare
	f jsonb := coalesce(p_filtros, '{}'::jsonb);
	do_site text := case when p_site is null then '' else ' and site_id = $4' end;
	-- A página do filtro, para as páginas vistas, os cliques e o tempo de tela.
	da_pagina text := '';
	-- Os filtros da pessoa, sobre a linha da chegada (c).
	da_chegada text := '';
	-- Clique e tempo de tela só das visitas filtradas (filtro da pessoa).
	da_pessoa text := '';
	k text;
	base text;
begin
	if f ->> 'pagina' is not null then
		da_pagina := ' and caminho = ($1 ->> ''pagina'')'
			|| case when f ->> 'pagina_site' is not null then ' and site_id = ($1 ->> ''pagina_site'')::uuid' else '' end;
		da_chegada := da_chegada
			|| ' and (c.site_id, c.visitante, c.dia) in (select site_id, visitante, dia from todas where true' || da_pagina || ')';
	end if;
	foreach k in array array['origem', 'campanha', 'pais', 'cidade', 'dispositivo', 'navegador', 'sistema'] loop
		if f ->> k is not null then
			da_chegada := da_chegada || format(' and c.%I = ($1 ->> %L)', k, k);
		end if;
	end loop;
	if f ->> 'clique' is not null then
		da_chegada := da_chegada
			|| ' and (c.site_id, c.visitante, c.dia) in (select site_id, visitante, dia from public.dmetric_recentes'
			|| ' where tipo = ''clique'' and visitante is not null and valor = ($1 ->> ''clique'') and em >= $2 and em < $3'
			|| do_site || ')';
	end if;
	if (f - 'pagina' - 'pagina_site') <> '{}'::jsonb then
		da_pessoa := ' and (site_id, visitante, dia) in (select site_id, visitante, dia from quem)';
	end if;

	base := $q$todas as (
		select site_id, visitante, dia, em, caminho
		from public.dmetric_recentes
		where tipo = 'v' and visitante is not null and em >= $2 and em < $3{site}
	),
	-- As visitas da janela com os dados da chegada. Nos períodos de horas a chegada pode ter
	-- sido antes do começo da janela, no mesmo dia: conta quem viu alguma página dentro dela.
	quem as (
		select c.site_id, c.visitante, c.dia, c.origem, c.campanha, c.pais, c.cidade, c.dispositivo, c.navegador, c.sistema
		from public.dmetric_recentes c
		where c.tipo = 'v' and c.chegada and c.em >= $2 - interval '1 day' and c.em < $3{c_site}
			and (c.em >= $2 or (c.site_id, c.visitante, c.dia) in (
				select site_id, visitante, dia from todas where em < $2 + interval '1 day'))
			{chegada}
	)$q$;
	base := replace(base, '{c_site}', replace(do_site, 'site_id', 'c.site_id'));
	base := replace(base, '{site}', do_site);
	base := replace(base, '{chegada}', da_chegada);
	return jsonb_build_object('base', base, 'site', do_site, 'pagina', da_pagina, 'pessoa', da_pessoa);
end;
$fn$;
revoke all on function public.dmetric_recorte_sql(uuid, jsonb) from public, anon;
grant execute on function public.dmetric_recorte_sql(uuid, jsonb) to authenticated;

-- O painel filtrado (o mesmo da 0091), agora com o recorte da função acima.
create or replace function public.dmetric_eventos_painel(
	p_site uuid,
	p_desde timestamptz,
	p_ate timestamptz,
	p_filtros jsonb,
	p_passo interval default null,
	p_resumo boolean default false
)
returns jsonb
language plpgsql
stable
set search_path = public
set work_mem = '64MB'
set enable_nestloop = off
as $fn$
declare
	-- As partes da consulta com o recorte (dmetric_recorte_sql): a base (todas + quem) e
	-- os pedaços de página e de pessoa para os eventos.
	f jsonb := coalesce(p_filtros, '{}'::jsonb);
	r jsonb := public.dmetric_recorte_sql(p_site, f);
	sql text;
	v jsonb;
begin
	sql := $q$
	with {base},
	-- As páginas vistas dessas visitas (com filtro de página, só as daquela página).
	pv as (
		select t.site_id, t.visitante, t.dia, t.em, t.caminho
		from (select * from todas where true{pagina}) t
		join quem q using (site_id, visitante, dia)
	),
	-- Tempo de tela e cliques: com filtro da pessoa, só os dessas visitas.
	ev as (
		select tipo, site_id, visitante, dia, em, caminho, valor, segundos
		from public.dmetric_recentes
		where tipo in ('tempo', 'clique') and em >= $2 and em < $3{site}{pagina}{pessoa}
	),
	-- Cada visita com quantas páginas viu e quando (dentro da janela) viu a primeira.
	vis as (
		select q.*, p.n, p.primeira
		from quem q
		join (select site_id, visitante, dia, count(*)::int as n, min(em) as primeira from pv group by 1, 2, 3) p
			using (site_id, visitante, dia)
	),
	pag as (select site_id, caminho, visitante, dia, count(*)::int as n from pv group by 1, 2, 3, 4),
	cli as (select valor, site_id, visitante, dia, count(*)::int as n from ev where tipo = 'clique' group by 1, 2, 3, 4),
	itens as (
		select 'pais' as dimensao, null::uuid as site_id, coalesce(pais, '') as valor, count(*)::int as visitas, sum(n)::int as visualizacoes from vis group by 3
		union all select 'cidade', null, coalesce(cidade, ''), count(*)::int, sum(n)::int from vis group by 3
		union all select 'dispositivo', null, coalesce(dispositivo, ''), count(*)::int, sum(n)::int from vis group by 3
		union all select 'navegador', null, coalesce(navegador, ''), count(*)::int, sum(n)::int from vis group by 3
		union all select 'sistema', null, coalesce(sistema, ''), count(*)::int, sum(n)::int from vis group by 3
		-- Origem e campanha contam na chegada, como nos contadores (0072).
		union all select 'origem', null, coalesce(origem, 'Direto'), count(*)::int, count(*)::int from vis group by 3
		union all select 'campanha', null, campanha, count(*)::int, count(*)::int from vis where campanha is not null group by 3
		union all select 'pagina', site_id, caminho, count(*)::int, sum(n)::int from pag group by 2, 3
		-- Clique: quantas vezes e quantas visitas clicaram (o contador do dia não sabe a segunda).
		union all select 'clique', null, valor, (count(*) filter (where visitante is not null))::int, sum(n)::int
		from cli group by 3
	),
	degraus as (
		select g as momento
		from generate_series(
			date_bin($5, $2, timestamptz '2000-01-01'),
			date_bin($5, least(now(), $3 - interval '1 microsecond'), timestamptz '2000-01-01'),
			$5
		) g
	),
	por_degrau as (
		select momento, count(*)::int as visitas, sum(n)::int as visualizacoes
		from (
			select date_bin($5, em, timestamptz '2000-01-01') as momento, site_id, visitante, count(*)::int as n
			from pv
			group by 1, 2, 3
		) x
		group by momento
	)
	select jsonb_build_object(
		'visitas', (select count(*) from vis),
		'visualizacoes', (select count(*) from pv),
		'segundos', coalesce((select sum(segundos) from ev where tipo = 'tempo'), 0),
		'cliques', (select count(*) from ev where tipo = 'clique'),
		'paises', (select count(*) from (select pais from vis where coalesce(pais, '') <> '' group by pais) t),
		'por_dia', coalesce((
			select jsonb_agg(jsonb_build_object('dia', dia, 'visitas', v, 'visualizacoes', vz) order by dia)
			from (select dia, count(*)::int as v, sum(n)::int as vz from vis group by dia) t
		), '[]'::jsonb),
		'serie', {serie},
		'desde_dados', (select min(em) from public.dmetric_recentes where tipo = 'v'),
		'desde_eventos', (select min(em) from public.dmetric_recentes where tipo in ('tempo', 'clique') and visitante is not null)
		{completo}
	)
	$q$;

	-- A linha do tempo em degraus, só quando pedida.
	sql := replace(sql, '{serie}', case when p_passo is null then 'null::jsonb' else $q$coalesce((
			select jsonb_agg(jsonb_build_object('momento', d.momento, 'visitas', coalesce(p.visitas, 0),
				'visualizacoes', coalesce(p.visualizacoes, 0)) order by d.momento)
			from degraus d left join por_degrau p using (momento)
		), '[]'::jsonb)$q$ end);
	-- O painel inteiro (a comparação só quer os totais).
	sql := replace(sql, '{completo}', case when p_resumo then '' else $q$,
		'por_hora', coalesce((
			select jsonb_agg(jsonb_build_object('dow', dow, 'hora', hora, 'visitas', v, 'visualizacoes', vz))
			from (
				select dow, hora, sum(v)::int as v, sum(vz)::int as vz from (
					select extract(dow from dia)::int as dow,
						extract(hour from primeira at time zone 'America/Sao_Paulo')::int as hora, 1 as v, 0 as vz
					from vis
					union all
					select extract(dow from dia)::int, extract(hour from em at time zone 'America/Sao_Paulo')::int, 0, 1
					from pv
				) x
				group by 1, 2
			) t
		), '[]'::jsonb),
		'dimensoes', coalesce((
			select jsonb_object_agg(dimensao, itens) from (
				select dimensao, jsonb_agg(jsonb_build_object('valor', valor, 'site_id', site_id, 'visitas', visitas,
					'visualizacoes', visualizacoes) order by visitas desc, visualizacoes desc) as itens
				from (
					select *, row_number() over (partition by dimensao order by visitas desc, visualizacoes desc) as pos
					from itens
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
				from itens
				group by dimensao
			) t
		), '{}'::jsonb),
		'por_site', coalesce((
			select jsonb_agg(jsonb_build_object('site_id', s.site_id, 'visitas', coalesce(x.v, 0),
				'visualizacoes', coalesce(x.vz, 0), 'segundos', coalesce(e.s, 0), 'cliques', coalesce(e.k, 0)))
			from (select site_id from vis union select site_id from ev) s
			left join (select site_id, count(*)::int as v, sum(n)::int as vz from vis group by site_id) x using (site_id)
			left join (
				select site_id, coalesce(sum(segundos) filter (where tipo = 'tempo'), 0)::bigint as s,
					count(*) filter (where tipo = 'clique')::int as k
				from ev group by site_id
			) e using (site_id)
		), '[]'::jsonb),
		'lugares', jsonb_build_object(
			'paises', coalesce((
				select jsonb_agg(jsonb_build_object('pais', pais, 'visitas', v, 'visualizacoes', vz) order by v desc, vz desc)
				from (select pais, count(*)::int as v, sum(n)::int as vz from vis where coalesce(pais, '') <> '' group by pais) t
			), '[]'::jsonb),
			'cidades', coalesce((
				select jsonb_agg(jsonb_build_object('cidade', cidade, 'pais', nullif(pais, ''), 'visitas', v, 'visualizacoes', vz) order by v desc, vz desc)
				from (
					select cidade, pais, count(*)::int as v, sum(n)::int as vz
					from vis where coalesce(cidade, '') <> ''
					group by cidade, pais
					order by 3 desc
					limit 2000
				) t
			), '[]'::jsonb)
		)$q$ end);
	sql := replace(sql, '{base}', r ->> 'base');
	sql := replace(sql, '{site}', r ->> 'site');
	sql := replace(sql, '{pagina}', r ->> 'pagina');
	sql := replace(sql, '{pessoa}', r ->> 'pessoa');
	execute sql into v using f, p_desde, p_ate, p_site, p_passo;
	return v;
end;
$fn$;
grant execute on function public.dmetric_eventos_painel(uuid, timestamptz, timestamptz, jsonb, interval, boolean) to authenticated;

-- ---------- 3. A conversão ----------
create or replace function public.dmetric_conversao(p_site uuid, p_desde timestamptz, p_ate timestamptz, p_filtros jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
set work_mem = '64MB'
set enable_nestloop = off
as $fn$
declare
	f jsonb := coalesce(p_filtros, '{}'::jsonb);
	r jsonb := public.dmetric_recorte_sql(p_site, f);
	-- Desde quando clique sabe de quem é (0091): antes disso, nenhuma visita "deu resultado"
	-- — a janela começa ali, e a resposta diz que começou.
	v_inicio timestamptz := (select min(em) from public.dmetric_recentes where tipo in ('tempo', 'clique') and visitante is not null);
	v_desde timestamptz;
	sql text;
	v jsonb;
begin
	if v_inicio is null or v_inicio >= p_ate then
		return jsonb_build_object('visitas', 0, 'clicaram', 0, 'converteram', 0, 'metas', '[]'::jsonb, 'grupos', '{}'::jsonb,
			'desde', null, 'cortado', true);
	end if;
	v_desde := greatest(p_desde, v_inicio);
	sql := $q$
	with {base},
	-- As metas de cada site: as escolhidas, ou as do padrão quando ele não escolheu nenhuma.
	metas as (
		select s.id as site_id, m.valor
		from public.dmetric_sites s
		join public.dmetric_metas m on m.site_id = s.id
		union all
		select s.id, d.valor
		from public.dmetric_sites s
		cross join unnest(public.dmetric_metas_padrao()) as d(valor)
		where not exists (select 1 from public.dmetric_metas m where m.site_id = s.id)
	),
	-- Os cliques dessas visitas (na página do filtro, se houver), marcando os que são meta.
	cli as (
		select k.site_id, k.visitante, k.dia, k.valor, mt.valor is not null as meta
		from (
			select site_id, visitante, dia, valor
			from public.dmetric_recentes
			where tipo = 'clique' and visitante is not null and em >= $2 and em < $3{site}{pagina}
		) k
		join quem q using (site_id, visitante, dia)
		left join metas mt on mt.site_id = k.site_id and mt.valor = k.valor
	),
	por_visita as (
		select site_id, visitante, dia, bool_or(meta) as converteu from cli group by 1, 2, 3
	),
	-- As visitas do recorte (quem já é só quem viu página dentro da janela) e o que fizeram.
	vis as (
		select q.*, p.site_id is not null as clicou, coalesce(p.converteu, false) as converteu
		from quem q
		left join por_visita p using (site_id, visitante, dia)
	),
	grupo as (
		select 'origem' as dimensao, coalesce(origem, 'Direto') as valor, count(*)::int as visitas, count(*) filter (where converteu)::int as resultados from vis group by 2
		union all select 'campanha', campanha, count(*)::int, count(*) filter (where converteu)::int from vis where campanha is not null group by 2
		union all select 'cidade', cidade, count(*)::int, count(*) filter (where converteu)::int from vis where coalesce(cidade, '') <> '' group by 2
		union all select 'site', site_id::text, count(*)::int, count(*) filter (where converteu)::int from vis group by 2
	)
	select jsonb_build_object(
		'visitas', (select count(*) from vis),
		'clicaram', (select count(*) from vis where clicou),
		'converteram', (select count(*) from vis where converteu),
		'metas', coalesce((
			select jsonb_agg(jsonb_build_object('valor', valor, 'cliques', n, 'visitas', vz) order by vz desc, n desc)
			from (
				select valor, count(*)::int as n, count(distinct (site_id, visitante, dia))::int as vz
				from cli where meta group by valor
			) t
		), '[]'::jsonb),
		'grupos', coalesce((
			select jsonb_object_agg(dimensao, itens) from (
				select dimensao, jsonb_agg(jsonb_build_object('valor', valor, 'visitas', visitas, 'resultados', resultados)
					order by resultados desc, visitas desc) as itens
				from (
					select *, row_number() over (partition by dimensao order by resultados desc, visitas desc) as pos
					from grupo
				) s
				where pos <= 25
				group by dimensao
			) x
		), '{}'::jsonb)
	)
	$q$;
	sql := replace(sql, '{base}', r ->> 'base');
	sql := replace(sql, '{site}', r ->> 'site');
	sql := replace(sql, '{pagina}', r ->> 'pagina');
	execute sql into v using f, v_desde, p_ate, p_site;
	return v || jsonb_build_object('desde', v_desde, 'cortado', v_desde > p_desde);
end;
$fn$;
grant execute on function public.dmetric_conversao(uuid, timestamptz, timestamptz, jsonb) to authenticated;

notify pgrst, 'reload schema';
