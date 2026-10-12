-- ============================================================
-- DMetric — horários de pico e "agora no site"
--
-- HORÁRIOS DE PICO: cada visita passa a contar também na dimensão 'hora' (a
-- hora do dia em Brasília, "00" a "23"), dentro do contador do dia. O painel
-- cruza o dia da semana (do próprio `dia`) com a hora e mostra o mapa de calor
-- de quando as pessoas chegam. São no máximo 24 linhas por site e dia.
-- O que a lista recente (48 h) ainda guarda é preenchido aqui; antes disso não
-- há hora registrada.
--
-- AGORA NO SITE: quem abriu uma página nos últimos 5 minutos, lido da lista
-- recente (0077) — por país (o mapa pisca), página e cidade.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0080_dmetric_horarios_agora.sql
-- ============================================================

-- ---------- Coleta: + a hora ----------
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

	insert into public.dmetric_recentes
		(site_id, tipo, visitante, caminho, origem, campanha, pais, cidade, dispositivo, navegador, sistema)
	values
		(v_site, 'v', left(p_visitante, 64), v_caminho, v_origem, nullif(left(coalesce(p_campanha, ''), 120), ''),
		 v_pais, v_cidade, left(coalesce(p_dispositivo, ''), 30), left(coalesce(p_navegador, ''), 30),
		 left(coalesce(p_sistema, ''), 30));

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

	-- Faxina de vez em quando: vistos de anteontem para trás e recentes de mais de 48 h.
	if random() < 0.02 then
		delete from public.dmetric_vistos where dia < v_dia - 1;
		delete from public.dmetric_recentes where em < now() - interval '48 hours';
	end if;

	return true;
end;
$$;

-- ---------- Preenche as horas com o que a lista recente ainda tem ----------
-- Visita = a primeira página de cada visitante no dia (como nos contadores).
insert into public.dmetric_diario (site_id, dia, dimensao, valor, visitas, visualizacoes)
select site_id, dia, 'hora', hora, count(*) filter (where primeira)::int, count(*)::int
from (
	select site_id,
		(em at time zone 'America/Sao_Paulo')::date as dia,
		to_char(em at time zone 'America/Sao_Paulo', 'HH24') as hora,
		row_number() over (partition by site_id, visitante, (em at time zone 'America/Sao_Paulo')::date order by em) = 1 as primeira
	from public.dmetric_recentes
	where tipo = 'v'
) x
group by site_id, dia, hora
on conflict (site_id, dia, dimensao, valor) do nothing;

-- ---------- Painel: + horários de pico ----------
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
	dims as (
		select dimensao, jsonb_agg(jsonb_build_object('valor', valor, 'site_id', site_id, 'visitas', visitas,
			'visualizacoes', visualizacoes, 'segundos', segundos) order by visitas desc, visualizacoes desc) as itens
		from (
			select dimensao, case when dimensao = 'pagina' then site_id end as site_id, valor,
				sum(visitas)::int as visitas, sum(visualizacoes)::int as visualizacoes, sum(segundos)::bigint as segundos,
				row_number() over (partition by dimensao order by sum(visitas) desc, sum(visualizacoes) desc) as pos
			from base
			where dimensao not in ('total', 'hora')
			group by dimensao, 2, valor
		) s
		where dimensao = 'pais' or pos <= 25
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

-- ---------- Agora no site ----------
-- Pessoas que abriram uma página nos últimos 5 minutos. Roda como quem chama
-- (RLS do módulo 'dmetric' na lista recente).
create or replace function public.dmetric_agora(p_site uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
	with v as (
		select * from public.dmetric_recentes
		where tipo = 'v' and em >= now() - interval '5 minutes'
			and (p_site is null or site_id = p_site)
	),
	-- A página mais recente de cada pessoa: é onde ela está agora.
	ultima as (
		select distinct on (site_id, visitante) * from v order by site_id, visitante, em desc
	)
	select jsonb_build_object(
		'pessoas', (select count(*) from ultima),
		'paises', coalesce((select jsonb_agg(jsonb_build_object('pais', pais, 'pessoas', n) order by n desc)
			from (select pais, count(*)::int n from ultima where coalesce(pais, '') <> '' group by pais) t), '[]'::jsonb),
		'paginas', coalesce((select jsonb_agg(jsonb_build_object('site_id', site_id, 'caminho', caminho, 'pessoas', n) order by n desc)
			from (select site_id, caminho, count(*)::int n from ultima group by site_id, caminho) t), '[]'::jsonb),
		'cidades', coalesce((select jsonb_agg(jsonb_build_object('cidade', cidade, 'pessoas', n) order by n desc)
			from (select cidade, count(*)::int n from ultima where coalesce(cidade, '') <> '' group by cidade) t), '[]'::jsonb)
	);
$$;
grant execute on function public.dmetric_agora(uuid) to authenticated;

notify pgrst, 'reload schema';
