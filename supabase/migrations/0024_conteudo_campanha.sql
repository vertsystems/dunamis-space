-- Conteúdo: nome da campanha (texto livre, reaproveitado via autocomplete das
-- campanhas já digitadas). Idempotente.

alter table public.conteudos add column if not exists campanha text;
create index if not exists idx_conteudos_campanha on public.conteudos (campanha);
