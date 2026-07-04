-- ============================================================
-- 0011: Redes sociais do conteúdo (cross-post)
-- Um post pode ir para mais de uma rede (ex.: Instagram e TikTok),
-- por isso um array de texto. Os valores válidos são controlados no
-- app (CONTEUDO_REDE em src/lib/conteudo.ts): 'instagram', 'tiktok', ...
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

alter table public.conteudos
	add column if not exists redes text[] not null default '{}';

comment on column public.conteudos.redes is
	'Redes sociais do post (cross-post), ex.: {instagram,tiktok}. Valores validados no app (CONTEUDO_REDE).';
