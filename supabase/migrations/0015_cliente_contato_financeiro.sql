-- Contato financeiro estruturado: além do nome (contato_financeiro), e-mail e
-- WhatsApp próprios. Idempotente.

alter table public.clientes add column if not exists contato_financeiro_email text;
alter table public.clientes add column if not exists contato_financeiro_whatsapp text;
