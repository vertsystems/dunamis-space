-- ============================================================
-- DMetric — os números de cada site no período (a lista de sites do painel)
--
-- O painel ganhou a lista de sites no estilo da tabela do Google Analytics:
-- páginas vistas, visitas, tempo e cliques de cada site, lado a lado. Só o que
-- o script do DMetric contou: o histórico importado do GA é da propriedade
-- inteira, não de um site.
--
-- Roda como quem chama (security invoker): o RLS do módulo 'dmetric' vale aqui.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0076_dmetric_por_site.sql
-- ============================================================

create or replace function public.dmetric_por_site(p_de date, p_ate date)
returns table (site_id uuid, visitas integer, visualizacoes integer, segundos bigint, cliques integer)
language sql
stable
set search_path = public
as $$
	select
		site_id,
		coalesce(sum(visitas) filter (where dimensao = 'total'), 0)::int,
		coalesce(sum(visualizacoes) filter (where dimensao = 'total'), 0)::int,
		coalesce(sum(segundos) filter (where dimensao = 'total'), 0)::bigint,
		coalesce(sum(visualizacoes) filter (where dimensao = 'clique'), 0)::int
	from public.dmetric_diario
	where dia between p_de and p_ate
		and dimensao in ('total', 'clique')
	group by site_id;
$$;

grant execute on function public.dmetric_por_site(date, date) to authenticated;

notify pgrst, 'reload schema';
