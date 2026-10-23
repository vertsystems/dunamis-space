-- ============================================================
-- DMetric — filtros e comparação de períodos
--
-- Clicar em "Instagram" e ver o painel só de quem veio do Instagram (as
-- cidades, as páginas, os cliques dessas pessoas) não sai dos contadores do
-- dia (dmetric_diario): eles guardam cada lista separada, sem dizer quais
-- cidades vieram de qual origem. Sai da lista de acessos (dmetric_recentes),
-- uma linha por página vista, clique e tempo de tela, que até aqui durava 48 h.
--
--   1. A lista de acessos ganha o dia (em Brasília) e a marca de chegada (a
--      primeira página do visitante no dia), gravados na coleta: o painel
--      filtrado não precisa reordenar a lista inteira a cada consulta.
--   2. Ela passa a valer por 13 meses (a faxina da coleta). Pouca coisa: ~400
--      linhas por dia hoje. Sem IP; o visitante é o mesmo hash diário de
--      sempre, que não se liga de um dia para o outro.
--   3. Clique e tempo de tela guardam o visitante (dmetric_evento ganha
--      p_visitante), para o filtro valer também para eles. Os de antes ficam
--      sem dono: com filtro de pessoa, clique e tempo contam a partir daqui.
--   4. dmetric_eventos_painel: o painel montado da lista de acessos, com
--      filtros (origem, campanha, país, cidade, página, aparelho, navegador,
--      sistema, clique). A visita é filtrada pelos dados da chegada; página
--      filtra as páginas vistas; clique filtra quem clicou.
--   5. dmetric_resumo: os totais de um período pelos contadores, para comparar
--      com o período anterior sem filtro — com o último dia cortado na hora de
--      agora.
--
-- Os filtros valem a partir de quando a lista de acessos começa (21/10/2026):
-- antes disso existiam só os contadores do dia. O painel sem filtro continua
-- nos contadores, com tudo desde 10/10.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0091_dmetric_filtros_e_comparacao.sql
-- ============================================================

-- ---------- 1. O dia e a chegada de cada acesso ----------
alter table public.dmetric_recentes add column if not exists dia date;
alter table public.dmetric_recentes add column if not exists chegada boolean not null default false;

-- O dia sai sempre do próprio horário, quem quer que grave a linha.
create or replace function public.dmetric_recentes_dia()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	new.dia := (new.em at time zone 'America/Sao_Paulo')::date;
	return new;
end;
$$;
drop trigger if exists dmetric_recentes_dia on public.dmetric_recentes;
create trigger dmetric_recentes_dia before insert or update of em on public.dmetric_recentes
	for each row execute function public.dmetric_recentes_dia();

update public.dmetric_recentes set dia = (em at time zone 'America/Sao_Paulo')::date where dia is null;
alter table public.dmetric_recentes alter column dia set not null;

-- As linhas de antes: a chegada é a primeira página de cada visitante em cada dia — só nos
-- dias em que nenhuma linha tem a marca ainda.
with primeiras as (
	select distinct on (site_id, visitante, dia) id,
		bool_or(chegada) over (partition by site_id, visitante, dia) as ja
	from public.dmetric_recentes
	where tipo = 'v' and visitante is not null
	order by site_id, visitante, dia, em
)
update public.dmetric_recentes r set chegada = true
from primeiras p
where r.id = p.id and not p.ja;

