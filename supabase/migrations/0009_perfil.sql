-- ============================================================
-- Dunamis Space — Perfil do usuário
-- Campos de perfil por colaborador + preferências pessoais de tema/idioma.
-- Cada login edita a própria linha (match por email = auth email).
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0009_perfil.sql
-- ============================================================

-- ---------- Campos de perfil / contato ----------
alter table public.colaboradores add column if not exists telefone   text;
alter table public.colaboradores add column if not exists local      text;  -- localização (cidade/UF)
alter table public.colaboradores add column if not exists avatar_url text;

-- ---------- Preferências pessoais (por login) ----------
-- cor_tema: hex "#rrggbb" que sobrescreve a primária do sistema só para este usuário.
alter table public.colaboradores add column if not exists cor_tema text;
alter table public.colaboradores add column if not exists idioma   text not null default 'pt-BR';
