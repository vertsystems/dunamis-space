-- ============================================================================
-- 0041 — Totais do Financeiro somados no banco
-- ----------------------------------------------------------------------------
-- O load trazia TODAS as linhas de `transacoes` (select tipo, valor, sem limite)
-- só para fazer dois reduce em JS. Como o PostgREST aplica um teto de linhas por
-- requisição (padrão 1000), ao passar desse volume os três cards do topo
-- (Receitas / Despesas / Saldo) passavam a somar um subconjunto arbitrário —
-- SEM erro nenhum, porque `error` só era capturado da outra query.
--
-- Números financeiros errados exibidos como corretos é o pior tipo de bug, então
-- a soma passa a ser feita no banco, que não tem teto de linhas.
--
-- security_invoker: a view respeita a RLS de quem consulta, não a do owner.
create or replace view public.v_financeiro_totais
with (security_invoker = true)
as
select
	coalesce(sum(valor) filter (where tipo = 'receita'), 0)::numeric as receitas,
	coalesce(sum(valor) filter (where tipo = 'despesa'), 0)::numeric as despesas
from public.transacoes;

grant select on public.v_financeiro_totais to authenticated;
