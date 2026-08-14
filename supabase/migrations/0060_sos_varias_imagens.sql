-- ============================================================
-- SOS — até 5 prints por chamado
--
-- Um print raramente conta a história inteira: a tela do erro, o console e o
-- que foi preenchido antes são três imagens. O limite de 5 é do app
-- (SOS_MAX_IMAGENS em src/lib/sosImagem.ts).
--
-- `imagem_url` continua existindo e espelha a PRIMEIRA imagem, como
-- responsavel_id espelha responsaveis_ids no cadastro de clientes: assim o
-- deploy do código e a migration podem acontecer em qualquer ordem sem que
-- enviar um chamado quebre no meio.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0060_sos_varias_imagens.sql
-- ============================================================

alter table public.sos_chamados
	add column if not exists imagens text[] not null default '{}';

comment on column public.sos_chamados.imagens is
	'Prints do problema (WEBP até 800x600), no máximo 5. imagem_url espelha o primeiro.';

-- Chamado gravado com o campo antigo entra na lista. Só mexe em quem ainda não
-- tem lista, então rodar de novo não duplica.
update public.sos_chamados
set imagens = array[imagem_url]
where imagens = '{}'
	and coalesce(imagem_url, '') <> '';

notify pgrst, 'reload schema';
