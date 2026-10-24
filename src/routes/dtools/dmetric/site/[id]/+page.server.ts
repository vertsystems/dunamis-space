// DMetric — a página de um site: só os números dele, organizados, com todos os
// países e cidades (dmetric_lugares, 0085). Abre ao clicar no site no ranking.
// Mora dentro de /dtools/dmetric, então herda a permissão do módulo.
import { error, fail } from '@sveltejs/kit';
import { exigirPermissao } from '$lib/server/permissao';
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
import { janelaDoPeriodo, lerFiltros, temFiltro } from '$lib/dmetric/recorte';
import { slugDoPageLinks } from '$lib/dmetric/botoes';
import { botoesDaPagina } from '$lib/server/pagelinks';
import { lerMetas, metasDoSite, opcoesDeMeta } from '$lib/dmetric/resultados';
import { lerPeriodoPortal, novoToken, origemDoPortal, type Portal } from '$lib/dmetric/portal';
import { normalizaWhatsApp } from '$lib/pagsup/whatsapp';
import { SAUDE_VAZIA, saudePorSite, type SaudeDados } from '$lib/dmetric/saude';
import { carregarRecorte, notaDoRecorte } from '$lib/server/dmetricRecorte';
import type { Actions, PageServerLoad } from './$types';

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
	const agoraMesmo = new Date();

	const [painel, lugares, porDia, agora, titulos, saude, metas, destinos, portais, recorte] = await Promise.all([
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
		// O que conta como resultado neste site (0093) e os destinos para escolher.
		supabase.from('dmetric_metas').select('valor').eq('site_id', id).order('criado_em'),
		supabase.rpc('dmetric_destinos_do_site', { p_site: id }),
		// Os links do cliente (0094) — o hash da senha nem é legível pelo app.
		supabase
			.from('dmetric_portais')
			.select('id, site_id, token, contato, com_senha, periodo, ativo, whatsapp, relatorio_mensal, acessos, ultimo_acesso, criado_em')
			.eq('site_id', id)
			.order('criado_em'),
		carregarRecorte(supabase, { site: id, siteFixo: true, periodo, hoje, agora: agoraMesmo, busca: url.searchParams, grafico })
	]);
	for (const [nome, r] of [
		['painel', painel],
		['lugares', lugares],
		['por dia', porDia],
		['saude', saude],
		['metas', metas],
		['destinos', destinos],
		['portais', portais]
	] as const)
		if (r?.error) console.error(`[dmetric] site ${nome}`, r.error.message);

	const primeiroDia = recorte.primeiroDia;
	// Página do PageLinks: os botões e os cliques de cada um vêm de lá, depois da
	// página (a promessa vai sem esperar; o quadro mostra um esqueleto até chegar).
	const slug = slugDoPageLinks(site as DMetricSite);
	const janela = janelaDoPeriodo(periodo, hoje, agoraMesmo);
	const escolhidas = metasDoSite(((metas.data ?? []) as { valor: string }[]).map((m) => m.valor));
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
		graficoAnterior: recorte.graficoAnterior,
		conversao: recorte.conversao,
		metas: escolhidas.metas,
		metasPadrao: escolhidas.padrao,
		opcoesMetas: opcoesDeMeta((destinos.data ?? []) as { valor: string; cliques: number }[], escolhidas.padrao ? [] : escolhidas.metas),
		botoes: slug ? botoesDaPagina(slug, janela.desde, janela.ate) : null,
		portais: (portais.data ?? []) as Portal[],
		origem: origemDoPortal(url)
	};
};

export const actions: Actions = {
	// O que conta como resultado neste site. Sem nenhum marcado (ou o padrão
	// inteiro), a lista fica vazia e vale o padrão (METAS_PADRAO).
	salvarMetas: async ({ request, locals, params }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		if (!UUID.test(params.id)) return fail(400, { erro: 'Site inválido.' });
		const metas = lerMetas((await request.formData()).getAll('meta').map(String));
		const { error: e1 } = await locals.supabase.from('dmetric_metas').delete().eq('site_id', params.id);
		if (e1) return fail(500, { erro: e1.message });
		if (metas.length) {
			const { error: e2 } = await locals.supabase.from('dmetric_metas').insert(metas.map((valor) => ({ site_id: params.id, valor })));
			if (e2) return fail(500, { erro: e2.message });
		}
		return { ok: true };
	},

	// ---- O link do cliente (portal, 0094) ----
	criarPortal: async ({ locals, params }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		if (!UUID.test(params.id)) return fail(400, { erro: 'Site inválido.' });
		const { error: e } = await locals.supabase.from('dmetric_portais').insert({ site_id: params.id, token: novoToken() });
		if (e) return fail(500, { erro: e.message });
		return { ok: true };
	},

	salvarPortal: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		if (!UUID.test(id)) return fail(400, { erro: 'Link inválido.' });
		const bruto = String(fd.get('whatsapp') ?? '').trim();
		const whatsapp = bruto ? normalizaWhatsApp(bruto) : null;
		if (bruto && !whatsapp) return fail(400, { erro: 'WhatsApp inválido: use o celular com DDD.' });
		const relatorio = fd.get('relatorio_mensal') === 'on';
		const { error: e } = await locals.supabase
			.from('dmetric_portais')
			.update({
				periodo: lerPeriodoPortal(fd.get('periodo')),
				contato: String(fd.get('contato') ?? '').trim().slice(0, 60) || null,
				whatsapp,
				// Sem número não há para onde mandar o resumo do mês.
				relatorio_mensal: relatorio && !!whatsapp,
				ativo: fd.get('ativo') === 'on'
			})
			.eq('id', id);
		if (e) return fail(500, { erro: e.message });
		return { ok: true };
	},

	senhaPortal: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const senha = String(fd.get('senha') ?? '');
		if (!UUID.test(id)) return fail(400, { erro: 'Link inválido.' });
		if (senha && (senha.length < 4 || senha.length > 60)) return fail(400, { erro: 'A senha precisa ter de 4 a 60 caracteres.' });
		const { error: e } = await locals.supabase.rpc('dmetric_portal_senha', { p_id: id, p_senha: senha || null });
		if (e) return fail(500, { erro: e.message });
		return { ok: true };
	},

	excluirPortal: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		const id = String((await request.formData()).get('id') ?? '');
		if (!UUID.test(id)) return fail(400, { erro: 'Link inválido.' });
		const { error: e } = await locals.supabase.from('dmetric_portais').delete().eq('id', id);
		if (e) return fail(500, { erro: e.message });
		return { ok: true };
	}
};
