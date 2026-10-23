// DMetric — painel de acessos dos sites (ver supabase/migrations/0072_dmetric.sql).
import { fail } from '@sveltejs/kit';
import { exigirPermissao } from '$lib/server/permissao';
import { diaEmBrasilia } from '$lib/dmetric/coleta';
import {
	AGORA_VAZIO,
	RECENTES,
	anosDisponiveis,
	lerGrafico,
	mesesDisponiveis,
	type AgoraDados,
	intervalo,
	lerPeriodo,
	resumirHistorico,
	type DMetricSite,
	type LinhaHistorico,
	type NumerosSite,
	type PainelDados
} from '$lib/dmetric/painel';
import { lerFiltros, temFiltro } from '$lib/dmetric/recorte';
import { SAUDE_VAZIA, saudePorSite, type SaudeDados } from '$lib/dmetric/saude';
import { carregarRecorte, notaDoRecorte } from '$lib/server/dmetricRecorte';
import type { Actions, PageServerLoad } from './$types';

const VAZIO: PainelDados = { visitas: 0, visualizacoes: 0, por_dia: [], dimensoes: {} };
const UUID = /^[0-9a-f-]{36}$/i;

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const periodo = lerPeriodo(url.searchParams.get('periodo'));
	const siteParam = url.searchParams.get('site');
	const site = siteParam && UUID.test(siteParam) ? siteParam : null;
	const hoje = diaEmBrasilia();
	const { de, ate } = intervalo(periodo, hoje);
	// Última hora e 24 horas saem da lista de acessos (0077), não dos contadores do dia.
	const recente = RECENTES[periodo];
	const desde = recente ? new Date(Date.now() - recente.horas * 3_600_000).toISOString() : null;

	// O alerta de baixo acesso olha sempre os últimos 30 dias, seja qual for o
	// período escolhido no filtro.
	const ultimos30 = intervalo('30d', hoje);

	// O gráfico "Visitas por dia" tem a própria escolha (?grafico=): um mês, um
	// ano inteiro ou os dias do calendário. Sem escolha, o mês de hoje.
	const grafico = lerGrafico(url.searchParams.get('grafico'), hoje);

	// Com filtro (clicar num item), o painel sai da lista de acessos (0091) e os
	// contadores ficam de fora; a comparação vale com ou sem filtro.
	const filtrado = temFiltro(lerFiltros(url.searchParams));

	const [sites, historico, painel, porSite, titulos, porSite30, agora, saude, porDia, robos, recorte] = await Promise.all([
		supabase.from('dmetric_sites').select('*').order('nome'),
		supabase
			.from('dmetric_historico')
			.select('propriedade, inicio, fim, pais, pais_nome, usuarios')
			.order('usuarios', { ascending: false }),
		filtrado
			? null
			: recente
				? supabase.rpc('dmetric_painel_recente', { p_site: site, p_desde: desde, p_passo: recente.passo })
				: supabase.rpc('dmetric_painel', { p_site: site, p_de: de, p_ate: ate }),
		// A lista de sites mostra todos, mesmo com um site escolhido no filtro.
		filtrado
			? null
			: recente
				? supabase.rpc('dmetric_por_site_recente', { p_desde: desde })
				: supabase.rpc('dmetric_por_site', { p_de: de, p_ate: ate }),
		// Título de cada página (para a lista de páginas). Uma linha por página
		// de cada site: pouca coisa, e só muda quando o título do site muda.
		supabase.from('dmetric_paginas').select('site_id, caminho, titulo').limit(5000),
		supabase.rpc('dmetric_por_site', { p_de: ultimos30.de, p_ate: ultimos30.ate }),
		supabase.rpc('dmetric_agora', { p_site: site }),
		// Saúde da página (0081): as medidas são por dia — na última hora e nas
		// 24 horas, valem hoje e ontem (o mesmo `de` de intervalo()).
		supabase.rpc('dmetric_saude_painel', { p_site: site, p_de: de, p_ate: ate }),
		// O gráfico por dia (0082): os dias do período já somados entre os sites.
		filtrado ? null : supabase.rpc('dmetric_por_dia', { p_site: site, p_de: grafico.de, p_ate: grafico.ate }),
		// Os robôs que ficaram de fora no período (0092).
		supabase.rpc('dmetric_robos_resumo', { p_site: site, p_de: de, p_ate: ate }),
		// O primeiro dia contado, o painel filtrado e a comparação.
		carregarRecorte(supabase, { site, siteFixo: false, periodo, hoje, agora: new Date(), busca: url.searchParams, grafico })
	]);

	// Sem a migration 0072 a tela avisa em vez de quebrar.
	const pendente = !!sites.error && /dmetric_|does not exist|schema cache|relation/i.test(sites.error.message);
	if (painel?.error) console.error('[dmetric] painel', painel.error.message);
	if (porSite?.error) console.error('[dmetric] por site', porSite.error.message);
	if (saude.error) console.error('[dmetric] saude', saude.error.message);
	if (porDia?.error) console.error('[dmetric] por dia', porDia.error.message);
	if (robos.error) console.error('[dmetric] robos', robos.error.message);
	const primeiroDia = recorte.primeiroDia;

	return {
		pendente,
		periodo,
		site,
		hoje,
		de,
		ate,
		sites: (sites.data ?? []) as DMetricSite[],
		// O histórico é da propriedade inteira do GA, não de um site: só entra
		// na visão de todos os sites, no período "desde o começo" e sem filtro.
		historico: !site && periodo === 'tudo' && !filtrado ? ((historico.data ?? []) as LinhaHistorico[]) : [],
		resumoHistorico: resumirHistorico((historico.data ?? []) as LinhaHistorico[]),
		painel: (filtrado ? recorte.painel : (painel?.data as PainelDados | null)) ?? VAZIO,
		porSite: (filtrado ? (recorte.painel?.por_site ?? []) : (porSite?.data ?? [])) as NumerosSite[],
		titulos: (titulos.data ?? []) as { site_id: string; caminho: string; titulo: string }[],
		porSite30: (porSite30.data ?? []) as NumerosSite[],
		agora: (agora.data as AgoraDados | null) ?? AGORA_VAZIO,
		saude: saudePorSite((saude.data as SaudeDados | null) ?? SAUDE_VAZIA),
		grafico,
		porDia: ((filtrado ? recorte.porDia : porDia?.data) ?? []) as { dia: string; visitas: number; visualizacoes: number }[],
		primeiroDia,
		// Com filtro, o gráfico só conta a partir do primeiro dia inteiro da lista de acessos.
		primeiroGrafico: filtrado ? recorte.primeiroDiaFiltro : primeiroDia,
		meses: mesesDisponiveis(primeiroDia, hoje),
		anos: anosDisponiveis(primeiroDia, hoje),
		filtros: recorte.filtros,
		filtrado,
		comparacao: recorte.comparacao,
		comparativo: recorte.comparativo,
		nota: notaDoRecorte(recorte),
		serieAnterior: recorte.serieAnterior,
		porDiaAnterior: recorte.porDiaAnterior,
		graficoAnterior: recorte.graficoAnterior,
		robos: (robos.data ?? []) as { rede: string; acessos: number }[]
	};
};

