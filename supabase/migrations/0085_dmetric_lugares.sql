-- ============================================================
-- DMetric — página do site: países e cidades, cada cidade no seu país
--
-- A cidade é contada como "Sorocaba · SP" (cidade · estado), sem o país — e
-- sigla de estado se repete entre países ("PA" é Pará e Pensilvânia). Para a
-- página de cada site listar as cidades dentro do país certo:
--
--   dmetric_cidades_pais: o país de cada cidade. A coleta grava a cada visita
--     (dmetric_coletar, abaixo). O passado sai do que o banco já sabe: a lista
--     recente (48 h, que tem país e cidade em cada visita) e os dias em que um
--     site só teve visita de um país (todas as cidades daquele dia são dele).
--   dmetric_lugares: todos os países e todas as cidades de um site no período,
--     sem o corte de 25 do painel; na última hora e nas 24 horas, da lista
--     recente.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0085_dmetric_lugares.sql
-- ============================================================

create table if not exists public.dmetric_cidades_pais (
	cidade text primary key,
	pais text not null,
	atualizado_em timestamptz not null default now()
);
alter table public.dmetric_cidades_pais enable row level security;
drop policy if exists dmetric_cidades_pais_ver on public.dmetric_cidades_pais;
create policy dmetric_cidades_pais_ver on public.dmetric_cidades_pais
	for select to authenticated using (public.tem_permissao('dmetric', 'ver'));

-- O passado. 1) A lista recente: país e cidade de cada visita (a mais nova vale).
insert into public.dmetric_cidades_pais (cidade, pais)
select distinct on (cidade) cidade, pais
from public.dmetric_recentes
where tipo = 'v' and coalesce(cidade, '') <> '' and coalesce(pais, '') <> ''
order by cidade, em desc
on conflict (cidade) do nothing;

-- 2) Dia de um site que só teve visita de um país: as cidades daquele dia são dele.
insert into public.dmetric_cidades_pais (cidade, pais)
select distinct on (c.valor) c.valor, p.pais
from public.dmetric_diario c
join (
	select site_id, dia, min(valor) as pais
	from public.dmetric_diario
	where dimensao = 'pais' and valor <> ''
	group by site_id, dia
	having count(*) = 1
) p on p.site_id = c.site_id and p.dia = c.dia
where c.dimensao = 'cidade' and c.valor <> ''
order by c.valor, c.dia desc
on conflict (cidade) do nothing;

-- 3) Sigla de estado brasileiro num dia em que o site teve visita do Brasil: é
-- do Brasil. As siglas que os EUA também usam (AL, MA, MT, MS, PA, PR, SC) só
-- valem nos dias sem visita dos EUA.
insert into public.dmetric_cidades_pais (cidade, pais)
select distinct c.valor, 'BR'
from public.dmetric_diario c
join lateral (
	select array_agg(p.valor) as paises
	from public.dmetric_diario p
	where p.site_id = c.site_id and p.dia = c.dia and p.dimensao = 'pais' and p.valor <> ''
) d on true
where c.dimensao = 'cidade' and c.valor <> ''
	and 'BR' = any(d.paises)
	and split_part(c.valor, ' · ', 2) in ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
		'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')
	and (not ('US' = any(d.paises)) or split_part(c.valor, ' · ', 2) not in ('AL', 'MA', 'MT', 'MS', 'PA', 'PR', 'SC'))
on conflict (cidade) do nothing;

-- ---------- Coleta: a mesma da 0080, mais o país da cidade ----------
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

	-- Faxina de vez em quando: vistos de anteontem para trás e recentes de mais de 48 h.
	if random() < 0.02 then
		delete from public.dmetric_vistos where dia < v_dia - 1;
		delete from public.dmetric_recentes where em < now() - interval '48 hours';
	end if;

	return true;
end;
$$;

-- ---------- Países e cidades de um site ----------
-- p_desde preenchido (última hora, 24 horas): da lista recente, que tem o país
-- de cada visita. Senão, dos contadores do dia, com o país de cada cidade.
create or replace function public.dmetric_lugares(p_site uuid, p_de date, p_ate date, p_desde timestamptz default null)
returns jsonb
language sql
stable
set search_path = public
as $$
	with recente as (
		select pais, cidade, count(distinct (site_id, visitante))::int as visitas, count(*)::int as visualizacoes
		from public.dmetric_recentes
		where p_desde is not null and tipo = 'v' and em >= p_desde and (p_site is null or site_id = p_site)
		group by pais, cidade
	),
	paises as (
		select valor as pais, sum(visitas)::int as visitas, sum(visualizacoes)::int as visualizacoes
		from public.dmetric_diario
		where p_desde is null and dimensao = 'pais' and valor <> ''
			and dia between p_de and p_ate and (p_site is null or site_id = p_site)
		group by valor
		union all
		select pais, sum(visitas)::int, sum(visualizacoes)::int from recente where coalesce(pais, '') <> '' group by pais
	),
	cidades as (
		select d.valor as cidade, cp.pais, sum(d.visitas)::int as visitas, sum(d.visualizacoes)::int as visualizacoes
		from public.dmetric_diario d
		left join public.dmetric_cidades_pais cp on cp.cidade = d.valor
		where p_desde is null and d.dimensao = 'cidade' and d.valor <> ''
			and d.dia between p_de and p_ate and (p_site is null or d.site_id = p_site)
		group by d.valor, cp.pais
		union all
		select cidade, nullif(pais, ''), visitas, visualizacoes from recente where coalesce(cidade, '') <> ''
	)
	select jsonb_build_object(
		'paises', coalesce((
			select jsonb_agg(jsonb_build_object('pais', pais, 'visitas', visitas, 'visualizacoes', visualizacoes)
				order by visitas desc, visualizacoes desc)
			from paises
		), '[]'::jsonb),
		'cidades', coalesce((
			select jsonb_agg(jsonb_build_object('cidade', cidade, 'pais', pais, 'visitas', visitas, 'visualizacoes', visualizacoes)
				order by visitas desc, visualizacoes desc)
			from (select * from cidades order by visitas desc, visualizacoes desc limit 2000) t
		), '[]'::jsonb)
	);
$$;
grant execute on function public.dmetric_lugares(uuid, date, date, timestamptz) to authenticated;

notify pgrst, 'reload schema';
