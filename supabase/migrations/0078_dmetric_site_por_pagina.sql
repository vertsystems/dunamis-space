-- ============================================================
-- DMetric — site = domínio + página, e o título de cada página
--
-- Até aqui o site era só o domínio: dnms.fun/lojasmari e dnms.fun/casadotita
-- (páginas de clientes diferentes no mesmo domínio) somavam num site só. Agora
-- o site é o domínio MAIS o primeiro trecho do caminho (`caminho`):
--   dnms.fun/lojasmari → site "dnms.fun" + caminho "lojasmari"
--   dnms.fun/          → site "dnms.fun" + caminho "" (a raiz)
-- e cada um tem o próprio mapa, cidades, origens… Páginas mais fundas
-- (dnms.fun/lojasmari/promo) contam dentro do site dnms.fun/lojasmari.
--
-- Num site comum, com seções (/ofertas, /contato), isso o picaria em vários:
-- `juntar_paginas` na raiz do domínio volta a contar tudo nela.
--
-- TÍTULO: o script manda o document.title. Ele vira o nome do site (enquanto
-- ninguém renomear à mão: `nome_manual`) e o nome de cada página na lista de
-- páginas (dmetric_paginas).
--
-- Os sites que já existiam e só tiveram visitas numa página (dnms.fun só em
-- /lojasmari, por exemplo) viram o site daquela página, com os números juntos.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0078_dmetric_site_por_pagina.sql
-- ============================================================

alter table public.dmetric_sites
	add column if not exists caminho text not null default '',
	add column if not exists titulo text,
	add column if not exists nome_manual boolean not null default false,
	add column if not exists juntar_paginas boolean not null default false;

comment on column public.dmetric_sites.caminho is
	'Primeiro trecho do endereço (dnms.fun/lojasmari → "lojasmari"); vazio = a raiz do domínio.';
comment on column public.dmetric_sites.titulo is 'Título (document.title) da página principal do site.';
comment on column public.dmetric_sites.nome_manual is 'Renomeado à mão: o título não substitui mais o nome.';
comment on column public.dmetric_sites.juntar_paginas is
	'Na raiz do domínio: conta todas as páginas dele aqui, em vez de um site por página.';

-- Um site por domínio + caminho.
drop index if exists public.dmetric_sites_dominio_key;
create unique index if not exists dmetric_sites_dominio_caminho_key
	on public.dmetric_sites (lower(dominio), caminho) where dominio is not null;

-- Quem já tinha nome diferente do domínio foi renomeado à mão.
update public.dmetric_sites set nome_manual = true
	where not nome_manual and dominio is not null and nome <> dominio;

-- Sites que só tiveram visitas numa página que não é a raiz viram o site dela.
with unica as (
	select site_id, min(seg) as seg
	from (
		select site_id, lower(split_part(regexp_replace(valor, '^/+', ''), '/', 1)) as seg
		from public.dmetric_diario
		where dimensao = 'pagina'
	) x
	group by site_id
	having count(distinct seg) = 1 and min(seg) <> ''
)
update public.dmetric_sites s
	set caminho = left(u.seg, 80)
	from unica u
	where s.id = u.site_id and s.caminho = '' and s.automatico;

-- ---------- Título de cada página ----------
create table if not exists public.dmetric_paginas (
	site_id uuid not null references public.dmetric_sites (id) on delete cascade,
	caminho text not null,
	titulo text not null,
	atualizado_em timestamptz not null default now(),
	primary key (site_id, caminho)
);
alter table public.dmetric_paginas enable row level security;
drop policy if exists dmetric_paginas_ver on public.dmetric_paginas;
create policy dmetric_paginas_ver on public.dmetric_paginas
	for select to authenticated using (public.tem_permissao('dmetric', 'ver'));

-- ---------- Qual site é esta visita ----------
drop function if exists public.dmetric_site(text, text);

