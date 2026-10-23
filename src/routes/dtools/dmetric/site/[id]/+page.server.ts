// DMetric — a página de um site: só os números dele, organizados, com todos os
// países e cidades (dmetric_lugares, 0085). Abre ao clicar no site no ranking.
// Mora dentro de /dtools/dmetric, então herda a permissão do módulo.
import { error } from '@sveltejs/kit';
import { diaEmBrasilia } from '$lib/dmetric/coleta';
import {
	AGORA_VAZIO,
	LUGARES_VAZIO,
	RECENTES,
	anosDisponiveis,
	intervalo,
	lerGrafico,
	lerPeriodo,
	mesesDisponiveis,
	type AgoraDados,
	type DMetricSite,
	type Lugares,
	type PainelDados
} from '$lib/dmetric/painel';
import { lerFiltros, temFiltro } from '$lib/dmetric/recorte';
import { SAUDE_VAZIA, saudePorSite, type SaudeDados } from '$lib/dmetric/saude';
import { carregarRecorte, notaDoRecorte } from '$lib/server/dmetricRecorte';
import type { PageServerLoad } from './$types';

const UUID = /^[0-9a-f-]{36}$/i;
const VAZIO: PainelDados = { visitas: 0, visualizacoes: 0, por_dia: [], dimensoes: {} };

export const load: PageServerLoad = async ({ locals: { supabase }, params, url }) => {
	if (!UUID.test(params.id)) error(404, 'Site não encontrado');
	const { data: site } = await supabase.from('dmetric_sites').select('*').eq('id', params.id).maybeSingle();
	if (!site) error(404, 'Site não encontrado');

	const periodo = lerPeriodo(url.searchParams.get('periodo'));
	const hoje = diaEmBrasilia();
	const { de, ate } = intervalo(periodo, hoje);
	const recente = RECENTES[periodo];
	const desde = recente ? new Date(Date.now() - recente.horas * 3_600_000).toISOString() : null;
	const grafico = lerGrafico(url.searchParams.get('grafico'), hoje);
	const id = params.id;

	// Com filtro (clicar num item), o painel e os lugares saem da lista de acessos (0091).
	const filtrado = temFiltro(lerFiltros(url.searchParams));

	const [painel, lugares, porDia, agora, titulos, saude, recorte] = await Promise.all([
		filtrado
			? null
			: recente
				? supabase.rpc('dmetric_painel_recente', { p_site: id, p_desde: desde, p_passo: recente.passo })
				: supabase.rpc('dmetric_painel', { p_site: id, p_de: de, p_ate: ate }),
		filtrado ? null : supabase.rpc('dmetric_lugares', { p_site: id, p_de: de, p_ate: ate, p_desde: desde }),
		filtrado ? null : supabase.rpc('dmetric_por_dia', { p_site: id, p_de: grafico.de, p_ate: grafico.ate }),
		supabase.rpc('dmetric_agora', { p_site: id }),
		supabase.from('dmetric_paginas').select('site_id, caminho, titulo').eq('site_id', id).limit(2000),
		supabase.rpc('dmetric_saude_painel', { p_site: id, p_de: de, p_ate: ate }),
		carregarRecorte(supabase, { site: id, siteFixo: true, periodo, hoje, agora: new Date(), busca: url.searchParams, grafico })
	]);
	for (const [nome, r] of [
		['painel', painel],
		['lugares', lugares],
		['por dia', porDia],
		['saude', saude]
	] as const)
		if (r?.error) console.error(`[dmetric] site ${nome}`, r.error.message);

	const primeiroDia = recorte.primeiroDia;
	return {
		site: site as DMetricSite,
		periodo,
		hoje,
		de,
		ate,
		painel: (filtrado ? recorte.painel : (painel?.data as PainelDados | null)) ?? VAZIO,
		lugares: (filtrado ? recorte.painel?.lugares : (lugares?.data as Lugares | null)) ?? LUGARES_VAZIO,
		grafico,
		porDia: ((filtrado ? recorte.porDia : porDia?.data) ?? []) as { dia: string; visitas: number; visualizacoes: number }[],
		primeiroDia,
		primeiroGrafico: filtrado ? recorte.primeiroDiaFiltro : primeiroDia,
		meses: mesesDisponiveis(primeiroDia, hoje),
		anos: anosDisponiveis(primeiroDia, hoje),
		agora: (agora.data as AgoraDados | null) ?? AGORA_VAZIO,
		titulos: (titulos.data ?? []) as { site_id: string; caminho: string; titulo: string }[],
		saude: saudePorSite((saude.data as SaudeDados | null) ?? SAUDE_VAZIA)[0] ?? null,
		filtros: recorte.filtros,
		filtrado,
		comparacao: recorte.comparacao,
		comparativo: recorte.comparativo,
		nota: notaDoRecorte(recorte),
		serieAnterior: recorte.serieAnterior,
		porDiaAnterior: recorte.porDiaAnterior,
		graficoAnterior: recorte.graficoAnterior
	};
};
