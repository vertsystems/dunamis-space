-- ============================================================
-- DMetric — um código só para todos os sites, tempo de visita e cliques
--
-- 1. CÓDIGO ÚNICO. Até aqui cada site precisava ser cadastrado antes, e o
--    código levava a chave dele (data-site). Agora o mesmo código serve para
--    qualquer site: a visita é reconhecida pelo DOMÍNIO, e um domínio novo
--    vira site sozinho (automatico = true), com o próprio domínio como nome.
--    Pausar um site é também o jeito de bloquear um domínio indesejado: o
--    site pausado continua existindo, então não é recriado. O código antigo,
--    com data-site, continua valendo.
--
-- 2. TEMPO. O script mede quanto tempo cada página ficou na tela (só com a
--    aba visível) e manda ao sair dela. Soma em `segundos`, na linha 'total'
--    e na da página: tempo médio = segundos ÷ visitas.
--
-- 3. CLIQUES. Clique em WhatsApp, telefone, e-mail, mapa ou link para outro
--    site vira a dimensão 'clique' (contado em visualizacoes). Um elemento com
--    data-dm="Nome" no site conta como o evento "Nome".
--
-- 4. CAMPANHA. A utm_campaign da chegada vira a dimensão 'campanha'.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0074_dmetric_codigo_unico.sql
-- ============================================================

alter table public.dmetric_sites
	add column if not exists automatico boolean not null default false;
comment on column public.dmetric_sites.automatico is
	'Criado sozinho pela primeira visita de um domínio novo (código único, sem data-site).';

-- Um domínio, um site: é por ele que a visita sem chave acha o site.
create unique index if not exists dmetric_sites_dominio_key
	on public.dmetric_sites (lower(dominio)) where dominio is not null;

alter table public.dmetric_diario
	add column if not exists segundos bigint not null default 0;
comment on column public.dmetric_diario.segundos is
	'Tempo de tela somado (só aba visível). Tempo médio = segundos / visitas (ou / visualizacoes, na página).';

-- ---------- Qual site é esta visita ----------
-- Pela chave (código antigo) ou pelo domínio (código único). Sem site para o
-- domínio, cria. Devolve null quando não conta: site pausado, domínio que não
-- é o do site da chave, ou host que não é domínio público (localhost, IP).
-- Interna: só as funções de coleta chamam.
create or replace function public.dmetric_site(p_chave text, p_host text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_host text := regexp_replace(lower(coalesce(p_host, '')), '^www\.', '');
	v_site public.dmetric_sites%rowtype;
begin
	if coalesce(p_chave, '') <> '' then
		select * into v_site from public.dmetric_sites where chave = p_chave;
		if not found or not v_site.ativo then
			return null;
		end if;
		if v_site.dominio is not null and v_site.dominio <> ''
			and v_host <> v_site.dominio and v_host not like '%.' || v_site.dominio then
			return null;
		end if;
		return v_site.id;
	end if;

	-- Código único: precisa ser um domínio de verdade.
	if v_host !~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$' or v_host ~ '^[0-9.]+$' or length(v_host) > 253 then
		return null;
	end if;

	-- O domínio cadastrado mais específico que cobre este host
	-- (loja.exemplo.com.br cai em exemplo.com.br, se não houver o próprio).
	select * into v_site from public.dmetric_sites
		where dominio is not null and (v_host = lower(dominio) or v_host like '%.' || lower(dominio))
		order by length(dominio) desc
		limit 1;
	if found then
		return case when v_site.ativo then v_site.id end;
	end if;

	insert into public.dmetric_sites (nome, dominio, automatico)
		values (v_host, v_host, true)
		on conflict do nothing;
	select * into v_site from public.dmetric_sites where lower(dominio) = v_host;
	return case when v_site.ativo then v_site.id end;
end;
$$;
revoke all on function public.dmetric_site(text, text) from public, anon, authenticated;

-- ---------- Página vista ----------
drop function if exists public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text, text);

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
	p_visitante text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_site uuid;
	v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
	v_nova boolean;
	v_n integer;
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return false;
	end if;
	v_site := public.dmetric_site(p_chave, p_host);
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
		('pais', upper(left(coalesce(p_pais, ''), 2))),
		('cidade', left(coalesce(p_cidade, ''), 80)),
		('pagina', left(coalesce(nullif(p_caminho, ''), '/'), 200)),
		('dispositivo', left(coalesce(p_dispositivo, ''), 30)),
		('navegador', left(coalesce(p_navegador, ''), 30)),
		('sistema', left(coalesce(p_sistema, ''), 30))
	) as x(dimensao, valor)
	-- Origem e campanha só contam na chegada (ver 0072).
	union all
	select v_site, v_dia, 'origem', left(coalesce(nullif(p_origem, ''), 'Direto'), 120), 1, 1
	where v_nova
	union all
	select v_site, v_dia, 'campanha', left(p_campanha, 120), 1, 1
	where v_nova and coalesce(p_campanha, '') <> ''
	on conflict (site_id, dia, dimensao, valor) do update
		set visitas = d.visitas + excluded.visitas,
			visualizacoes = d.visualizacoes + excluded.visualizacoes;

	update public.dmetric_sites set ultima_visita = now()
		where id = v_site and (ultima_visita is null or ultima_visita < now() - interval '1 minute');

	if random() < 0.02 then
		delete from public.dmetric_vistos where dia < v_dia - 1;
	end if;

	return true;
