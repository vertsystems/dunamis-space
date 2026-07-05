-- Fornecedores: link do site e do Instagram. Idempotente.

alter table public.adm_fornecedores add column if not exists site text;
alter table public.adm_fornecedores add column if not exists instagram text;
