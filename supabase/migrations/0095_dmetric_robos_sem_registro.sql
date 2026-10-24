-- ============================================================
-- DMetric — robô só é descartado, sem registro
--
-- A 0092 contava os robôs que ficavam de fora (dmetric_robos) e a barra do
-- painel mostrava "N robôs filtrados". O Bruno não quer nem o número
-- (24/10/2026): robô não tem valor para ele. Fica só o filtro.
--
--   - A coleta (a mesma da 0092) descarta o robô de rede sem contar.
--   - Saem a tabela dmetric_robos (com o que já tinha contado) e as funções
--     dmetric_contar_robo, dmetric_robo_declarado e dmetric_robos_resumo. O
--     robô que se diz robô pelo navegador já sai na rota, como antes da 0092.
--   - Continuam: as faixas de rede (dmetric_redes_robo), a conferência
--     (dmetric_rede_robo) e o cron semanal que renova as faixas.
--
-- Idempotente. Aplicar depois do deploy que tira as chamadas do app.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0095_dmetric_robos_sem_registro.sql
-- ============================================================

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
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return false;
	end if;
	-- Robô de data center (a rede da Meta, as nuvens): não é visita, e não fica
	-- registrado em lugar nenhum. Antes de achar o site: robô não cria site.
	if public.dmetric_rede_robo(p_ip) is not null then
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

drop function if exists public.dmetric_robo_declarado(text, text, text, text, text);
drop function if exists public.dmetric_robos_resumo(uuid, date, date);
drop function if exists public.dmetric_contar_robo(uuid, text);
drop table if exists public.dmetric_robos;

notify pgrst, 'reload schema';