create or replace function public.dmetric_site(p_chave text, p_host text, p_caminho text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_host text := regexp_replace(lower(coalesce(p_host, '')), '^www\.', '');
	-- Primeiro trecho do caminho; "index.html" e afins são a raiz.
	v_seg text := left(lower(split_part(regexp_replace(coalesce(p_caminho, ''), '^/+', ''), '/', 1)), 80);
	v_dominio text;
	v_raiz public.dmetric_sites%rowtype;
	v_tem_raiz boolean;
	v_site public.dmetric_sites%rowtype;
begin
	if v_seg ~ '^index\.(html?|php)$' then
		v_seg := '';
	end if;

	-- Código antigo, com data-site: o site é o da chave, sem olhar o caminho.
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
	select lower(dominio) into v_dominio from public.dmetric_sites
		where dominio is not null and (v_host = lower(dominio) or v_host like '%.' || lower(dominio))
		order by length(dominio) desc
		limit 1;
	v_dominio := coalesce(v_dominio, v_host);

	select * into v_raiz from public.dmetric_sites where lower(dominio) = v_dominio and caminho = '';
	v_tem_raiz := found;

	-- A raiz: a página "/" ou, com juntar_paginas, qualquer página do domínio.
	if v_seg = '' or (v_tem_raiz and v_raiz.juntar_paginas) then
		if not v_tem_raiz then
			insert into public.dmetric_sites (nome, dominio, caminho, automatico)
				values (v_dominio, v_dominio, '', true)
				on conflict do nothing;
			select * into v_raiz from public.dmetric_sites where lower(dominio) = v_dominio and caminho = '';
		end if;
		return case when v_raiz.ativo then v_raiz.id end;
	end if;

	-- Pausar a raiz pausa o domínio inteiro.
	if v_tem_raiz and not v_raiz.ativo then
		return null;
	end if;

	select * into v_site from public.dmetric_sites where lower(dominio) = v_dominio and caminho = v_seg;
	if not found then
		insert into public.dmetric_sites (nome, dominio, caminho, automatico)
			values (v_dominio || '/' || v_seg, v_dominio, v_seg, true)
			on conflict do nothing;
		select * into v_site from public.dmetric_sites where lower(dominio) = v_dominio and caminho = v_seg;
	end if;
	return case when v_site.ativo then v_site.id end;
end;
$$;
revoke all on function public.dmetric_site(text, text, text) from public, anon, authenticated;

-- ---------- Página vista (+ título) ----------

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
revoke all on function public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text, text, text, text)
	to anon, authenticated, service_role;

-- A versão sem título (0074) fica como atalho para a nova: a rota em produção
-- a chama até o deploy com o título sair, e apagá-la derrubaria a coleta nesse
-- meio-tempo.
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
language sql
security definer
set search_path = public
as $$
	select public.dmetric_coletar(p_segredo, p_chave, p_host, p_caminho, p_origem, p_campanha, p_pais, p_cidade,
		p_dispositivo, p_navegador, p_sistema, p_visitante, null::text);
$$;

-- ---------- Tempo e cliques: o site também sai do caminho ----------
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
	v_caminho text := left(coalesce(nullif(p_caminho, ''), '/'), 200);
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
		insert into public.dmetric_recentes (site_id, tipo, caminho, segundos)
			values (v_site, 'tempo', v_caminho, v_seg);
		return true;
	end if;

	if p_tipo = 'clique' and coalesce(p_valor, '') <> '' then
		insert into public.dmetric_diario as d (site_id, dia, dimensao, valor, visualizacoes)
		values (v_site, v_dia, 'clique', left(p_valor, 80), 1)
		on conflict (site_id, dia, dimensao, valor) do update
			set visualizacoes = d.visualizacoes + 1;
		insert into public.dmetric_recentes (site_id, tipo, caminho, valor)
			values (v_site, 'clique', v_caminho, left(p_valor, 80));
		return true;
	end if;

	return false;
end;
$$;

-- ---------- Painéis: a página leva o site junto ----------
-- Com todos os sites no painel, "/" de sites diferentes não pode virar uma
-- linha só: cada item de 'pagina' sai com o site_id dele.
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
			where dimensao <> 'total'
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
		'dimensoes', coalesce((select jsonb_object_agg(dimensao, itens) from dims), '{}'::jsonb)
	);
$$;

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
				from dims group by dimensao
			) x
		), '{}'::jsonb)
	);
$$;

notify pgrst, 'reload schema';
