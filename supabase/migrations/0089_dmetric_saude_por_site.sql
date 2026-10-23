-- ============================================================
-- DMetric — a nota de erros da Saúde conta todos os erros de cada site
--
-- dmetric_saude_painel (0083) mandava os 60 erros mais frequentes somando
-- TODOS os sites, e a nota de cada site saía dessa lista. Em "Todos os sites",
-- um site cujos erros ficavam fora dos 60 aparecia com "nenhum erro" e nota
-- 100 em erros e em links quebrados.
--
-- Agora:
--   erros: os 60 mais frequentes de CADA site (o que a tela e o PDF mostram);
--   erros_resumo: por site e por tipo (js, recurso, 404), quantos erros
--     diferentes e quantas ocorrências no total — é daqui que sai a nota,
--     sem corte nenhum.
-- As janelas continuam as da 0083: JS e arquivos nas últimas 72 horas, 404 no
-- período escolhido.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0089_dmetric_saude_por_site.sql
-- ============================================================

create or replace function public.dmetric_saude_painel(p_site uuid, p_de date, p_ate date)
returns jsonb
language sql
stable
set search_path = public
as $$
	with erros as (
		select site_id, tipo, mensagem, pagina, max(origem) as origem, sum(ocorrencias)::int as n, max(dia) as ultimo,
			max(ultimo_em) as ultimo_em
		from public.dmetric_erros
		where (p_site is null or site_id = p_site)
			and (
				(tipo in ('js', 'recurso') and ultimo_em >= now() - interval '72 hours')
				or (tipo = '404' and dia between p_de and p_ate)
			)
		group by site_id, tipo, mensagem, pagina
	)
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
		-- Os 60 mais frequentes de cada site.
		'erros', coalesce((
			select jsonb_agg(jsonb_build_object('site_id', site_id, 'tipo', tipo, 'mensagem', mensagem, 'pagina', pagina,
				'origem', origem, 'ocorrencias', n, 'ultimo', ultimo, 'ultimo_em', ultimo_em) order by n desc)
			from (
				select *, row_number() over (partition by site_id order by n desc, ultimo_em desc) as pos
				from erros
			) t
			where pos <= 60
		), '[]'::jsonb),
		-- Todos os erros de cada site, contados: a base da nota.
		'erros_resumo', coalesce((
			select jsonb_agg(jsonb_build_object('site_id', site_id, 'tipo', tipo, 'distintos', d, 'ocorrencias', o))
			from (
				select site_id, tipo, count(*)::int as d, sum(n)::int as o
				from erros
				group by site_id, tipo
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