end;
$$;

-- O segredo da rota, conferido contra o hash (0073) — num lugar só.
create or replace function public.dmetric_segredo_ok(p_segredo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select p_segredo is not null and exists (
		select 1 from public.dmetric_config
		where chave = 'segredo_coleta' and valor = encode(sha256(convert_to(p_segredo, 'UTF8')), 'hex')
	);
$$;
revoke all on function public.dmetric_segredo_ok(text) from public, anon, authenticated;

revoke all on function public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text, text, text)
	to anon, authenticated, service_role;

-- ---------- Tempo de tela e cliques ----------
-- p_tipo 'tempo': soma p_segundos no total do dia e na página.
-- p_tipo 'clique': conta um clique em p_valor ("WhatsApp", "Telefone", um domínio…).
create or replace function public.dmetric_evento(
	p_segredo text,
	p_chave text,
	p_host text,
	p_caminho text,
	p_tipo text,
	p_valor text,
	p_segundos integer
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
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return false;
	end if;
	v_site := public.dmetric_site(p_chave, p_host);
	if v_site is null then
		return false;
	end if;

	if p_tipo = 'tempo' and v_seg > 0 then
		insert into public.dmetric_diario as d (site_id, dia, dimensao, valor, segundos)
		values
			(v_site, v_dia, 'total', '', v_seg),
			(v_site, v_dia, 'pagina', left(coalesce(nullif(p_caminho, ''), '/'), 200), v_seg)
		on conflict (site_id, dia, dimensao, valor) do update
			set segundos = d.segundos + excluded.segundos;
		return true;
	end if;

	if p_tipo = 'clique' and coalesce(p_valor, '') <> '' then
		insert into public.dmetric_diario as d (site_id, dia, dimensao, valor, visualizacoes)
		values (v_site, v_dia, 'clique', left(p_valor, 80), 1)
		on conflict (site_id, dia, dimensao, valor) do update
			set visualizacoes = d.visualizacoes + 1;
		return true;
	end if;

	return false;
end;
$$;
revoke all on function public.dmetric_evento(text, text, text, text, text, text, integer) from public;
grant execute on function public.dmetric_evento(text, text, text, text, text, text, integer)
	to anon, authenticated, service_role;

-- ---------- Painel: + tempo ----------
create or replace function public.dmetric_painel(p_site uuid, p_de date, p_ate date)
returns jsonb
language sql
stable
set search_path = public
as $$
	with base as (
		select dimensao, valor, dia, visitas, visualizacoes, segundos
		from public.dmetric_diario
		where dia between p_de and p_ate
			and (p_site is null or site_id = p_site)
	),
	dims as (
		select dimensao, jsonb_agg(jsonb_build_object('valor', valor, 'visitas', visitas, 'visualizacoes', visualizacoes, 'segundos', segundos)
			order by visitas desc, visualizacoes desc) as itens
		from (
			select dimensao, valor, sum(visitas)::int as visitas, sum(visualizacoes)::int as visualizacoes,
				sum(segundos)::bigint as segundos,
				row_number() over (partition by dimensao order by sum(visitas) desc, sum(visualizacoes) desc) as pos
			from base
			where dimensao <> 'total'
			group by dimensao, valor
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
		'dimensoes', coalesce((select jsonb_object_agg(dimensao, itens) from dims), '{}'::jsonb)
	);
$$;
grant execute on function public.dmetric_painel(uuid, date, date) to authenticated;

notify pgrst, 'reload schema';
