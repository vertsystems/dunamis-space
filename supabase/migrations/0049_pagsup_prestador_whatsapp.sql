-- ============================================================
-- Pag's Up — WhatsApp do prestador
--
-- Falava-se com o prestador por fora do sistema: o cadastro só tinha a chave
-- Pix, e nela o telefone é coincidência — dos 77 prestadores, 30 tinham número
-- ali e os outros 47 tinham CNPJ, e-mail ou nada. Daí uma coluna própria, para
-- o contato não depender da forma de pagamento escolhida.
--
-- Texto livre, como cpf/pix: o número é digitado como vier (com ou sem máscara)
-- e normalizado na hora de montar o link.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0049_pagsup_prestador_whatsapp.sql
-- ============================================================

alter table public.pagsup_prestadores
	add column if not exists whatsapp text;

comment on column public.pagsup_prestadores.whatsapp is
	'Telefone de contato do prestador (WhatsApp). Só dígitos ou com máscara — normalizado no app.';
