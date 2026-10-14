-- ============================================================
-- DMetric — o gráfico "Visitas por dia" com mês e calendário próprios
--
-- O gráfico deixou de seguir o filtro de período do topo: tem a própria
-- escolha (um mês, um ano inteiro ou os dias do calendário, até 1 ano). Daí:
--   dmetric_por_dia: as visitas de cada dia de um intervalo, já somadas entre
--     os sites (um ano de vários sites passaria do limite de linhas da API);
--   dmetric_primeiro_dia: o primeiro dia que o script contou — antes dele o
--     gráfico mostra "sem dados", não zero.
-- Ambas com a permissão de quem chama (RLS de dmetric_diario).
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0082_dmetric_grafico_por_dia.sql
-- ============================================================

create or replace function public.dmetric_por_dia(p_site uuid, p_de date, p_ate date)
returns table (dia date, visitas integer, visualizacoes integer)
language sql
stable
set search_path = public
as $$
	select dia, sum(visitas)::int, sum(visualizacoes)::int
	from public.dmetric_diario
	where dimensao = 'total'
		and dia between p_de and least(p_ate, p_de + 366)
		and (p_site is null or site_id = p_site)
	group by dia
	order by dia;
$$;
grant execute on function public.dmetric_por_dia(uuid, date, date) to authenticated;

create or replace function public.dmetric_primeiro_dia(p_site uuid)
returns date
language sql
stable
set search_path = public
as $$
	select min(dia) from public.dmetric_diario
	where dimensao = 'total' and (p_site is null or site_id = p_site);
$$;
grant execute on function public.dmetric_primeiro_dia(uuid) to authenticated;

notify pgrst, 'reload schema';
