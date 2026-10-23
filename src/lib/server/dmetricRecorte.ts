// DMetric — o recorte do painel no servidor (o painel e a página do site). Com
// filtro, o painel sai da lista de acessos (dmetric_eventos_painel, 0091). A
// comparação busca os números do período anterior — sem filtro, nos períodos de
// dias, pelos contadores (dmetric_resumo); nas horas ou com filtro, pela lista
// de acessos — e, para o gráfico, a linha de antes.
import type { SupabaseClient } from '@supabase/supabase-js';
import { RECENTES, dataBr, somarDias, type EscolhaGrafico, type PainelDados, type Periodo } from '$lib/dmetric/painel';
import {
	datasDaJanela,
	descricaoDaComparacao,
	emBrasilia,
	filtroDaPessoa,
	filtrosParaBanco,
	graficoAnterior,
	inicioDoDia,
	janelaAnterior,
	janelaCoberta,
	janelaDoPeriodo,
	lerComparacao,
	lerFiltros,
	temFiltro,
	type Comparacao,
	type Comparativo,
	type Filtros,
	type Janela
} from '$lib/dmetric/recorte';

type Dia = { dia: string; visitas: number; visualizacoes: number };
type Degrau = { momento: string; visitas: number; visualizacoes: number };
/** O que dmetric_eventos_painel devolve com p_resumo (e dmetric_resumo, sem as datas). */
type Resumo = {
	visitas: number;
	visualizacoes: number;
	segundos: number;
	cliques: number;
	por_dia?: Dia[];
	serie?: Degrau[] | null;
	desde_dados?: string | null;
	desde_eventos?: string | null;
};
type Resposta = { data: unknown; error: { message: string } | null } | null;

export type Recorte = {
	filtros: Filtros;
	filtrado: boolean;
	comparacao: Comparacao;
	janela: Janela;
	/** O primeiro dia dos contadores (antes dele, "sem dados"). */
	primeiroDia: string | null;
	/** Com filtro: o painel inteiro, da lista de acessos. Sem filtro, null — a página usa os contadores. */
	painel: PainelDados | null;
	/** Com filtro: o gráfico por dia (a janela do gráfico). */
	porDia: Dia[] | null;
	/** Com filtro, o gráfico conta a partir do primeiro dia inteiro da lista de acessos. */
	primeiroDiaFiltro: string | null;
	/** Onde a lista de acessos começa, e desde quando clique e tempo de tela sabem de quem são. */
	desdeDados: string | null;
	desdeEventos: string | null;
	comparativo: Comparativo | null;
	/** A linha tracejada: nos períodos de horas, a série de antes; nos de dias, os dias da janela anterior do gráfico. */
	serieAnterior: Degrau[] | null;
	porDiaAnterior: Dia[] | null;
	graficoAnterior: { de: string; ate: string; rotulo: string } | null;
};

