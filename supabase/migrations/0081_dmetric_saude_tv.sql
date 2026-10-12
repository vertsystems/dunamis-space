-- ============================================================
-- DMetric — saúde da página e modo TV
--
-- SAÚDE: o script mede, no aparelho de quem visita, o que o Google chama de
-- Web Vitals — carregamento (LCP), resposta ao toque (INP), estabilidade
-- (CLS), primeira imagem (FCP) e resposta do servidor (TTFB) — e avisa erros
-- de JavaScript, imagens que não carregaram e páginas 404 (com a página de onde
-- veio o clique). Nada disso identifica a pessoa.
--
--   dmetric_vitais: por site, dia e medida, quantas medições foram boas, "a
--   melhorar" e ruins (os limites do Google, abaixo) e a soma (para a média).
--   dmetric_erros: por site, dia, tipo e mensagem, quantas vezes aconteceu.
--   A nota de 0 a 100 é calculada no app (src/lib/dmetric/saude.ts).
--
-- TV: dmetric_ultimos devolve os últimos acessos (lista recente, 0077) para o
-- feed do modo TV.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0081_dmetric_saude_tv.sql
-- ============================================================

create table if not exists public.dmetric_vitais (
	site_id uuid not null references public.dmetric_sites (id) on delete cascade,
	dia date not null,
	-- lcp | inp | cls | fcp | ttfb
	metrica text not null,
	bons integer not null default 0,
	medios integer not null default 0,
	ruins integer not null default 0,
	-- Em ms (cls: o valor puro, sem unidade).
	soma double precision not null default 0,
	primary key (site_id, dia, metrica)
);

create table if not exists public.dmetric_erros (
	site_id uuid not null references public.dmetric_sites (id) on delete cascade,
	dia date not null,
	-- js | recurso | 404
	tipo text not null,
	-- js: a mensagem; recurso: o arquivo que não carregou; 404: o endereço quebrado.
	mensagem text not null,
	-- Em que página aconteceu (no 404, a própria).
	pagina text not null default '',
	-- js/recurso: de que domínio era o script/arquivo; 404: a página de onde veio o clique.
	origem text not null default '',
	ocorrencias integer not null default 0,
	primary key (site_id, dia, tipo, mensagem, pagina)
);
create index if not exists idx_dmetric_erros_dia on public.dmetric_erros (dia);

alter table public.dmetric_vitais enable row level security;
alter table public.dmetric_erros enable row level security;
drop policy if exists dmetric_vitais_ver on public.dmetric_vitais;
create policy dmetric_vitais_ver on public.dmetric_vitais
	for select to authenticated using (public.tem_permissao('dmetric', 'ver'));
drop policy if exists dmetric_erros_ver on public.dmetric_erros;
create policy dmetric_erros_ver on public.dmetric_erros
	for select to authenticated using (public.tem_permissao('dmetric', 'ver'));

