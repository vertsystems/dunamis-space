-- ============================================================
-- DMetric — robôs de data center ficam de fora
--
-- As visitas de fora do Brasil eram quase todas robôs: os da Meta conferindo
-- os links de anúncios e posts (das cidades dos data centers dela — Clonee,
-- Prineville, Forest City, Gallatin) e servidores de nuvem (Amazon, Hetzner…).
-- O navegador deles diz "Chrome", então o filtro pelo navegador (ehRobo, na
-- rota) não pega. Pega a rede de onde vêm.
--
--   1. dmetric_redes_robo: as faixas de IP da Meta e das nuvens, por fonte
--      (a lista oficial da Amazon, do Google e da Oracle; as outras pelo
--      RIPEstat, a partir do número da rede). Um cron da Vercel troca as
--      faixas toda semana (/api/dmetric/robos). Ficam de fora redes que levam
--      gente de verdade: Cloudflare (o WARP), Akamai e Fastly (a
--      Retransmissão Privada da Apple), Zscaler (proxy de empresa).
--   2. Coleta, evento e saúde recebem o IP só para conferir — ele não é
--      guardado em lugar nenhum. Rede de robô: a página vista vai para o
--      contador de robôs do site (dmetric_robos); clique, tempo e saúde não
--      entram. Robô não cria site novo.
--   3. dmetric_robo_declarado: o robô que se diz robô (Googlebot, prévia de
--      link do WhatsApp…) também entra no contador, com o nome dele.
--   4. dmetric_redes_robo_trocar: o cron troca as faixas de uma fonte de uma
--      vez; lista vazia (fonte fora do ar) não apaga as que já estavam.
--
-- O que já foi contado antes desta migration continua contado: sem o IP, não
-- dá para saber quem era robô.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0092_dmetric_robos.sql
-- ============================================================

-- ---------- 1. As faixas de rede dos robôs ----------
create table if not exists public.dmetric_redes_robo (
	rede cidr primary key,
	-- Como aparece no painel: "Meta", "Amazon", "Hetzner"…
	nome text not null,
	-- De onde veio a faixa: "amazon", "google", "as32934"… (o cron troca por fonte)
	fonte text not null,
	atualizado_em timestamptz not null default now()
);
-- "Este IP está dentro de qual faixa?" sem varrer a tabela.
create index if not exists idx_dmetric_redes_robo_rede on public.dmetric_redes_robo using gist (rede inet_ops);
create index if not exists idx_dmetric_redes_robo_fonte on public.dmetric_redes_robo (fonte);
alter table public.dmetric_redes_robo enable row level security;
drop policy if exists dmetric_redes_robo_ver on public.dmetric_redes_robo;
create policy dmetric_redes_robo_ver on public.dmetric_redes_robo
	for select to authenticated using ((select public.tem_permissao('dmetric', 'ver')));

-- ---------- O contador de robôs de cada site, por dia ----------
create table if not exists public.dmetric_robos (
	site_id uuid not null references public.dmetric_sites (id) on delete cascade,
	dia date not null,
	-- O nome da rede ("Meta", "Amazon") ou do robô declarado ("Google", "WhatsApp").
	rede text not null,
	acessos integer not null default 0,
	primary key (site_id, dia, rede)
);
create index if not exists idx_dmetric_robos_dia on public.dmetric_robos (dia);
alter table public.dmetric_robos enable row level security;
drop policy if exists dmetric_robos_ver on public.dmetric_robos;
create policy dmetric_robos_ver on public.dmetric_robos
	for select to authenticated using ((select public.tem_permissao('dmetric', 'ver')));

