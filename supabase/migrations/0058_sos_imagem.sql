-- ============================================================
-- SOS — print do problema
--
-- Descrever um bug por escrito é o que trava o chamado: "deu erro ao salvar"
-- sem a tela não diz quase nada. Agora o chamado leva uma imagem.
--
-- O app converte para WEBP e reduz para caber em 640x480 ANTES de subir (ver
-- src/lib/sosImagem.ts). Aqui o bucket reforça a regra, porque validação de
-- navegador não é barreira: só image/webp, no máximo 512 KB — folga larga para
-- um print de 640x480, que costuma ficar abaixo de 80 KB.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0058_sos_imagem.sql
-- ============================================================

alter table public.sos_chamados
	add column if not exists imagem_url text;

comment on column public.sos_chamados.imagem_url is
	'URL pública do print do problema (WEBP até 640x480). Nulo = chamado sem imagem.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sos', 'sos', true, 524288, array['image/webp'])
on conflict (id) do update
	set public = true,
		file_size_limit = 524288,
		allowed_mime_types = array['image/webp'];

-- Mesmas regras do bucket de clientes (0044): leitura pública, escrita de
-- qualquer autenticado.
drop policy if exists "sos_imagem_leitura" on storage.objects;
create policy "sos_imagem_leitura" on storage.objects
	for select to public using (bucket_id = 'sos');

drop policy if exists "sos_imagem_escrita" on storage.objects;
create policy "sos_imagem_escrita" on storage.objects
	for insert to authenticated with check (bucket_id = 'sos');

drop policy if exists "sos_imagem_update" on storage.objects;
create policy "sos_imagem_update" on storage.objects
	for update to authenticated using (bucket_id = 'sos') with check (bucket_id = 'sos');

drop policy if exists "sos_imagem_remocao" on storage.objects;
create policy "sos_imagem_remocao" on storage.objects
	for delete to authenticated using (bucket_id = 'sos');

notify pgrst, 'reload schema';
