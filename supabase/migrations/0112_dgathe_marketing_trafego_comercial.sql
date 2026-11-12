-- ============================================================
-- DGathe — Marketing & Criação, Tráfego & Performance e Comercial
--
-- Pedido do Bruno (11/11/2026), a partir dos três manuais de implementação
-- (docs/dgathe/manual-departamento-marketing-criacao.pdf,
-- manual-departamento-trafego-performance.pdf e manual-departamento-comercial.pdf):
-- 28 Bandoletes em três equipes, cada uma com o gerente de líder. A cadeira de
-- tráfego do manual de Marketing (MKT-MID) foi para o Tráfego & Performance,
-- como os manuais de Tráfego e Comercial registram: Marketing & Criação fica
-- com 16, Tráfego & Performance com 6 e Comercial com 6.
--
-- As definições ficam em agentes/{marketing,trafego,comercial}/*.md e vão para o
-- banco com node ponte/agentes.mjs. Aqui só entram as linhas com o personagem de
-- cada um (o sincronizador nunca mexe na aparência), ainda desativadas. Nada
-- muda em tabela, função ou permissão.
--
-- Para desfazer:
--   update public.dgathe_agentes set ativo = false where equipe in ('marketing', 'trafego', 'comercial');
-- (as tarefas e o histórico ficam; apagar as linhas leva as tarefas junto)
-- ============================================================

insert into public.dgathe_agentes (id, nome, cargo, sala, cadeira, pasta, autonomia, equipe, lider, ordem, ativo, aparencia)
values
	('david', 'David', 'Gerente de Marketing & Criação', 'marketing', 'Cadeira do gerente', 'dunamiscompany', 'editar', 'marketing', true, 40, false, '{"personagem":"paizao"}'::jsonb),
	('clayton', 'Clayton', 'Estrategista de Inteligência de Mercado e Portfólio', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 41, false, '{"personagem":"cientista"}'::jsonb),
	('philip', 'Philip', 'Estrategista de Marketing e Contas', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 42, false, '{"personagem":"redator"}'::jsonb),
	('paula', 'Paula', 'Especialista em Branding e Direção Criativa', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 43, false, '{"personagem":"artista"}'::jsonb),
	('washington', 'Washington', 'Copywriter e Redator de Conteúdo', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 44, false, '{"personagem":"criativo"}'::jsonb),
	('massimo', 'Massimo', 'Designer Gráfico, Editorial e de Campanhas', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 45, false, '{"personagem":"marceneiro"}'::jsonb),
	('saul', 'Saul', 'Produtor Audiovisual, Motion e Áudio', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 46, false, '{"personagem":"fotografo"}'::jsonb),
	('gary', 'Gary', 'Social Media e Gestor de Comunidade', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 47, false, '{"personagem":"empolgado"}'::jsonb),
	('rand', 'Rand', 'Especialista em SEO e Presença Local no Google', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 48, false, '{"personagem":"calouro"}'::jsonb),
	('seth', 'Seth', 'Especialista em CRM e Automação de Marketing', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 49, false, '{"personagem":"barista"}'::jsonb),
	('sean', 'Sean', 'Estrategista de Growth, Funis e Conversão', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 50, false, '{"personagem":"atleta"}'::jsonb),
	('avinash', 'Avinash', 'Analista de Dados e Performance de Marketing', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 51, false, '{"personagem":"piloto"}'::jsonb),
	('abilio', 'Abílio', 'Especialista em Trade Marketing e Ações Locais', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 52, false, '{"personagem":"vendedor"}'::jsonb),
	('anitta', 'Anitta', 'Especialista em Influenciadores e Criadores', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 53, false, '{"personagem":"dancarina"}'::jsonb),
	('walt', 'Walt', 'Gestor de Projetos e Operações Criativas', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 54, false, '{"personagem":"durao"}'::jsonb),
	('deming', 'Deming', 'Especialista em Revisão e Qualidade de Marketing', 'marketing', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'marketing', false, 55, false, '{"personagem":"ranzinza"}'::jsonb),
	('neil', 'Neil', 'Gerente de Tráfego & Performance', 'trafego', 'Cadeira do gerente', 'dunamiscompany', 'editar', 'trafego', true, 60, false, '{"personagem":"lutador"}'::jsonb),
	('byron', 'Byron', 'Estrategista de Mídia e Planejamento', 'trafego', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'trafego', false, 61, false, '{"personagem":"boleiro"}'::jsonb),
	('sheryl', 'Sheryl', 'Gestora de Meta Ads', 'trafego', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'trafego', false, 62, false, '{"personagem":"ceo"}'::jsonb),
	('larry', 'Larry', 'Gestor de Google Ads', 'trafego', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'trafego', false, 63, false, '{"personagem":"estagiario"}'::jsonb),
	('susan', 'Susan', 'Especialista em YouTube Ads', 'trafego', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'trafego', false, 64, false, '{"personagem":"produtora"}'::jsonb),
	('grace', 'Grace', 'Especialista em Operações e Qualidade de Mídia', 'trafego', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'trafego', false, 65, false, '{"personagem":"doutora"}'::jsonb),
	('aaron', 'Aaron', 'Gerente Comercial', 'comercial', 'Cadeira do gerente', 'dunamiscompany', 'editar', 'comercial', true, 70, false, '{"personagem":"dancarino"}'::jsonb),
	('jeb', 'Jeb', 'SDR · Prospecção e Qualificação', 'comercial', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'comercial', false, 71, false, '{"personagem":"lobo"}'::jsonb),
	('chris', 'Chris', 'Consultor de Vendas e Negociação', 'comercial', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'comercial', false, 72, false, '{"personagem":"samurai"}'::jsonb),
	('ruth', 'Ruth', 'Especialista em Propostas e Formalização Comercial', 'comercial', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'comercial', false, 73, false, '{"personagem":"advogada"}'::jsonb),
	('marc', 'Marc', 'Analista de CRM e Operações Comerciais', 'comercial', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'comercial', false, 74, false, '{"personagem":"heroi"}'::jsonb),
	('tony', 'Tony', 'Especialista em Sucesso do Cliente e Expansão', 'comercial', 'Cadeira de Bandolete', 'dunamiscompany', 'editar', 'comercial', false, 75, false, '{"personagem":"golden"}'::jsonb)
on conflict (id) do nothing;
