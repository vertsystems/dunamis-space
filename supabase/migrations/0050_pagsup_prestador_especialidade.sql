-- ============================================================
-- Pag's Up — descrição do serviço do prestador
--
-- `servico` acumulava dois papéis: agrupar (é o título do bloco na tela e na
-- planilha) e descrever o que a pessoa faz. Enquanto cada descrição virava um
-- grupo próprio isso passava, mas ao juntar algodão doce, pipoca e pintura
-- facial em "Eventos Indoor" a informação de quem faz o quê se perdeu.
--
-- Agora são dois campos: `servico` agrupa, `especialidade` descreve. A coluna
-- Serviço da tela mostra a especialidade quando existir — antes ela repetia,
-- em toda linha, o mesmo texto do cabeçalho do grupo.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0050_pagsup_prestador_especialidade.sql
-- ============================================================

alter table public.pagsup_prestadores
	add column if not exists especialidade text;

comment on column public.pagsup_prestadores.especialidade is
	'O que o prestador faz dentro da categoria (ex.: "Pintura Facial" em Eventos Indoor).';