export const actions: Actions = {
	// Não há "criar site": com o código único o site aparece sozinho na
	// primeira visita, com o título da página como nome. Aqui se dá outro nome
	// — ou, com o campo vazio, volta a valer o título.
	renomearSite: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const nome = String(fd.get('nome') ?? '').trim().slice(0, 80);
		if (!UUID.test(id)) return fail(400, { erro: 'Site inválido.' });
		const { error } = await locals.supabase
			.from('dmetric_sites')
			.update(nome ? { nome, nome_manual: true } : { nome_manual: false })
			.eq('id', id);
		if (error) return fail(500, { erro: error.message });
		return { ok: true };
	},

	// Um site comum (com /ofertas, /contato…) não deve virar um site por página:
	// juntar liga juntar_paginas na raiz do domínio, criando-a se ainda não
	// existe. Vale para as próximas visitas; o que já foi contado fica onde está.
	juntarPaginas: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		const fd = await request.formData();
		const dominio = String(fd.get('dominio') ?? '').toLowerCase();
		const juntar = fd.get('juntar') === 'true';
		if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dominio)) return fail(400, { erro: 'Domínio inválido.' });
		const { data: raiz } = await locals.supabase
			.from('dmetric_sites')
			.select('id')
			.eq('dominio', dominio)
			.eq('caminho', '')
			.maybeSingle();
		const { error } = raiz
			? await locals.supabase.from('dmetric_sites').update({ juntar_paginas: juntar }).eq('id', raiz.id)
			: await locals.supabase
					.from('dmetric_sites')
					.insert({ nome: dominio, dominio, caminho: '', automatico: true, juntar_paginas: juntar });
		if (error) return fail(500, { erro: error.message });
		return { ok: true };
	},

	alternarSite: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'editar');
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const ativo = fd.get('ativo') === 'true';
		if (!UUID.test(id)) return fail(400, { erro: 'Site inválido.' });
		const { error } = await locals.supabase.from('dmetric_sites').update({ ativo }).eq('id', id);
		if (error) return fail(500, { erro: error.message });
		return { ok: true };
	},

	excluirSite: async ({ request, locals }) => {
		exigirPermissao(locals, 'dmetric', 'excluir');
		const id = String((await request.formData()).get('id') ?? '');
		if (!UUID.test(id)) return fail(400, { erro: 'Site inválido.' });
		// Os contadores do site saem junto (on delete cascade).
		const { error } = await locals.supabase.from('dmetric_sites').delete().eq('id', id);
		if (error) return fail(500, { erro: error.message });
		return { ok: true };
	}
};
