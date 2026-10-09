-- ============================================================
-- Pag's Up — PDFs de NF/recibo até 70 KB (eram 50 KB)
--
-- No teto de 50 KB a versão digitalizada saía em preto e branco puro, e a
-- letra ficava serrilhada ("corroída"). Com 70 KB o app passa a digitalizar em
-- quatro tons de cinza a 200 DPI (ver src/lib/pagsup/compactarPdf.ts), e mais
-- NFs cabem como vieram, com o texto intacto.
--
-- Só o bucket muda; os PDFs já enviados ficam como estão.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0071_pagsup_docs_70kb.sql
-- ============================================================

update storage.buckets
	set file_size_limit = 71680
	where id = 'pagsup-docs';
