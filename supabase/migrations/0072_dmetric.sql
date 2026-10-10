-- ============================================================
-- DMetric — acessos dos sites da Dunamis e dos clientes
--
-- Um "Google Analytics" nosso: cada site recebe um script (static/dm.js) que
-- avisa a rota /api/dm a cada página vista, e a rota grava aqui. O painel fica
-- em /dtools/dmetric, na Home, logo abaixo do Pag's Up.
--
-- PESO: nada de uma linha por acesso. A visita já chega CONTADA: cada dia tem um
-- contador por país, cidade, página, origem, aparelho, navegador e sistema
-- (dmetric_diario). Um site com mil acessos por dia ocupa algumas centenas de
-- linhas no mês, não trinta mil. O preço é não poder cruzar dimensões depois
-- (ex.: "páginas vistas só pelos visitantes da Irlanda") — se isso fizer falta,
-- acrescenta-se a dimensão cruzada daqui para a frente.
--
-- PRIVACIDADE: sem cookie e sem guardar IP. O visitante é um hash de (dia,
-- site, IP, navegador) com segredo do servidor; ele muda todo dia e só serve
-- para não contar duas vezes a mesma pessoa no mesmo dia (dmetric_vistos, que
-- guarda só hoje e ontem). "Visita" = uma pessoa num dia.
--
-- HISTÓRICO: os números já coletados no Google Analytics entram em
-- dmetric_historico (seed abaixo: propriedade DNMS-HUB, 2025, por país).
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0072_dmetric.sql
-- ============================================================

