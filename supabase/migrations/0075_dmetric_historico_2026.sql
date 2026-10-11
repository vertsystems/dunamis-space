-- ============================================================
-- DMetric — histórico do Google Analytics de 2026 (1/jan a 10/out)
--
-- Segundo relatório "Detalhes demográficos: País" da propriedade DNMS-HUB,
-- "Este ano (janeiro – hoje)", tirado em 10/10/2026. Soma com o de 2025
-- (migration 0072) no painel, em "Todos os sites · Desde o começo".
--
-- Somar dois relatórios conta duas vezes quem visitou nos dois períodos: o GA
-- só tira repetição dentro de um mesmo relatório.
--
-- ATENÇÃO ao atualizar: um relatório novo de 2026 (até outra data) é OUTRO
-- período para a chave única (propriedade, inicio, fim, pais_nome) e somaria
-- por cima deste. Apague este antes:
--   delete from dmetric_historico where propriedade = 'DNMS-HUB' and inicio = '2026-01-01';
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0075_dmetric_historico_2026.sql
-- ============================================================

insert into public.dmetric_historico
	(propriedade, inicio, fim, pais, pais_nome, usuarios, novos_usuarios, sessoes_engajadas, taxa_engajamento, tempo_medio_s, eventos)
values
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'BR', 'Brazil', 37532, 36763, 20030, 48.53, 2, 160727),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'US', 'United States', 987, 986, 324, 32.63, 1, 3500),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'IE', 'Ireland', 146, 146, 62, 42.18, 3, 545),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'SE', 'Sweden', 143, 143, 75, 52.45, 3, 540),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'JP', 'Japan', 93, 92, 7, 7.53, 1, 318),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'PL', 'Poland', 44, 44, 0, 0.00, 0, 132),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'FR', 'France', 39, 36, 1, 2.56, 0, 114),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'NL', 'Netherlands', 22, 22, 2, 9.09, 0, 69),
	('DNMS-HUB', '2026-01-01', '2026-10-10', null, '(not set)', 16, 16, 0, 0.00, 0, 48),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'DE', 'Germany', 16, 16, 2, 12.50, 3, 57),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'IN', 'India', 15, 15, 11, 73.33, 13, 82),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'GB', 'United Kingdom', 11, 11, 5, 45.45, 2, 45),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'ID', 'Indonesia', 9, 8, 7, 77.78, 0, 43),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'PT', 'Portugal', 8, 8, 3, 37.50, 0, 30),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'SG', 'Singapore', 8, 8, 0, 0.00, 0, 24),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'CN', 'China', 7, 7, 0, 0.00, 0, 25),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'PY', 'Paraguay', 7, 7, 4, 50.00, 5, 36),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'CA', 'Canada', 6, 6, 2, 33.33, 1, 23),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'MX', 'Mexico', 5, 5, 3, 42.86, 5, 22),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'AR', 'Argentina', 4, 4, 3, 75.00, 0, 16),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'CL', 'Chile', 4, 4, 1, 25.00, 0, 15),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'ES', 'Spain', 4, 4, 2, 50.00, 2, 15),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'IR', 'Iran', 3, 3, 0, 0.00, 1, 12),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'IT', 'Italy', 3, 3, 1, 33.33, 12, 11),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'CO', 'Colombia', 2, 2, 1, 50.00, 9, 8),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'HK', 'Hong Kong', 2, 2, 0, 0.00, 0, 6),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'JO', 'Jordan', 2, 2, 4, 80.00, 15, 22),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'MG', 'Madagascar', 2, 2, 1, 50.00, 3, 10),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'TW', 'Taiwan', 2, 2, 0, 0.00, 2, 7),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'TR', 'Türkiye', 2, 2, 0, 0.00, 0, 7),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'AM', 'Armenia', 1, 1, 1, 100.00, 0, 6),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'AU', 'Australia', 1, 1, 1, 100.00, 7, 4),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'BO', 'Bolivia', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'CI', 'Côte d’Ivoire', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'DK', 'Denmark', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'DO', 'Dominican Republic', 1, 1, 1, 100.00, 0, 4),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'FI', 'Finland', 1, 1, 0, 0.00, 5, 4),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'GY', 'Guyana', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'IQ', 'Iraq', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'LI', 'Liechtenstein', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'LT', 'Lithuania', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'NZ', 'New Zealand', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'PA', 'Panama', 1, 1, 1, 100.00, 0, 4),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'PE', 'Peru', 1, 1, 2, 100.00, 13, 7),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'PH', 'Philippines', 1, 1, 1, 100.00, 11, 6),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'RO', 'Romania', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'SA', 'Saudi Arabia', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'VE', 'Venezuela', 1, 1, 0, 0.00, 0, 3),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'HU', 'Hungary', 0, 0, 0, 0.00, 0, 2),
	('DNMS-HUB', '2026-01-01', '2026-10-10', 'TM', 'Turkmenistan', 0, 0, 0, 0.00, 0, 2)
on conflict (propriedade, inicio, fim, pais_nome) do nothing;
