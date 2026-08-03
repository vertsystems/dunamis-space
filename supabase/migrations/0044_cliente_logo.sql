-- ============================================================
-- Dunamis Space — Foto (logo) do cliente
-- Coluna com a URL pública + bucket de Storage onde o arquivo é guardado.
-- O app só aceita WEBP de até 200x200; aqui o bucket reforça o formato e um
-- teto de tamanho, porque a validação do navegador não é barreira de verdade.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0044_cliente_logo.sql
-- ============================================================

alter table public.clientes
	add column if not exists logo_url text;

-- Bucket público: a foto aparece na ficha do cliente sem URL assinada.
-- 200x200 em WEBP não passa de ~40 KB; 256 KB deixa folga sem virar depósito.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clientes', 'clientes', true, 262144, array['image/webp'])
on conflict (id) do update
	set public = true,
		file_size_limit = 262144,
		allowed_mime_types = array['image/webp'];

-- Leitura: pública (o bucket é público, mas a policy explícita evita depender
-- só da flag). Escrita/remoção: qualquer autenticado, como no resto do schema.
drop policy if exists "clientes_logo_leitura" on storage.objects;
create policy "clientes_logo_leitura" on storage.objects
	for select to public using (bucket_id = 'clientes');

drop policy if exists "clientes_logo_escrita" on storage.objects;
create policy "clientes_logo_escrita" on storage.objects
	for insert to authenticated with check (bucket_id = 'clientes');

drop policy if exists "clientes_logo_update" on storage.objects;
create policy "clientes_logo_update" on storage.objects
	for update to authenticated using (bucket_id = 'clientes') with check (bucket_id = 'clientes');

drop policy if exists "clientes_logo_remocao" on storage.objects;
create policy "clientes_logo_remocao" on storage.objects
	for delete to authenticated using (bucket_id = 'clientes');
