-- ============================================================
-- DMetric — a permissão conferida uma vez por consulta, não linha a linha
--
-- As regras de acesso (RLS) das tabelas do DMetric chamavam
-- public.tem_permissao(...) direto. Como a função é security definer, o
-- Postgres não consegue "dobrá-la" na consulta e a executa para cada linha
-- lida: quanto mais dados no DMetric, mais lento o painel.
--
-- O resto do Dunamis Space escreve (select public.tem_permissao(...)), que o
-- Postgres avalia uma vez só por consulta (0036, 0040). Aqui fica igual: o
-- mesmo resultado, sem o custo por linha.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0087_dmetric_permissao_uma_vez.sql
-- ============================================================

alter policy dmetric_sites_ver on public.dmetric_sites
	using ((select public.tem_permissao('dmetric', 'ver')));
alter policy dmetric_sites_editar on public.dmetric_sites
	using ((select public.tem_permissao('dmetric', 'editar')))
	with check ((select public.tem_permissao('dmetric', 'editar')));

alter policy dmetric_historico_ver on public.dmetric_historico
	using ((select public.tem_permissao('dmetric', 'ver')));
alter policy dmetric_historico_editar on public.dmetric_historico
	using ((select public.tem_permissao('dmetric', 'editar')))
	with check ((select public.tem_permissao('dmetric', 'editar')));

alter policy dmetric_diario_ver on public.dmetric_diario
	using ((select public.tem_permissao('dmetric', 'ver')));
alter policy dmetric_recentes_ver on public.dmetric_recentes
	using ((select public.tem_permissao('dmetric', 'ver')));
alter policy dmetric_paginas_ver on public.dmetric_paginas
	using ((select public.tem_permissao('dmetric', 'ver')));
alter policy dmetric_vitais_ver on public.dmetric_vitais
	using ((select public.tem_permissao('dmetric', 'ver')));
alter policy dmetric_erros_ver on public.dmetric_erros
	using ((select public.tem_permissao('dmetric', 'ver')));
alter policy dmetric_cidades_pais_ver on public.dmetric_cidades_pais
	using ((select public.tem_permissao('dmetric', 'ver')));