-- ---------- 2. Coleta (a mesma da 0085): a chegada marcada e a faxina a 13 meses ----------
create or replace function public.dmetric_coletar(
	p_segredo text,
	p_chave text,
	p_host text,
	p_caminho text,
	p_origem text,
	p_campanha text,
	p_pais text,
	p_cidade text,
	p_dispositivo text,
	p_navegador text,
	p_sistema text,
	p_visitante text,
	p_titulo text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_site uuid;
	v_caminho_site text;
	v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
	v_nova boolean;
	v_n integer;
	v_pais text := upper(left(coalesce(p_pais, ''), 2));
	v_cidade text := left(coalesce(p_cidade, ''), 80);
	v_caminho text := left(coalesce(nullif(p_caminho, ''), '/'), 200);
	v_origem text := left(coalesce(nullif(p_origem, ''), 'Direto'), 120);
	v_titulo text := nullif(left(btrim(coalesce(p_titulo, '')), 150), '');
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return false;
	end if;
	v_site := public.dmetric_site(p_chave, p_host, p_caminho);
	if v_site is null then
		return false;
	end if;

	insert into public.dmetric_vistos (site_id, dia, visitante)
		values (v_site, v_dia, left(p_visitante, 64))
		on conflict do nothing;
	get diagnostics v_n = row_count;
	v_nova := v_n > 0;

	insert into public.dmetric_diario as d (site_id, dia, dimensao, valor, visitas, visualizacoes)
	select v_site, v_dia, x.dimensao, x.valor, case when v_nova then 1 else 0 end, 1
	from (values
		('total', ''),
		('pais', v_pais),
		('cidade', v_cidade),
		('pagina', v_caminho),
		-- Hora do dia em Brasília: base do mapa de horários de pico (0080).
		('hora', to_char(now() at time zone 'America/Sao_Paulo', 'HH24')),
		('dispositivo', left(coalesce(p_dispositivo, ''), 30)),
		('navegador', left(coalesce(p_navegador, ''), 30)),
		('sistema', left(coalesce(p_sistema, ''), 30))
	) as x(dimensao, valor)
	-- Origem e campanha só contam na chegada (ver 0072).
	union all
	select v_site, v_dia, 'origem', v_origem, 1, 1
	where v_nova
	union all
	select v_site, v_dia, 'campanha', left(p_campanha, 120), 1, 1
	where v_nova and coalesce(p_campanha, '') <> ''
	on conflict (site_id, dia, dimensao, valor) do update
		set visitas = d.visitas + excluded.visitas,
			visualizacoes = d.visualizacoes + excluded.visualizacoes;

	-- chegada: a primeira página do visitante no dia (0091) — é dela que saem origem e campanha.
	insert into public.dmetric_recentes
		(site_id, tipo, visitante, caminho, origem, campanha, pais, cidade, dispositivo, navegador, sistema, chegada)
	values
		(v_site, 'v', left(p_visitante, 64), v_caminho, v_origem, nullif(left(coalesce(p_campanha, ''), 120), ''),
		 v_pais, v_cidade, left(coalesce(p_dispositivo, ''), 30), left(coalesce(p_navegador, ''), 30),
		 left(coalesce(p_sistema, ''), 30), v_nova);

	-- O país de cada cidade: a cidade vem como "Sorocaba · SP", sem o país, e a
	-- página do site agrupa as cidades por país (0085).
	if v_cidade <> '' and v_pais <> '' then
		insert into public.dmetric_cidades_pais as cp (cidade, pais) values (v_cidade, v_pais)
			on conflict (cidade) do update set pais = excluded.pais, atualizado_em = now()
				where cp.pais is distinct from excluded.pais;
	end if;

	-- Título: da página (sempre) e do site (o da página de entrada dele — "/"
	-- na raiz, "/lojasmari" no site dnms.fun/lojasmari —, ou o primeiro que
	-- aparecer). Só grava quando muda.
	if v_titulo is not null then
		insert into public.dmetric_paginas as pg (site_id, caminho, titulo)
			values (v_site, v_caminho, v_titulo)
			on conflict (site_id, caminho) do update
				set titulo = excluded.titulo, atualizado_em = now()
				where pg.titulo is distinct from excluded.titulo;
		select caminho into v_caminho_site from public.dmetric_sites where id = v_site;
		update public.dmetric_sites set titulo = v_titulo
			where id = v_site and titulo is distinct from v_titulo
				and (titulo is null or rtrim(lower(v_caminho), '/') = rtrim('/' || coalesce(v_caminho_site, ''), '/'));
	end if;

	update public.dmetric_sites set ultima_visita = now()
		where id = v_site and (ultima_visita is null or ultima_visita < now() - interval '1 minute');

	-- Faxina de vez em quando: vistos de anteontem para trás e acessos de mais de 13 meses
	-- (0091: a lista de acessos é a base dos filtros e da comparação com o ano anterior).
	if random() < 0.02 then
		delete from public.dmetric_vistos where dia < v_dia - 1;
		delete from public.dmetric_recentes where em < now() - interval '400 days';
	end if;

	return true;
end;
$$;

-- ---------- 3. Clique e tempo de tela com o visitante ----------
-- A assinatura antiga (sem p_visitante) sai; a nova tem p_visitante com padrão, então a
-- rota antiga (sem esse parâmetro) continua funcionando até o deploy novo.
drop function if exists public.dmetric_evento(text, text, text, text, text, text, integer);
create or replace function public.dmetric_evento(
	p_segredo text,
	p_chave text,
	p_host text,
	p_caminho text,
	p_tipo text,
	p_valor text,
	p_segundos integer,
	p_visitante text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_site uuid;
	v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
	v_seg integer := least(greatest(coalesce(p_segundos, 0), 0), 1800);
	v_caminho text := left(coalesce(nullif(p_caminho, ''), '/'), 200);
	v_visitante text := nullif(left(coalesce(p_visitante, ''), 64), '');
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return false;
	end if;
	v_site := public.dmetric_site(p_chave, p_host, p_caminho);
	if v_site is null then
		return false;
	end if;

	if p_tipo = 'tempo' and v_seg > 0 then
		insert into public.dmetric_diario as d (site_id, dia, dimensao, valor, segundos)
		values
			(v_site, v_dia, 'total', '', v_seg),
			(v_site, v_dia, 'pagina', v_caminho, v_seg)
		on conflict (site_id, dia, dimensao, valor) do update
			set segundos = d.segundos + excluded.segundos;
		insert into public.dmetric_recentes (site_id, tipo, visitante, caminho, segundos)
			values (v_site, 'tempo', v_visitante, v_caminho, v_seg);
		return true;
	end if;

	if p_tipo = 'clique' and coalesce(p_valor, '') <> '' then
		insert into public.dmetric_diario as d (site_id, dia, dimensao, valor, visualizacoes)
		values (v_site, v_dia, 'clique', left(p_valor, 80), 1)
		on conflict (site_id, dia, dimensao, valor) do update
			set visualizacoes = d.visualizacoes + 1;
		insert into public.dmetric_recentes (site_id, tipo, visitante, caminho, valor)
			values (v_site, 'clique', v_visitante, v_caminho, left(p_valor, 80));
		return true;
	end if;

	return false;
end;
$$;
revoke all on function public.dmetric_evento(text, text, text, text, text, text, integer, text) from public;
grant execute on function public.dmetric_evento(text, text, text, text, text, text, integer, text) to anon, authenticated, service_role;

-- ---------- 4. O painel montado da lista de acessos, com filtros ----------
drop function if exists public.dmetric_eventos_visitas(uuid, timestamptz, timestamptz, jsonb);

-- No mesmo formato de dmetric_painel (0088), mais: cliques (o total), paises (quantos),
-- por_site (a tabela de sites), lugares (países e cidades, sem corte), desde_dados (onde a
-- lista de acessos começa) e desde_eventos (desde quando clique e tempo de tela sabem de quem
-- são). p_passo: a linha do tempo em degraus (última hora, 24 horas). p_resumo: só os totais,
-- a linha por dia e a série — é o que a comparação usa.
--
-- O filtro de página é da página: conta as vistas, os cliques e o tempo DELA. Os outros são
-- da pessoa: contam tudo o que fez quem chegou pelo Instagram, de São Paulo, quem clicou no
-- WhatsApp… — e aí clique e tempo de tela só entram quando se sabe de quem são.
--
-- A consulta é montada aqui, só com os filtros que vieram e com os valores já escritos
-- (format %L, que põe as aspas): numa função SQL comum o Postgres planeja sem saber os
-- valores, e com um ano de dados escolhia laço dentro de laço — mais de 60 s no ensaio. Sem
-- laço (enable_nestloop) e com memória para as tabelas de hash, as junções são todas por hash.
-- As contagens de "quantas visitas" agrupam duas vezes (por visita, depois pelo item) em vez
-- de count(distinct), que ordenaria a lista inteira.
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
	f jsonb := coalesce(p_filtros, '{}'::jsonb);
	desde text := quote_literal(p_desde) || '::timestamptz';
	ate text := quote_literal(p_ate) || '::timestamptz';
	do_site text := case when p_site is null then '' else format(' and site_id = %L::uuid', p_site) end;
	-- A página do filtro, para as páginas vistas, os cliques e o tempo de tela.
	da_pagina text := '';
	-- Os filtros da pessoa, sobre a linha da chegada (c).
	da_chegada text := '';
	-- Clique e tempo de tela só das visitas filtradas (filtro da pessoa).
	da_pessoa text := '';
	k text;
	sql text;
	v jsonb;
begin
	if f ->> 'pagina' is not null then
		da_pagina := format(' and caminho = %L', f ->> 'pagina')
			|| case when f ->> 'pagina_site' is not null then format(' and site_id = %L::uuid', f ->> 'pagina_site') else '' end;
		da_chegada := da_chegada
			|| format(' and (c.site_id, c.visitante, c.dia) in (select site_id, visitante, dia from todas where true%s)', da_pagina);
	end if;
	foreach k in array array['origem', 'campanha', 'pais', 'cidade', 'dispositivo', 'navegador', 'sistema'] loop
		if f ->> k is not null then
			da_chegada := da_chegada || format(' and c.%I = %L', k, f ->> k);
		end if;
	end loop;
	if f ->> 'clique' is not null then
		da_chegada := da_chegada || format(
			' and (c.site_id, c.visitante, c.dia) in (select site_id, visitante, dia from public.dmetric_recentes'
			|| ' where tipo = %L and visitante is not null and valor = %L and em >= %s and em < %s%s)',
			'clique', f ->> 'clique', desde, ate, do_site);
	end if;
	if (f - 'pagina' - 'pagina_site') <> '{}'::jsonb then
		da_pessoa := ' and (site_id, visitante, dia) in (select site_id, visitante, dia from quem)';
	end if;

	sql := $q$
	with todas as (
		select site_id, visitante, dia, em, caminho
		from public.dmetric_recentes
		where tipo = 'v' and visitante is not null and em >= {desde} and em < {ate}{site}
	),
	-- As visitas da janela com os dados da chegada. Nos períodos de horas a chegada pode ter
	-- sido antes do começo da janela, no mesmo dia: conta quem viu alguma página dentro dela.
	quem as (
		select c.site_id, c.visitante, c.dia, c.origem, c.campanha, c.pais, c.cidade, c.dispositivo, c.navegador, c.sistema
		from public.dmetric_recentes c
		where c.tipo = 'v' and c.chegada and c.em >= {desde} - interval '1 day' and c.em < {ate}{c_site}
			and (c.em >= {desde} or (c.site_id, c.visitante, c.dia) in (
				select site_id, visitante, dia from todas where em < {desde} + interval '1 day'))
			{chegada}
	),
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
		where tipo in ('tempo', 'clique') and em >= {desde} and em < {ate}{site}{pagina}{pessoa}
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
			date_bin({passo}, {desde}, timestamptz '2000-01-01'),
			date_bin({passo}, least(now(), {ate} - interval '1 microsecond'), timestamptz '2000-01-01'),
			{passo}
		) g
	),
	por_degrau as (
		select momento, count(*)::int as visitas, sum(n)::int as visualizacoes
		from (
			select date_bin({passo}, em, timestamptz '2000-01-01') as momento, site_id, visitante, count(*)::int as n
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
	sql := replace(sql, '{passo}', coalesce(quote_literal(p_passo) || '::interval', 'null::interval'));
	sql := replace(sql, '{desde}', desde);
	sql := replace(sql, '{ate}', ate);
	sql := replace(sql, '{c_site}', replace(do_site, 'site_id', 'c.site_id'));
	sql := replace(sql, '{site}', do_site);
	sql := replace(sql, '{chegada}', da_chegada);
	sql := replace(sql, '{pagina}', da_pagina);
	sql := replace(sql, '{pessoa}', da_pessoa);
	execute sql into v;
	return v;
end;
$fn$;
grant execute on function public.dmetric_eventos_painel(uuid, timestamptz, timestamptz, jsonb, interval, boolean) to authenticated;

-- ---------- 5. Os totais de um período pelos contadores (a comparação sem filtro) ----------
-- p_ate_hora: o último dia vai só até essa hora de Brasília (14,5 = 14h30). Os últimos 7 dias
-- de hoje às 14h30 terminam no meio de hoje; os 7 de antes têm de terminar no mesmo ponto do
-- dia, senão a comparação sai sempre para baixo. Visitas e páginas vistas são cortadas pelos
-- contadores de hora (0080); tempo de tela e cliques não têm hora — entram na mesma proporção
-- das páginas vistas daquele dia.
create or replace function public.dmetric_resumo(p_site uuid, p_de date, p_ate date, p_ate_hora numeric default null)
returns jsonb
language sql
stable
set search_path = public
as $$
	with base as (
		select dia, dimensao, valor, visitas, visualizacoes, segundos
		from public.dmetric_diario
		where dia between p_de and p_ate and (p_site is null or site_id = p_site)
			and dimensao in ('total', 'clique', 'pais', 'hora')
	),
	ultimo as (
		select
			coalesce(sum(visitas) filter (where dimensao = 'total'), 0) as v,
			coalesce(sum(visualizacoes) filter (where dimensao = 'total'), 0) as vz,
			coalesce(sum(segundos) filter (where dimensao = 'total'), 0) as s,
			coalesce(sum(visualizacoes) filter (where dimensao = 'clique'), 0) as k,
			coalesce(sum(visitas * least(1, greatest(0, p_ate_hora - valor::int))) filter (where dimensao = 'hora'), 0) as v_corte,
			coalesce(sum(visualizacoes * least(1, greatest(0, p_ate_hora - valor::int))) filter (where dimensao = 'hora'), 0) as vz_corte,
			coalesce(sum(visualizacoes) filter (where dimensao = 'hora'), 0) as vz_hora
		from base
		where dia = p_ate and p_ate_hora is not null
	),
	-- A fração do último dia que fica (sem contador de hora, a fração do relógio).
	corte as (
		select u.*, case when u.vz_hora > 0 then u.vz_corte / u.vz_hora else least(1, p_ate_hora / 24) end as fracao
		from ultimo u
	),
	antes as (
		select
			coalesce(sum(visitas) filter (where dimensao = 'total'), 0) as v,
			coalesce(sum(visualizacoes) filter (where dimensao = 'total'), 0) as vz,
			coalesce(sum(segundos) filter (where dimensao = 'total'), 0) as s,
			coalesce(sum(visualizacoes) filter (where dimensao = 'clique'), 0) as k
		from base
		where p_ate_hora is null or dia < p_ate
	)
	select jsonb_build_object(
		'visitas', round(a.v + coalesce(case when c.vz_hora > 0 then c.v_corte else c.v * c.fracao end, 0))::int,
		'visualizacoes', round(a.vz + coalesce(case when c.vz_hora > 0 then c.vz_corte else c.vz * c.fracao end, 0))::int,
		'segundos', round(a.s + coalesce(c.s * c.fracao, 0))::bigint,
		'cliques', round(a.k + coalesce(c.k * c.fracao, 0))::int,
		'paises', (select count(distinct valor) from base where dimensao = 'pais' and valor <> '')
	)
	from antes a
	left join corte c on true;
$$;
grant execute on function public.dmetric_resumo(uuid, date, date, numeric) to authenticated;

notify pgrst, 'reload schema';