-- ---------- Sites ----------
create table if not exists public.dmetric_sites (
	id uuid primary key default gen_random_uuid(),
	nome text not null,
	-- Domínio de onde o script pode contar (sem www; subdomínios valem). Nulo =
	-- aceita de qualquer lugar, útil para testar antes de publicar.
	dominio text,
	-- Vai no snippet (data-site). Público por natureza: quem tem só a chave não
	-- lê nada, só consegue contar visita — e só a partir do domínio do site.
	chave text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
	ativo boolean not null default true,
	ultima_visita timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ---------- Contadores do dia ----------
create table if not exists public.dmetric_diario (
	site_id uuid not null references public.dmetric_sites (id) on delete cascade,
	dia date not null,
	-- total | pais | cidade | pagina | origem | dispositivo | navegador | sistema
	dimensao text not null,
	valor text not null default '',
	-- Pessoas que chegaram naquele dia (na página: as que ENTRARAM por ela).
	visitas integer not null default 0,
	-- Páginas vistas.
	visualizacoes integer not null default 0,
	primary key (site_id, dia, dimensao, valor)
);
create index if not exists idx_dmetric_diario_dia on public.dmetric_diario (dia, dimensao);

-- ---------- Quem já foi contado hoje (só hoje e ontem) ----------
create table if not exists public.dmetric_vistos (
	site_id uuid not null references public.dmetric_sites (id) on delete cascade,
	dia date not null,
	visitante text not null,
	primary key (site_id, dia, visitante)
);

-- ---------- Histórico importado (Google Analytics) ----------
create table if not exists public.dmetric_historico (
	id uuid primary key default gen_random_uuid(),
	fonte text not null default 'Google Analytics',
	propriedade text not null,
	-- Nulo: o histórico é da propriedade inteira, não de um site do DMetric.
	site_id uuid references public.dmetric_sites (id) on delete set null,
	inicio date not null,
	fim date not null,
	-- Sigla ISO de 2 letras; nulo = "(not set)" do GA.
	pais text,
	pais_nome text not null,
	usuarios integer not null default 0,
	novos_usuarios integer not null default 0,
	sessoes_engajadas integer not null default 0,
	taxa_engajamento numeric(5, 2),
	tempo_medio_s integer,
	eventos integer not null default 0,
	created_at timestamptz not null default now(),
	unique (propriedade, inicio, fim, pais_nome)
);

-- ---------- updated_at + RLS (pelo módulo 'dmetric' das Permissões) ----------
drop trigger if exists trg_dmetric_sites_updated on public.dmetric_sites;
create trigger trg_dmetric_sites_updated before update on public.dmetric_sites
	for each row execute function public.set_updated_at();

do $$
declare t text;
begin
	foreach t in array array['dmetric_sites', 'dmetric_diario', 'dmetric_historico', 'dmetric_vistos'] loop
		execute format('alter table public.%I enable row level security;', t);
	end loop;
end $$;

-- Sites e histórico: ver com 'ver', mexer com 'editar'.
drop policy if exists dmetric_sites_ver on public.dmetric_sites;
create policy dmetric_sites_ver on public.dmetric_sites
	for select to authenticated using (public.tem_permissao('dmetric', 'ver'));
drop policy if exists dmetric_sites_editar on public.dmetric_sites;
create policy dmetric_sites_editar on public.dmetric_sites
	for all to authenticated
	using (public.tem_permissao('dmetric', 'editar'))
	with check (public.tem_permissao('dmetric', 'editar'));

drop policy if exists dmetric_historico_ver on public.dmetric_historico;
create policy dmetric_historico_ver on public.dmetric_historico
	for select to authenticated using (public.tem_permissao('dmetric', 'ver'));
drop policy if exists dmetric_historico_editar on public.dmetric_historico;
create policy dmetric_historico_editar on public.dmetric_historico
	for all to authenticated
	using (public.tem_permissao('dmetric', 'editar'))
	with check (public.tem_permissao('dmetric', 'editar'));

-- Contadores: só leitura no app. Quem escreve é dmetric_coletar, pela rota.
drop policy if exists dmetric_diario_ver on public.dmetric_diario;
create policy dmetric_diario_ver on public.dmetric_diario
	for select to authenticated using (public.tem_permissao('dmetric', 'ver'));
-- dmetric_vistos: sem policy nenhuma — nem o app lê.

-- ---------- Registrar uma página vista ----------
-- Chamada só pela rota /api/dm com a service role (o grant abaixo). Devolve
-- false quando a chave não existe, o site está pausado ou o domínio não bate.
create or replace function public.dmetric_coletar(
	p_chave text,
	p_host text,
	p_caminho text,
	p_origem text,
	p_pais text,
	p_cidade text,
	p_dispositivo text,
	p_navegador text,
	p_sistema text,
	p_visitante text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_site public.dmetric_sites%rowtype;
	v_host text := lower(coalesce(p_host, ''));
	v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
	v_nova boolean;
	v_n integer;
begin
	select * into v_site from public.dmetric_sites where chave = p_chave and ativo;
	if not found then
		return false;
	end if;

	v_host := regexp_replace(v_host, '^www\.', '');
	if v_site.dominio is not null and v_site.dominio <> ''
		and v_host <> v_site.dominio and v_host not like '%.' || v_site.dominio then
		return false;
	end if;

	insert into public.dmetric_vistos (site_id, dia, visitante)
		values (v_site.id, v_dia, left(p_visitante, 64))
		on conflict do nothing;
	get diagnostics v_n = row_count;
	v_nova := v_n > 0;

	insert into public.dmetric_diario as d (site_id, dia, dimensao, valor, visitas, visualizacoes)
	select v_site.id, v_dia, x.dimensao, x.valor, case when v_nova then 1 else 0 end, 1
	from (values
		('total', ''),
		('pais', upper(left(coalesce(p_pais, ''), 2))),
		('cidade', left(coalesce(p_cidade, ''), 80)),
		('pagina', left(coalesce(nullif(p_caminho, ''), '/'), 200)),
		('dispositivo', left(coalesce(p_dispositivo, ''), 30)),
		('navegador', left(coalesce(p_navegador, ''), 30)),
		('sistema', left(coalesce(p_sistema, ''), 30))
	) as x(dimensao, valor)
	-- A origem só conta na chegada: as páginas seguintes da mesma visita vêm
	-- "do próprio site" e só repetiriam a origem.
	union all
	select v_site.id, v_dia, 'origem', left(coalesce(nullif(p_origem, ''), 'Direto'), 120), 1, 1
	where v_nova
	on conflict (site_id, dia, dimensao, valor) do update
		set visitas = d.visitas + excluded.visitas,
			visualizacoes = d.visualizacoes + excluded.visualizacoes;

	-- Carimbo do "está recebendo", no máximo uma vez por minuto.
	update public.dmetric_sites set ultima_visita = now()
		where id = v_site.id and (ultima_visita is null or ultima_visita < now() - interval '1 minute');

	-- Faxina dos vistos: de vez em quando, tira o que é de anteontem para trás.
	if random() < 0.02 then
		delete from public.dmetric_vistos where dia < v_dia - 1;
	end if;

	return true;
end;
$$;

revoke all on function public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text) to service_role;

-- ---------- Painel ----------
-- Tudo de um período, já somado. p_site nulo = todos os sites. Roda como quem
-- chama (security invoker), então o RLS do módulo vale aqui também.
create or replace function public.dmetric_painel(p_site uuid, p_de date, p_ate date)
returns jsonb
language sql
stable
set search_path = public
as $$
	with base as (
		select dimensao, valor, dia, visitas, visualizacoes
		from public.dmetric_diario
		where dia between p_de and p_ate
			and (p_site is null or site_id = p_site)
	),
	dims as (
		select dimensao, jsonb_agg(jsonb_build_object('valor', valor, 'visitas', visitas, 'visualizacoes', visualizacoes)
			order by visitas desc, visualizacoes desc) as itens
		from (
			select dimensao, valor, sum(visitas)::int as visitas, sum(visualizacoes)::int as visualizacoes,
				row_number() over (partition by dimensao order by sum(visitas) desc, sum(visualizacoes) desc) as pos
			from base
			where dimensao <> 'total'
			group by dimensao, valor
		) s
		-- Países todos (o mapa precisa); as outras listas, as 25 primeiras.
		where dimensao = 'pais' or pos <= 25
		group by dimensao
	)
	select jsonb_build_object(
		'visitas', coalesce((select sum(visitas) from base where dimensao = 'total'), 0),
		'visualizacoes', coalesce((select sum(visualizacoes) from base where dimensao = 'total'), 0),
		'por_dia', coalesce((
			select jsonb_agg(jsonb_build_object('dia', dia, 'visitas', v, 'visualizacoes', vz) order by dia)
			from (select dia, sum(visitas)::int v, sum(visualizacoes)::int vz from base where dimensao = 'total' group by dia) t
		), '[]'::jsonb),
		'dimensoes', coalesce((select jsonb_object_agg(dimensao, itens) from dims), '{}'::jsonb)
	);
$$;

grant execute on function public.dmetric_painel(uuid, date, date) to authenticated;

-- ---------- Histórico: Google Analytics · DNMS-HUB · 2025 ----------
-- Transcrito do relatório "Detalhes demográficos: País" (1/jan a 31/dez/2025).
insert into public.dmetric_historico
	(propriedade, inicio, fim, pais, pais_nome, usuarios, novos_usuarios, sessoes_engajadas, taxa_engajamento, tempo_medio_s, eventos)
values
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'BR', 'Brazil', 109087, 107574, 56228, 46.02, 3, 498650),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'US', 'United States', 2273, 2264, 1343, 58.19, 3, 8748),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'IE', 'Ireland', 773, 773, 531, 68.78, 3, 3021),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'SE', 'Sweden', 580, 580, 379, 65.23, 3, 2248),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'PT', 'Portugal', 28, 28, 17, 58.62, 5, 128),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'FR', 'France', 18, 18, 5, 27.78, 1, 63),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'DE', 'Germany', 17, 17, 2, 11.76, 1, 72),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'NL', 'Netherlands', 13, 12, 5, 31.25, 1, 57),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'ID', 'Indonesia', 12, 11, 8, 57.14, 14, 61),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'GB', 'United Kingdom', 12, 11, 7, 58.33, 0, 46),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'CN', 'China', 11, 8, 3, 25.00, 32, 44),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'ES', 'Spain', 11, 11, 9, 81.82, 3, 54),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'AR', 'Argentina', 10, 9, 8, 72.73, 6, 50),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'PY', 'Paraguay', 9, 9, 4, 44.44, 0, 40),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'CL', 'Chile', 8, 8, 7, 77.78, 21, 39),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'HK', 'Hong Kong', 8, 8, 2, 25.00, 3, 29),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'PL', 'Poland', 8, 8, 2, 22.22, 1, 29),
	('DNMS-HUB', '2025-01-01', '2025-12-31', null, '(not set)', 7, 7, 0, 0.00, 0, 21),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'IN', 'India', 6, 5, 4, 66.67, 10, 27),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'JP', 'Japan', 6, 6, 3, 50.00, 8, 23),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'CA', 'Canada', 5, 5, 2, 40.00, 3, 20),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'AU', 'Australia', 4, 4, 1, 25.00, 1, 15),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'IT', 'Italy', 4, 4, 2, 50.00, 0, 14),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'TR', 'Türkiye', 4, 4, 1, 25.00, 6, 17),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'UY', 'Uruguay', 4, 4, 3, 75.00, 3, 25),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'BO', 'Bolivia', 3, 3, 2, 66.67, 13, 24),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'DK', 'Denmark', 3, 3, 2, 66.67, 2, 11),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'PA', 'Panama', 3, 3, 3, 100.00, 7, 14),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'BD', 'Bangladesh', 2, 2, 2, 100.00, 12, 12),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'HU', 'Hungary', 2, 2, 0, 0.00, 0, 6),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'MX', 'Mexico', 2, 2, 1, 50.00, 10, 7),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'NZ', 'New Zealand', 2, 2, 2, 100.00, 5, 9),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'PH', 'Philippines', 2, 2, 2, 100.00, 1, 8),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'SG', 'Singapore', 2, 1, 2, 100.00, 39, 5),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'ZA', 'South Africa', 2, 2, 0, 0.00, 0, 8),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'BE', 'Belgium', 1, 1, 1, 100.00, 0, 4),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'CO', 'Colombia', 1, 1, 0, 0.00, 0, 4),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'EC', 'Ecuador', 1, 1, 1, 100.00, 0, 4),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'EG', 'Egypt', 1, 1, 1, 50.00, 0, 6),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'IR', 'Iran', 1, 1, 0, 0.00, 0, 4),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'KZ', 'Kazakhstan', 1, 1, 1, 100.00, 0, 6),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'KE', 'Kenya', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'LU', 'Luxembourg', 1, 1, 1, 100.00, 0, 4),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'MA', 'Morocco', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'MM', 'Myanmar (Burma)', 1, 1, 1, 100.00, 0, 4),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'PK', 'Pakistan', 1, 1, 3, 100.00, 31, 14),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'RU', 'Russia', 1, 1, 0, 0.00, 6, 4),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'KR', 'South Korea', 1, 1, 0, 0.00, 0, 4),
	('DNMS-HUB', '2025-01-01', '2025-12-31', 'VE', 'Venezuela', 1, 1, 1, 100.00, 0, 5)
on conflict (propriedade, inicio, fim, pais_nome) do nothing;

notify pgrst, 'reload schema';
