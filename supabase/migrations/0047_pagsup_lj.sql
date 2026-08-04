-- ============================================================
-- Pag's Up — LJ (unidade onde o trabalho foi feito)
--
-- "Loja" aqui NÃO é o cliente (pagsup_clientes = Lojas Mari, Rede Bazzar…), e
-- sim a unidade física: CDP, ADB, PIT, ENS, REG1, REG2, PIE, IBI, PIL, ANG,
-- CAP, SAL, JUQ. Por isso é uma coluna nova em vez de reaproveitar cliente_id.
--
-- Fica no prestador (a unidade que ele costuma atender) e é COPIADA para o
-- pagamento no momento do registro — a planilha do mês fechado não pode mudar
-- porque alguém corrigiu o cadastro depois.
--
-- Texto livre em vez de enum/tabela: a lista de unidades muda com a operação do
-- cliente, e uma migration a cada loja nova seria atrito sem ganho.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0047_pagsup_lj.sql
-- ============================================================

alter table public.pagsup_prestadores
	add column if not exists lj text;

alter table public.pagsup_pagamentos
	add column if not exists lj text;
