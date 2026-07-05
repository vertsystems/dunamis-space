-- ============================================================
-- 0014: Tipos do conteúdo (multi-seleção, como as redes)
-- Um post pode ser de mais de um tipo (ex.: Feed + Reels), por isso um
-- array de texto. Valores validados no app (CONTEUDO_TIPO em
-- src/lib/conteudo.ts). A coluna enum `tipo` é mantida = primeiro tipo,
-- para compatibilidade com telas/relatórios que leem um único tipo.
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

alter table public.conteudos
	add column if not exists tipos text[] not null default '{}';

comment on column public.conteudos.tipos is
	'Tipos do post (multi), ex.: {feed,reels}. Validados no app (CONTEUDO_TIPO). A coluna tipo espelha o primeiro.';

-- Backfill: conteúdos existentes recebem [tipo].
update public.conteudos set tipos = array[tipo::text]
	where coalesce(array_length(tipos, 1), 0) = 0;