-- O IP é de robô? Devolve o nome da rede, ou null. IP inválido ou vazio: null.
create or replace function public.dmetric_rede_robo(p_ip text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_ip inet;
	v_nome text;
begin
	if coalesce(p_ip, '') = '' then
		return null;
	end if;
	begin
		v_ip := p_ip::inet;
	exception when others then
		return null;
	end;
	select nome into v_nome from public.dmetric_redes_robo where rede >>= v_ip limit 1;
	return v_nome;
end;
$$;
revoke all on function public.dmetric_rede_robo(text) from public, anon, authenticated;

-- Mais um acesso de robô no site, hoje. Sem site (domínio que não está no DMetric), nada.
create or replace function public.dmetric_contar_robo(p_site uuid, p_rede text)
returns void
language sql
security definer
set search_path = public
as $$
	insert into public.dmetric_robos as r (site_id, dia, rede, acessos)
	select p_site, (now() at time zone 'America/Sao_Paulo')::date, left(coalesce(nullif(p_rede, ''), 'Robô'), 60), 1
	where p_site is not null
	on conflict (site_id, dia, rede) do update set acessos = r.acessos + 1;
$$;
revoke all on function public.dmetric_contar_robo(uuid, text) from public, anon, authenticated;

-- Texto para cidr, ou null se não for uma faixa válida (o cron manda o que as fontes
-- publicam). "1.2.3.4/24" vira "1.2.3.0/24" em vez de ser descartada.
create or replace function public.dmetric_cidr_ou_nulo(p text)
returns cidr
language plpgsql
immutable
as $$
begin
	return network(p::inet);
exception when others then
	return null;
end;
$$;

-- O cron troca as faixas de uma fonte de uma vez. Lista vazia não apaga nada.
create or replace function public.dmetric_redes_robo_trocar(p_segredo text, p_fonte text, p_nome text, p_redes text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	v_n integer;
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return -1;
	end if;
	if coalesce(array_length(p_redes, 1), 0) = 0 or coalesce(p_fonte, '') = '' then
		return 0;
	end if;
	delete from public.dmetric_redes_robo where fonte = p_fonte;
	insert into public.dmetric_redes_robo (rede, nome, fonte)
	select distinct r, left(p_nome, 60), left(p_fonte, 40)
	from (select public.dmetric_cidr_ou_nulo(x) as r from unnest(p_redes) x) t
	where r is not null
	on conflict (rede) do nothing;
	get diagnostics v_n = row_count;
	return v_n;
end;
$$;
revoke all on function public.dmetric_redes_robo_trocar(text, text, text, text[]) from public;
grant execute on function public.dmetric_redes_robo_trocar(text, text, text, text[]) to anon, authenticated, service_role;

-- O robô que se diz robô (pelo navegador): conta no site, com o nome dele.
create or replace function public.dmetric_robo_declarado(p_segredo text, p_chave text, p_host text, p_caminho text, p_robo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return false;
	end if;
	perform public.dmetric_contar_robo(public.dmetric_site_existente(p_chave, p_host, p_caminho), p_robo);
	return true;
end;
$$;
revoke all on function public.dmetric_robo_declarado(text, text, text, text, text) from public;
grant execute on function public.dmetric_robo_declarado(text, text, text, text, text) to anon, authenticated, service_role;

-- Os robôs filtrados no período, por rede (a barra do painel mostra o total).
create or replace function public.dmetric_robos_resumo(p_site uuid, p_de date, p_ate date)
returns jsonb
language sql
stable
set search_path = public
as $$
	select coalesce(jsonb_agg(jsonb_build_object('rede', rede, 'acessos', n) order by n desc, rede), '[]'::jsonb)
	from (
		select rede, sum(acessos)::int as n
		from public.dmetric_robos
		where dia between p_de and p_ate and (p_site is null or site_id = p_site)
		group by rede
	) t;
$$;
grant execute on function public.dmetric_robos_resumo(uuid, date, date) to authenticated;

-- ---------- 2. Coleta (a mesma da 0091), com a conferência da rede ----------
-- As assinaturas antigas saem: com p_ip opcional no fim, a rota antiga (sem o IP)
-- continua batendo nelas até o deploy novo.
drop function if exists public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text, text, text, text);
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
	p_titulo text,
	p_ip text default null
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
	v_robo text;
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return false;
	end if;
	-- Robô de data center (a rede da Meta, as nuvens): não é visita. Conta no
	-- contador de robôs do site, se o site já existe — robô não cria site.
	v_robo := public.dmetric_rede_robo(p_ip);
	if v_robo is not null then
		perform public.dmetric_contar_robo(public.dmetric_site_existente(p_chave, p_host, p_caminho), v_robo);
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
revoke all on function public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated, service_role;

-- ---------- Clique e tempo de tela (os mesmos da 0091) ----------
drop function if exists public.dmetric_evento(text, text, text, text, text, text, integer, text);
create or replace function public.dmetric_evento(
	p_segredo text,
	p_chave text,
	p_host text,
	p_caminho text,
	p_tipo text,
	p_valor text,
	p_segundos integer,
	p_visitante text default null,
	p_ip text default null
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
	-- Clique e tempo de tela de robô de data center não entram (a página vista
	-- dele já ficou no contador de robôs).
	if public.dmetric_rede_robo(p_ip) is not null then
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
revoke all on function public.dmetric_evento(text, text, text, text, text, text, integer, text, text) from public;
grant execute on function public.dmetric_evento(text, text, text, text, text, text, integer, text, text) to anon, authenticated, service_role;

-- ---------- Saúde (a mesma da 0083) ----------
drop function if exists public.dmetric_saude(text, text, text, text, text, jsonb);
create or replace function public.dmetric_saude(
	p_segredo text,
	p_chave text,
	p_host text,
	p_caminho text,
	p_tipo text,
	p_dados jsonb,
	p_ip text default null
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
	-- Erro e velocidade medidos por robô de data center não são do visitante.
	if public.dmetric_rede_robo(p_ip) is not null then
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
		insert into public.dmetric_erros as e (site_id, dia, tipo, mensagem, pagina, origem, ocorrencias, ultimo_em)
		values (
			v_site, v_dia,
			case when p_tipo = '404' then '404' when (p_dados ->> 'recurso')::boolean then 'recurso' else 'js' end,
			left(coalesce(nullif(case when p_tipo = '404' then v_caminho else p_dados ->> 'mensagem' end, ''), 'Erro sem mensagem'), 200),
			v_caminho,
			v_origem,
			1,
			now()
		)
		on conflict (site_id, dia, tipo, mensagem, pagina) do update
			set ocorrencias = e.ocorrencias + 1,
				ultimo_em = now(),
				origem = case when excluded.origem <> '' then excluded.origem else e.origem end;
		-- Faxina de vez em quando: erros da página (JS e arquivo) que não se
		-- repetiram em 72 horas — o painel já não mostra —, e 404 de mais de 90 dias.
		if random() < 0.05 then
			delete from public.dmetric_erros
				where (tipo in ('js', 'recurso') and ultimo_em < now() - interval '72 hours')
					or dia < v_dia - 90;
		end if;
		return true;
	end if;

	return false;
end;
$$;
revoke all on function public.dmetric_saude(text, text, text, text, text, jsonb, text) from public;
grant execute on function public.dmetric_saude(text, text, text, text, text, jsonb, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
