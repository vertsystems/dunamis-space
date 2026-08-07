-- ============================================================
-- Ferramentas & Contas passa a ser só da AGÊNCIA.
--
-- Os acessos de cliente agora vivem no Vault, dentro da área de cada cliente
-- (0051). Manter cliente_id aqui deixaria o mesmo dado em dois lugares — e a
-- tela já não oferece mais o campo.
--
-- Seguro: a coluna estava sem nenhuma linha preenchida quando isto rodou
-- (select count(cliente_id) from adm_acessos = 0). Se um dia precisar voltar,
-- basta recriar a coluna com a FK para clientes.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='<senha-postgres>' node scripts/run_migration.mjs supabase/migrations/0052_acessos_so_agencia.sql
-- ============================================================

alter table public.adm_acessos drop column if exists cliente_id;

comment on table public.adm_acessos is
	'Contas e logins da AGÊNCIA (tela Ferramentas & Contas). Acessos de cliente ficam em cliente_vault.';
