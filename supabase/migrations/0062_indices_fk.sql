-- ============================================================
-- Índices nas chaves estrangeiras que não tinham nenhum.
--
-- Por que importa: sem índice na coluna filha, apagar ou atualizar a linha PAI
-- obriga o Postgres a varrer a tabela filha inteira para checar quem apontava
-- para ela. Some isso a uma tabela grande e uma operação simples ("excluir
-- prestador") vira travamento. Hoje nenhuma tabela tem tamanho para doer — é
-- exatamente por isso que a hora de criar é agora, com o banco pequeno.
--
-- Diagnóstico de 26/08/2026: 13 FKs sem índice. Cada índice destes ocupa 8 kB.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='<senha-postgres>' node scripts/run_migration.mjs supabase/migrations/0062_indices_fk.sql
-- ============================================================

-- Quem é o responsável por… (todas apontam para colaboradores)
create index if not exists idx_adm_acessos_responsavel on public.adm_acessos (responsavel_id);
create index if not exists idx_adm_ferramentas_responsavel on public.adm_ferramentas (responsavel_id);
create index if not exists idx_adm_onboarding_itens_responsavel on public.adm_onboarding_itens (responsavel_id);
create index if not exists idx_cliente_vault_responsavel on public.cliente_vault (responsavel_id);
create index if not exists idx_cliente_interacoes_colaborador on public.cliente_interacoes (colaborador_id);
create index if not exists idx_comentarios_colaborador on public.comentarios (colaborador_id);
create index if not exists idx_jobs_criado_por on public.jobs (criado_por);
create index if not exists idx_ponto_ajustes_decidido_por on public.ponto_ajustes (decidido_por);
create index if not exists idx_ponto_registros_editado_por on public.ponto_registros (editado_por);

-- Pag's Up: as duas que mais crescem (476 pagamentos e subindo).
create index if not exists idx_pagsup_pagamentos_prestador on public.pagsup_pagamentos (prestador_id);
create index if not exists idx_pagsup_cronograma_prestador on public.pagsup_cronograma (prestador_id);
create index if not exists idx_pagsup_neg_agendadas_negociacao on public.pagsup_negociacoes_agendadas (negociacao_id);

-- Projetos criados a partir de um modelo.
create index if not exists idx_projetos_template on public.projetos (template_id);
