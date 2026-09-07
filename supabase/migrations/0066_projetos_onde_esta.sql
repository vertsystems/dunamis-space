-- ============================================================
-- Projetos: campos fixos de "onde está" e o fim do cofre por projeto.
--
-- Decisão de uso (07/09/2026): o que ele procura quando volta a um projeto é
-- sempre a mesma meia dúzia de endereços — a URL do que está no ar, o
-- repositório, quem hospeda, em que banco os dados vivem. Isso é campo com
-- rótulo, não parágrafo de anotação: em campo dá para ver de relance no cartão
-- e clicar, no meio do texto não dá.
--
-- E o cofre por projeto (projeto_vault, criado na 0064 há poucas horas) sai:
-- ele preferiu registrar senha e acesso dentro da própria descrição, que já é
-- texto formatado. Uma tela a menos para manter. O cofre do CLIENTE
-- (cliente_vault, 0051) continua igual — é outro caso de uso e segue em pé.
--
-- Seguro de rodar: projetos e projeto_vault estavam ambos vazios (0 linhas em
-- 07/09/2026), então nenhum acesso guardado se perde aqui.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='<senha-postgres>' node scripts/run_migration.mjs supabase/migrations/0066_projetos_onde_esta.sql
-- ============================================================

-- ---------- 1. Onde o projeto está ----------
-- Texto livre de propósito: "Supabase (projeto rboenllp…)" e "VPS da Hostinger"
-- dizem mais do que qualquer lista fechada daria conta de prever.
alter table public.projetos add column if not exists url text;
alter table public.projetos add column if not exists repositorio text;
alter table public.projetos add column if not exists hospedagem text;
alter table public.projetos add column if not exists banco_dados text;

comment on column public.projetos.url is 'Endereço do que está no ar (produção).';
comment on column public.projetos.repositorio is 'Onde mora o código (GitHub, GitLab…).';
comment on column public.projetos.hospedagem is 'Quem serve o projeto (Vercel, VPS, FTP…).';
comment on column public.projetos.banco_dados is 'Onde os dados vivem (Supabase, SQLite, Postgres…).';

-- ---------- 2. O cofre por projeto sai ----------
-- As policies e o trigger caem junto com a tabela.
drop table if exists public.projeto_vault;
