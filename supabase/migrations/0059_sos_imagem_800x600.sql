-- ============================================================
-- SOS — caixa do print passa de 640x480 para 800x600
--
-- 640x480 economizava banda, mas o print chegava apertado demais para ler o
-- erro na tela. 800x600 dá resolução de sobra sem sair do teto do bucket:
-- medido em navegador com ruído aleatório (pior caso possível para o
-- compressor), o WEBP sai em 187 KB contra os 512 KB permitidos — e um print
-- de verdade fica bem abaixo disso. Por isso o file_size_limit não muda.
--
-- Aqui só o comentário da coluna, que é a documentação que fica no banco. A
-- regra de verdade é do app (SOS_MAX_W/SOS_MAX_H em src/lib/sosImagem.ts).
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0059_sos_imagem_800x600.sql
-- ============================================================

comment on column public.sos_chamados.imagem_url is
	'URL pública do print do problema (WEBP até 800x600). Nulo = chamado sem imagem.';