-- ---------- O site de um endereço, sem criar nenhum ----------
-- O mesmo caminho de dmetric_site (0078), mas só acha: medida de saúde e 404
-- não criam site. Um 404 em /lojamari (erro de digitação na bio) não pode virar
-- um site "dnms.fun/lojamari" na lista.
create or replace function public.dmetric_site_existente(p_chave text, p_host text, p_caminho text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_host text := regexp_replace(lower(coalesce(p_host, '')), '^www\.', '');
	v_seg text := left(lower(split_part(regexp_replace(coalesce(p_caminho, ''), '^/+', ''), '/', 1)), 80);
	v_dominio text;
	v_raiz public.dmetric_sites%rowtype;
	v_id uuid;
begin
	-- Código antigo: a chave já diz o site (e dmetric_site não cria nesse caso).
	if coalesce(p_chave, '') <> '' then
		return public.dmetric_site(p_chave, p_host, p_caminho);
	end if;
	if v_seg ~ '^index\.(html?|php)$' then
		v_seg := '';
	end if;

	select lower(dominio) into v_dominio from public.dmetric_sites
		where dominio is not null and (v_host = lower(dominio) or v_host like '%.' || lower(dominio))
		order by length(dominio) desc
		limit 1;
	if v_dominio is null then
		return null;
	end if;

	select * into v_raiz from public.dmetric_sites where lower(dominio) = v_dominio and caminho = '';
	if found then
		if not v_raiz.ativo then
			return null;
		end if;
		if v_seg = '' or v_raiz.juntar_paginas then
			return v_raiz.id;
		end if;
	end if;

	select id into v_id from public.dmetric_sites where lower(dominio) = v_dominio and caminho = v_seg and ativo;
	return v_id;
end;
$$;
revoke all on function public.dmetric_site_existente(text, text, text) from public, anon, authenticated;

-- ---------- Registrar saúde ----------
-- p_tipo 'vitais' (p_dados: {lcp, inp, cls, fcp, ttfb}), 'erro' ({mensagem,
-- origem, recurso: bool}) ou '404' ({origem}). Mesma segurança da coleta: o
-- segredo da rota e o site pelo domínio + caminho (0078).
--
-- O 404 fica com o site da página que tinha o link quebrado (origem, quando é
-- do próprio site); senão, com o site do endereço quebrado; senão, com o site
-- do domínio visitado por último.
create or replace function public.dmetric_saude(
	p_segredo text,
	p_chave text,
	p_host text,
	p_caminho text,
	p_tipo text,
	p_dados jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_site uuid;
	v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
	v_caminho text := left(coalesce(nullif(p_caminho, ''), '/'), 200);
	v_origem text := left(coalesce(p_dados ->> 'origem', ''), 200);
	v_host text := regexp_replace(lower(coalesce(p_host, '')), '^www\.', '');
	v_m record;
	v_valor double precision;
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return false;
	end if;
	if p_tipo = '404' then
		v_site := coalesce(
			case when left(v_origem, 1) = '/' then public.dmetric_site_existente(p_chave, p_host, v_origem) end,
			public.dmetric_site_existente(p_chave, p_host, p_caminho)
		);
		if v_site is null and coalesce(p_chave, '') = '' then
			select id into v_site from public.dmetric_sites
				where ativo and dominio is not null and (v_host = lower(dominio) or v_host like '%.' || lower(dominio))
				order by ultima_visita desc nulls last
				limit 1;
		end if;
	else
		v_site := public.dmetric_site_existente(p_chave, p_host, p_caminho);
	end if;
	if v_site is null then
		return false;
	end if;

	if p_tipo = 'vitais' then
		-- Limites do Google: até o 1º é bom, até o 2º "a melhorar", acima é ruim.
		for v_m in
			select * from (values
				('lcp', 2500::double precision, 4000::double precision, 60000::double precision),
				('inp', 200, 500, 30000),
				('cls', 0.1, 0.25, 10),
				('fcp', 1800, 3000, 60000),
				('ttfb', 800, 1800, 60000)
			) as l(metrica, bom, ruim, teto)
		loop
			if jsonb_typeof(p_dados -> v_m.metrica) = 'number' then
				v_valor := (p_dados ->> v_m.metrica)::double precision;
				-- Valor absurdo (relógio maluco, aba esquecida aberta) não entra.
				if v_valor >= 0 and v_valor <= v_m.teto then
					insert into public.dmetric_vitais as v (site_id, dia, metrica, bons, medios, ruins, soma)
					values (v_site, v_dia, v_m.metrica,
						(v_valor <= v_m.bom)::int,
						(v_valor > v_m.bom and v_valor <= v_m.ruim)::int,
						(v_valor > v_m.ruim)::int,
						v_valor)
					on conflict (site_id, dia, metrica) do update
						set bons = v.bons + excluded.bons,
							medios = v.medios + excluded.medios,
							ruins = v.ruins + excluded.ruins,
							soma = v.soma + excluded.soma;
				end if;
			end if;
		end loop;
		return true;
	end if;

	if p_tipo in ('erro', '404') then
		insert into public.dmetric_erros as e (site_id, dia, tipo, mensagem, pagina, origem, ocorrencias)
		values (
			v_site, v_dia,
			case when p_tipo = '404' then '404' when (p_dados ->> 'recurso')::boolean then 'recurso' else 'js' end,
			left(coalesce(nullif(case when p_tipo = '404' then v_caminho else p_dados ->> 'mensagem' end, ''), 'Erro sem mensagem'), 200),
			v_caminho,
			v_origem,
			1
		)
		on conflict (site_id, dia, tipo, mensagem, pagina) do update
			set ocorrencias = e.ocorrencias + 1,
				origem = case when excluded.origem <> '' then excluded.origem else e.origem end;
		-- Faxina de vez em quando: erros de mais de 90 dias.
		if random() < 0.01 then
			delete from public.dmetric_erros where dia < v_dia - 90;
		end if;
		return true;
	end if;

	return false;
end;
$$;
revoke all on function public.dmetric_saude(text, text, text, text, text, jsonb) from public;
grant execute on function public.dmetric_saude(text, text, text, text, text, jsonb) to anon, authenticated, service_role;

-- ---------- Painel de saúde ----------
-- Por site: as medidas somadas no período, os erros (os 60 mais frequentes) e
-- as páginas vistas (para a taxa de erro por visualização).
create or replace function public.dmetric_saude_painel(p_site uuid, p_de date, p_ate date)
returns jsonb
language sql
stable
set search_path = public
as $$
	select jsonb_build_object(
		'vitais', coalesce((
			select jsonb_agg(jsonb_build_object('site_id', site_id, 'metrica', metrica, 'bons', b, 'medios', m, 'ruins', r, 'soma', s))
			from (
				select site_id, metrica, sum(bons)::int b, sum(medios)::int m, sum(ruins)::int r, sum(soma) s
				from public.dmetric_vitais
				where dia between p_de and p_ate and (p_site is null or site_id = p_site)
				group by site_id, metrica
			) t
		), '[]'::jsonb),
		'erros', coalesce((
			select jsonb_agg(jsonb_build_object('site_id', site_id, 'tipo', tipo, 'mensagem', mensagem, 'pagina', pagina,
				'origem', origem, 'ocorrencias', n, 'ultimo', ultimo) order by n desc)
			from (
				select site_id, tipo, mensagem, pagina, max(origem) origem, sum(ocorrencias)::int n, max(dia) ultimo
				from public.dmetric_erros
				where dia between p_de and p_ate and (p_site is null or site_id = p_site)
				group by site_id, tipo, mensagem, pagina
				order by n desc
				limit 60
			) t
		), '[]'::jsonb),
		'visualizacoes', coalesce((
			select jsonb_agg(jsonb_build_object('site_id', site_id, 'visualizacoes', n))
			from (
				select site_id, sum(visualizacoes)::int n
				from public.dmetric_diario
				where dimensao = 'total' and dia between p_de and p_ate and (p_site is null or site_id = p_site)
				group by site_id
			) t
		), '[]'::jsonb)
	);
$$;
grant execute on function public.dmetric_saude_painel(uuid, date, date) to authenticated;

-- ---------- Modo TV: os últimos acessos ----------
create or replace function public.dmetric_ultimos(p_site uuid, p_limite integer)
returns table (em timestamptz, site_id uuid, caminho text, cidade text, pais text, origem text, dispositivo text)
language sql
stable
set search_path = public
as $$
	select em, site_id, caminho, cidade, pais, origem, dispositivo
	from public.dmetric_recentes
	where tipo = 'v' and (p_site is null or site_id = p_site)
	order by em desc
	limit least(greatest(coalesce(p_limite, 10), 1), 50);
$$;
grant execute on function public.dmetric_ultimos(uuid, integer) to authenticated;

-- Ontem, da meia-noite até esta mesma hora (Brasília): a comparação do "hoje".
-- Cabe na lista recente, que guarda 48 horas.
create or replace function public.dmetric_ontem_ate_agora(p_site uuid)
returns table (visitas integer, visualizacoes integer)
language sql
stable
set search_path = public
as $$
	select count(distinct (site_id, visitante))::int, count(*)::int
	from public.dmetric_recentes
	where tipo = 'v' and (p_site is null or site_id = p_site)
		and em >= (((now() at time zone 'America/Sao_Paulo')::date - 1)::timestamp at time zone 'America/Sao_Paulo')
		and em < now() - interval '1 day';
$$;
grant execute on function public.dmetric_ontem_ate_agora(uuid) to authenticated;

notify pgrst, 'reload schema';
