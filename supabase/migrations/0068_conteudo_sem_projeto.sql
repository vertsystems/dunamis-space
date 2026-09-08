-- ============================================================
-- Conteúdo deixa de apontar para um projeto.
--
-- Sobra da 0065: quando Projetos virou o caderno técnico do Bruno — projetos
-- DELE, sem cliente dono — a caixinha "Projeto" continuou no formulário de
-- Conteúdo. Ela passou a oferecer os projetos pessoais como opção para uma peça
-- de cliente, que é uma pergunta sem resposta certa: não existe mais relação
-- entre um post de Instagram e um projeto próprio.
--
-- A 0065 já tinha escrito a regra que se aplica aqui: coluna que a tela não
-- preenche vira campo fantasma, e campo fantasma mente para quem lê o schema
-- depois. Como a tela some nesta mesma leva, a coluna sai junto.
--
-- Seguro de rodar: `projetos` estava vazia em 07/09/2026 (a própria 0065
-- confirma) e a FK é `on delete set null`, então todo `conteudos.projeto_id`
-- só pode estar em NULL — não há vínculo a perder. O índice criado na 0040
-- cai junto com a coluna; o drop explícito é para quem lê o histórico.
--
-- Depois de rodar, atualize os tipos do banco com `npm run tipos`.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='<senha-postgres>' node scripts/run_migration.mjs supabase/migrations/0068_conteudo_sem_projeto.sql
-- ============================================================

drop index if exists idx_conteudos_projeto;

alter table public.conteudos drop column if exists projeto_id;