/** "21/10 às 15h37" (Brasília). */
function quando(iso: string): string {
	const b = emBrasilia(new Date(iso));
	const min = Math.floor(b.hora * 60);
	return `${dataBr(b.dia).slice(0, 5)} às ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

export async function carregarRecorte(
	supabase: SupabaseClient,
	p: {
		/** O site do filtro (painel) ou o da página do site. */
		site: string | null;
		/** Página do site: a página do filtro é dele. */
		siteFixo: boolean;
		periodo: Periodo;
		hoje: string;
		agora: Date;
		busca: URLSearchParams;
		grafico: EscolhaGrafico;
	}
): Promise<Recorte> {
	const filtros = lerFiltros(p.busca);
	const filtrado = temFiltro(filtros);
	const comparacao = lerComparacao(p.busca.get('comparar'));
	const banco = filtrosParaBanco(filtros, p.siteFixo ? p.site : null);
	const recente = RECENTES[p.periodo];
	const passo = recente?.passo ?? null;
	const janela = janelaDoPeriodo(p.periodo, p.hoje, p.agora);
	const anterior = janelaAnterior(janela, p.periodo, comparacao, p.hoje, p.agora);
	const gAnterior = recente ? null : graficoAnterior(p.grafico, comparacao);

	const eventos = (j: { desde: string; ate: string }, resumo: boolean, degrau: string | null = null) =>
		supabase.rpc('dmetric_eventos_painel', {
			p_site: p.site,
			p_desde: j.desde,
			p_ate: j.ate,
			p_filtros: banco,
			p_passo: degrau,
			p_resumo: resumo
		});
	const dias = (de: string, ate: string) => ({ desde: inicioDoDia(de), ate: inicioDoDia(somarDias(ate, 1)) });

	const [primeiro, painel, porDia, ant, porDiaAnt] = (await Promise.all([
		supabase.rpc('dmetric_primeiro_dia', { p_site: p.site }),
		filtrado ? eventos(janela, false, passo) : null,
		filtrado && !recente ? eventos(dias(p.grafico.de, p.grafico.ate), true) : null,
		!anterior
			? null
			: !filtrado && !recente
				? supabase.rpc('dmetric_resumo', {
						p_site: p.site,
						p_de: anterior.de,
						p_ate: anterior.ateDia,
						p_ate_hora: anterior.ateHora
					})
				: eventos(anterior, true, passo),
		!gAnterior
			? null
			: filtrado
				? eventos(dias(gAnterior.de, gAnterior.ate), true)
				: supabase.rpc('dmetric_por_dia', { p_site: p.site, p_de: gAnterior.de, p_ate: gAnterior.ate })
	])) as Resposta[];
	for (const [nome, r] of [
		['primeiro dia', primeiro],
		['filtrado', painel],
		['filtrado por dia', porDia],
		['anterior', ant],
		['gráfico anterior', porDiaAnt]
	] as const)
		if (r?.error) console.error(`[dmetric] recorte ${nome}`, r.error.message);

	const primeiroDia = (primeiro?.data as string | null) ?? null;
	const filtradoDados = (painel?.data as PainelDados | null) ?? null;
	const resumo = (ant?.data as Resumo | null) ?? null;
	const desdeDados = filtradoDados?.desde_dados ?? resumo?.desde_dados ?? null;
	const desdeEventos = filtradoDados?.desde_eventos ?? resumo?.desde_eventos ?? null;
	// O primeiro dia em que a lista de acessos esteve ligada o dia todo.
	const primeiroDiaFiltro = desdeDados ? somarDias(emBrasilia(new Date(desdeDados)).dia, 1) : null;

	let comparativo: Comparativo | null = null;
	if (anterior) {
		const descricao = descricaoDaComparacao(p.periodo, comparacao);
		const base = { comparacao, descricao, datas: datasDaJanela(anterior, p.periodo) };
		const pelosContadores = !filtrado && !recente;
		const coberta = pelosContadores
			? janelaCoberta(anterior, { primeiroDia })
			: janelaCoberta(anterior, { desde: desdeDados });
		if (resumo && coberta)
			comparativo = {
				...base,
				numeros: {
					visitas: resumo.visitas,
					visualizacoes: resumo.visualizacoes,
					segundos: Number(resumo.segundos ?? 0),
					cliques: resumo.cliques ?? 0
				},
				// Filtro da pessoa: clique e tempo de antes de 23/10 não sabem de quem são.
				semEventos: filtroDaPessoa(filtros) && !janelaCoberta(anterior, { desde: desdeEventos })
			};
		else {
			const inicio = pelosContadores
				? primeiroDia && `o DMetric começou a contar em ${dataBr(primeiroDia)}`
				: desdeDados &&
					(filtrado
						? `com filtro, a contagem começa em ${quando(desdeDados)}`
						: `o DMetric guarda cada acesso desde ${quando(desdeDados)}`);
			comparativo = {
				...base,
				numeros: null,
				motivo: inicio ? `Ainda não dá para comparar com ${descricao}: ${inicio}.` : 'Ainda não há visitas para comparar.'
			};
		}
	}

	return {
		filtros,
		filtrado,
		comparacao,
		janela,
		primeiroDia,
		painel: filtradoDados,
		porDia: filtrado && !recente ? ((porDia?.data as Resumo | null)?.por_dia ?? []) : null,
		primeiroDiaFiltro,
		desdeDados,
		desdeEventos,
		comparativo,
		serieAnterior: recente && comparativo?.numeros ? (resumo?.serie ?? null) : null,
		porDiaAnterior: gAnterior
			? filtrado
				? ((porDiaAnt?.data as Resumo | null)?.por_dia ?? [])
				: ((porDiaAnt?.data as Dia[] | null) ?? [])
			: null,
		graficoAnterior: gAnterior
	};
}

/**
 * A nota embaixo da barra do recorte, numa frase só: até onde o filtro vai para
 * trás (o período começa antes da lista de acessos, ou, com filtro da pessoa,
 * antes de clique e tempo de tela saberem de quem são) e por que ainda não dá
 * para comparar. Nada a dizer, null.
 */
export function notaDoRecorte(r: Recorte): string | null {
	const partes: string[] = [];
	const antesDaLista = r.filtrado && (!r.desdeDados || Date.parse(r.janela.desde) < Date.parse(r.desdeDados));
	if (antesDaLista)
		partes.push(
			r.desdeDados
				? `Com filtro, os números contam a partir de ${quando(r.desdeDados)}, quando o DMetric começou a guardar cada acesso.`
				: 'Com filtro, os números contam a partir de agora.'
		);
	if (r.filtrado && filtroDaPessoa(r.filtros) && (!r.desdeEventos || Date.parse(r.janela.desde) < Date.parse(r.desdeEventos)))
		partes.push(
			r.desdeEventos
				? `Cliques e tempo de tela, a partir de ${quando(r.desdeEventos)}.`
				: 'Cliques e tempo de tela entram a partir de agora.'
		);
	const c = r.comparativo;
	if (c && !c.numeros)
		// Com o começo da lista já dito, basta dizer que a comparação espera.
		partes.push(antesDaLista ? `Por isso, ainda não dá para comparar com ${c.descricao}.` : (c.motivo ?? ''));
	return partes.filter(Boolean).join(' ') || null;
}
