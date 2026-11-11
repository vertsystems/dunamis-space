-- ============================================================
-- DGathe — o Departamento Financeiro: o Gerente Financeiro e sete especialistas
--
-- Pedido do Bruno (11/11/2026), a partir do "Manual de Implementação ·
-- Departamento Financeiro" v1.0 (docs/dgathe/manual-departamento-financeiro.pdf):
-- oito Bandoletes na sala Financeiro, a equipe 'financeiro', com o Warren de
-- líder. Eles preparam e conferem; quem aprova e mexe no dinheiro são os CEOs.
--
-- As definições ficam em agentes/financeiro/*.md e vão para o banco com
-- node ponte/agentes.mjs. Aqui só entram as linhas com o personagem de cada um
-- (o sincronizador nunca mexe na aparência), ainda desativadas. Nada muda em
-- tabela, função ou permissão: a equipe nova usa o mesmo mecanismo do dev.
--
-- Para desfazer:
--   update public.dgathe_agentes set ativo = false where equipe = 'financeiro';
-- (as tarefas e o histórico ficam; apagar as linhas leva as tarefas junto)
-- ============================================================

insert into public.dgathe_agentes (id, nome, cargo, sala, cadeira, pasta, autonomia, equipe, lider, ordem, ativo, aparencia)
values
	('warren', 'Warren', 'Gerente Financeiro', 'financeiro', 'Cadeira do gerente', 'dunamiscompany', 'editar', 'financeiro', true, 30, false, '{"personagem":"tiozao"}'::jsonb),
	('ada', 'Ada', 'Engenheira de Sistemas Financeiros', 'financeiro', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'financeiro', false, 31, false, '{"personagem":"programadora"}'::jsonb),
	('benjamin', 'Benjamin', 'Analista de Contas a Pagar', 'financeiro', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'financeiro', false, 32, false, '{"personagem":"professor"}'::jsonb),
	('silvio', 'Silvio', 'Analista de Contas a Receber e Cobrança', 'financeiro', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'financeiro', false, 33, false, '{"personagem":"gala"}'::jsonb),
	('janet', 'Janet', 'Analista de Tesouraria e Conciliação', 'financeiro', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'financeiro', false, 34, false, '{"personagem":"executiva"}'::jsonb),
	('peter', 'Peter', 'Analista de Controladoria e Custos', 'financeiro', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'financeiro', false, 35, false, '{"personagem":"minimalista"}'::jsonb),
	('ray', 'Ray', 'Analista de Planejamento Financeiro', 'financeiro', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'financeiro', false, 36, false, '{"personagem":"arquiteto"}'::jsonb),
	('luca', 'Luca', 'Assistente Contábil e Fiscal', 'financeiro', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'financeiro', false, 37, false, '{"personagem":"contador"}'::jsonb)
on conflict (id) do nothing;
