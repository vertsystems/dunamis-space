-- ============================================================
-- Pag's Up — Negociações viram lista fixa (não zeram mais a cada mês)
--
-- Antes, "Finalizar" apagava pagsup_negociacoes_agendadas inteira: todo dia 01
-- era preciso re-adicionar um a um os mesmos serviços mensais (rádio, agência,
-- fixos em geral). Agora a lista permanece e "Fechar o mês" lança cada linha
-- como pagamento na Planilha Mensal, mantendo a escalação intacta.
--
-- Como a lista não zera mais, ela deixou de ser a própria proteção contra
-- lançar o mesmo mês duas vezes. Daí a coluna: guarda o último mês (AAAA-MM)
-- em que aquela linha foi fechada, e a tela avisa antes de repetir.
--
-- Texto AAAA-MM em vez de date: o fechamento é do MÊS, não de um dia; guardar
-- um date convidaria a comparações por dia que não querem dizer nada aqui.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0048_pagsup_negociacoes_fixas.sql
-- ============================================================

alter table public.pagsup_negociacoes_agendadas
	add column if not exists mes_fechado text;

comment on column public.pagsup_negociacoes_agendadas.mes_fechado is
	'Último mês (AAAA-MM) em que esta negociação fixa foi lançada na Planilha Mensal.';
