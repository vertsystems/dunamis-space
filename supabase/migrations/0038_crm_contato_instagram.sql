-- ============================================================
-- CRM — adiciona Instagram e Site ao contato (acesso rápido).
-- Idempotente.
-- ============================================================
alter table public.crm_contatos add column if not exists instagram text;
alter table public.crm_contatos add column if not exists site text;
