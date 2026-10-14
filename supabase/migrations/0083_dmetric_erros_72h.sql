-- ============================================================
-- DMetric — os erros da página valem por 72 horas
--
-- O bloco "Erros na página" (Saúde) mostrava tudo do período escolhido e ia
-- acumulando o que já foi corrigido. Agora ele mostra só os erros de
-- JavaScript e os arquivos que não carregaram nas últimas 72 horas: o que foi
-- corrigido some sozinho quando passa 72 horas sem acontecer, e o que continua
-- acontecendo fica no topo. Os que passaram das 72 horas saem também do banco
-- (na faxina da própria coleta).
--
-- Para isso cada linha guarda quando o erro aconteceu por último (ultimo_em).
-- A nota de "Erros" passa a comparar com as páginas abertas no mesmo trecho
-- (visualizacoes_72h). Os links quebrados (404) continuam seguindo o período.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0083_dmetric_erros_72h.sql
-- ============================================================

alter table public.dmetric_erros add column if not exists ultimo_em timestamptz;
-- As linhas que já existem: o fim do dia delas (ou agora, se for hoje).
update public.dmetric_erros
	set ultimo_em = least(now(), ((dia + 1)::timestamp at time zone 'America/Sao_Paulo') - interval '1 second')
	where ultimo_em is null;
alter table public.dmetric_erros alter column ultimo_em set default now();
alter table public.dmetric_erros alter column ultimo_em set not null;
create index if not exists idx_dmetric_erros_ultimo_em on public.dmetric_erros (ultimo_em);

-- ---------- Registrar saúde: agora com ultimo_em ----------
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
revoke all on function public.dmetric_saude(text, text, text, text, text, jsonb) from public;
grant execute on function public.dmetric_saude(text, text, text, text, text, jsonb) to anon, authenticated, service_role;

-- ---------- Painel de saúde ----------
-- Erros de JS e arquivos: os das últimas 72 horas, seja qual for o período.
-- 404: os do período. visualizacoes_72h: as páginas vistas dos dias que as 72
-- horas alcançam, para a nota de erros comparar o mesmo trecho.
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
				'origem', origem, 'ocorrencias', n, 'ultimo', ultimo, 'ultimo_em', ultimo_em) order by n desc)
			from (
				select site_id, tipo, mensagem, pagina, max(origem) origem, sum(ocorrencias)::int n, max(dia) ultimo,
					max(ultimo_em) ultimo_em
				from public.dmetric_erros
				where (p_site is null or site_id = p_site)
					and (
						(tipo in ('js', 'recurso') and ultimo_em >= now() - interval '72 hours')
						or (tipo = '404' and dia between p_de and p_ate)
					)
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
		), '[]'::jsonb),
		'visualizacoes_72h', coalesce((
			select jsonb_agg(jsonb_build_object('site_id', site_id, 'visualizacoes', n))
			from (
				select site_id, sum(visualizacoes)::int n
				from public.dmetric_diario
				where dimensao = 'total'
					and dia >= ((now() - interval '72 hours') at time zone 'America/Sao_Paulo')::date
					and (p_site is null or site_id = p_site)
				group by site_id
			) t
		), '[]'::jsonb)
	);
$$;
grant execute on function public.dmetric_saude_painel(uuid, date, date) to authenticated;

notify pgrst, 'reload schema';
