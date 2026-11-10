-- ============================================================
-- DGathe — os assessores ganham nome; os móveis ganham id que não muda
--
-- Pedidos do Bruno (10/11/2026):
--   1. Os assessores continuam assessores, mas cada um com um nome: o do Bruno
--      é o Wagner e o da Aline é a Adriana (os ids no banco não mudam:
--      'assessor' e 'assessora').
--   2. Reforma no escritório (Marketing = Conteúdo + Estúdio, baias do Dev com
--      8 lugares). O id de cada móvel no mapa passou a sair do tipo e do lugar
--      dele (src/lib/dgathe/mapa.ts), e não mais da ordem em que ele nasce:
--      daqui para a frente, mexer numa sala não muda o id dos assentos das
--      outras. Nesta troca todos mudaram uma vez, então o lugar guardado de
--      cada pessoa é limpo (cada tela escolhe de novo).
--
-- Para desfazer:
--   update public.dgathe_agentes set nome = 'Assessor', instrucoes = replace(instrucoes, 'Você é o Wagner, assessor do Bruno', 'Você é o assessor do Bruno') where id = 'assessor';
--   update public.dgathe_agentes set nome = 'Assessora', instrucoes = replace(instrucoes, 'Você é a Adriana, assessora da Aline', 'Você é a assessora da Aline') where id = 'assessora';
-- ============================================================

update public.dgathe_agentes
set nome = 'Wagner',
	instrucoes = replace(instrucoes, 'Você é o assessor do Bruno', 'Você é o Wagner, assessor do Bruno'),
	atualizado_em = now()
where id = 'assessor';

update public.dgathe_agentes
set nome = 'Adriana',
	instrucoes = replace(instrucoes, 'Você é a assessora da Aline', 'Você é a Adriana, assessora da Aline'),
	atualizado_em = now()
where id = 'assessora';

update public.dgathe_presenca set assento = null where assento is not null;
