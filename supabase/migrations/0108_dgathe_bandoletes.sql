-- ============================================================
-- DGathe — os agentes passam a se chamar Bandoletes
--
-- Pedido do Bruno (10/11/2026): continuam sendo agentes de IA, mas no
-- escritório são os Bandoletes. É só o nome na tela: tabelas, funções, ids e
-- o módulo de permissão ('dgathe_agentes') continuam como estão.
--
-- A cadeira das baias mudou de nome no mapa ('Cadeira de agente' → 'Cadeira
-- de Bandolete'), então o posto de cada agente acompanha (agentes/dev/*.md já
-- dizem o nome novo; node ponte/agentes.mjs --conferir não acusa diferença).
--
-- Para desfazer:
--   update public.dgathe_agentes set cadeira = 'Cadeira de agente' where cadeira = 'Cadeira de Bandolete';
-- ============================================================

update public.dgathe_agentes
set cadeira = 'Cadeira de Bandolete', atualizado_em = now()
where cadeira = 'Cadeira de agente';
