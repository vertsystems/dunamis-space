-- ============================================================
-- DMetric — "agora no site" olha os últimos 15 minutos
--
-- Eram 5 (0080). Em página de link na bio a pessoa fica pouco e sai: com 5
-- minutos o número piscava entre 0 e 1. Com 15, quem abriu uma página há
-- pouco ainda conta como "no site". Vale para o contador do painel, para o
-- mapa que pulsa e para o modo TV, que leem todos desta função.
--
-- A lista recente guarda 48 horas (0077): 15 minutos cabem com folga.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0084_dmetric_agora_15min.sql
-- ============================================================

create or replace function public.dmetric_agora(p_site uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
	with v as (
		select * from public.dmetric_recentes
		where tipo = 'v' and em >= now() - interval '15 minutes'
			and (p_site is null or site_id = p_site)
	),
	-- A página mais recente de cada pessoa: é onde ela está agora.
	ultima as (
		select distinct on (site_id, visitante) * from v order by site_id, visitante, em desc
	)
	select jsonb_build_object(
		'pessoas', (select count(*) from ultima),
		'paises', coalesce((select jsonb_agg(jsonb_build_object('pais', pais, 'pessoas', n) order by n desc)
			from (select pais, count(*)::int n from ultima where coalesce(pais, '') <> '' group by pais) t), '[]'::jsonb),
		'paginas', coalesce((select jsonb_agg(jsonb_build_object('site_id', site_id, 'caminho', caminho, 'pessoas', n) order by n desc)
			from (select site_id, caminho, count(*)::int n from ultima group by site_id, caminho) t), '[]'::jsonb),
		'cidades', coalesce((select jsonb_agg(jsonb_build_object('cidade', cidade, 'pessoas', n) order by n desc)
			from (select cidade, count(*)::int n from ultima where coalesce(cidade, '') <> '' group by cidade) t), '[]'::jsonb)
	);
$$;
grant execute on function public.dmetric_agora(uuid) to authenticated;

notify pgrst, 'reload schema';
