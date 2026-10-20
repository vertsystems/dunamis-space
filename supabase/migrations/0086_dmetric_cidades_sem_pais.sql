-- ============================================================
-- DMetric — o país das cidades que tinham ficado sem
--
-- A 0085 deixou 19 cidades sem país: todas de dias em que o site teve visita
-- de dois países e com sigla de estado que existe nos dois (PR, SC, AL, MA…).
-- Conferidas uma a uma em 20/10/2026:
--   * 11 estão na lista oficial de municípios do IBGE com a mesma UF
--     (servicodados.ibge.gov.br, 5.571 municípios) — são do Brasil;
--   * as outras 8 não estão, e em todos os dias delas o site só teve visita do
--     Brasil e de um outro país — são desse outro país (EUA, Alemanha, Suécia,
--     Paraguai), o que bate com o nome (Ashburn, Virgínia; Falkenstein,
--     Saxônia; Luleå, Norrbotten; Asunción…).
-- As visitas novas já gravam o país de cada cidade (0085).
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0086_dmetric_cidades_sem_pais.sql
-- ============================================================

insert into public.dmetric_cidades_pais (cidade, pais) values
	('Ashburn · VA', 'US'),
	('Londrina · PR', 'BR'),
	('Brusque · SC', 'BR'),
	('Colombo · PR', 'BR'),
	('Columbus · OH', 'US'),
	('Falkenstein · SN', 'DE'),
	('Frankfurt am Main · HE', 'DE'),
	('Governador Celso Ramos · SC', 'BR'),
	('Greensboro · NC', 'US'),
	('Humberto de Campos · MA', 'BR'),
	('Luleå · BD', 'SE'),
	('Paranavaí · PR', 'BR'),
	('Pontal do Paraná · PR', 'BR'),
	('Porto Calvo · AL', 'BR'),
	('Reston · VA', 'US'),
	('São Francisco do Sul · SC', 'BR'),
	('São Luís · MA', 'BR'),
	('Tubarão · SC', 'BR'),
	('Asunción · ASU', 'PY')
on conflict (cidade) do update set pais = excluded.pais, atualizado_em = now();
