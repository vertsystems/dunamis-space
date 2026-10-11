-- ============================================================
-- DMetric — os "tablets" de 10 e 11/10/2026 eram celulares
--
-- A regra de aparelho tratava Android sem "Mobile" no User-Agent como tablet,
-- e o navegador do Instagram no Android vem sem. Resultado: todo acesso de
-- anúncio no Android contou como tablet (66 de 66 na lista recente eram
-- Android + "Instagram (no app)"). A regra foi corrigida no app (largura da
-- tela desempata); aqui o que já tinha sido contado vira celular.
--
-- Só os dias até 11/10/2026: daí em diante a regra nova classifica certo.
-- Idempotente.
-- ============================================================

-- Contadores do dia: soma os "Tablet" no "Celular" e apaga a linha de tablet.
insert into public.dmetric_diario as d (site_id, dia, dimensao, valor, visitas, visualizacoes, segundos)
select site_id, dia, 'dispositivo', 'Celular', visitas, visualizacoes, segundos
from public.dmetric_diario
where dimensao = 'dispositivo' and valor = 'Tablet' and dia <= date '2026-10-11'
on conflict (site_id, dia, dimensao, valor) do update
	set visitas = d.visitas + excluded.visitas,
		visualizacoes = d.visualizacoes + excluded.visualizacoes,
		segundos = d.segundos + excluded.segundos;

delete from public.dmetric_diario
where dimensao = 'dispositivo' and valor = 'Tablet' and dia <= date '2026-10-11';

-- Lista recente (48 h).
update public.dmetric_recentes set dispositivo = 'Celular'
where dispositivo = 'Tablet' and sistema = 'Android' and em < timestamptz '2026-10-12 03:00:00+00';
