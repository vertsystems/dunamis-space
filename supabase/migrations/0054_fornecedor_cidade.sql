-- ============================================================
-- Fornecedores — cidade de origem
--
-- O cadastro dizia o que o fornecedor faz e como falar com ele, mas não de
-- onde ele é. Para freelancer e parceiro isso decide contratação (deslocamento,
-- atendimento presencial), então vira campo próprio em vez de virar texto solto
-- nas observações.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0054_fornecedor_cidade.sql
-- ============================================================

alter table public.adm_fornecedores
	add column if not exists cidade text;

comment on column public.adm_fornecedores.cidade is
	'Cidade de origem do fornecedor (ex.: "Sorocaba SP").';
