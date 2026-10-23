// DMetric — o recorte do painel: os filtros (clicar num item filtra a tela toda)
// e a comparação com o período anterior. Sem I/O (testado em recorte.test.ts);
// quem busca os números é src/lib/server/dmetricRecorte.ts.
import {
	RECENTES,
	dataBr,
	diasDoMes,
	diasEntre,
	intervalo,
	rotuloDias,
	rotuloMes,
	somarDias,
	type EscolhaGrafico,
	type Periodo,
	type PontoSerie
} from './painel';

// ---- Filtros -------------------------------------------------------------------

/** As listas em que um clique no item filtra o painel. */
export const DIMENSOES_FILTRO = [
	'origem',
	'campanha',
	'pagina',
	'clique',
	'pais',
	'cidade',
	'dispositivo',
	'navegador',
	'sistema'
] as const;
export type DimensaoFiltro = (typeof DIMENSOES_FILTRO)[number];

/** O nome de cada filtro na etiqueta ("Origem: Instagram"). */
export const ROTULO_FILTRO: Record<DimensaoFiltro, string> = {
	origem: 'Origem',
	campanha: 'Campanha',
	pagina: 'Página',
	clique: 'Clique',
	pais: 'País',
	cidade: 'Cidade',
	dispositivo: 'Aparelho',
	navegador: 'Navegador',
	sistema: 'Sistema'
};

/**
 * Os filtros vêm na URL com o nome da lista: ?origem=Instagram&cidade=Guarujá · SP.
 * A página leva o site junto ("<id do site>|/caminho"), porque "/" de dois sites
 * são páginas diferentes; na página de um site, só o caminho.
 */
export type Filtros = Partial<Record<DimensaoFiltro, string>>;

/** O maior valor que uma lista guarda (origem e campanha, 120; página, 200 + o site). */
const MAX_FILTRO = 240;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lerFiltros(busca: URLSearchParams): Filtros {
	const f: Filtros = {};
	for (const d of DIMENSOES_FILTRO) {
		const v = busca.get(d);
		if (v && v.length <= MAX_FILTRO) f[d] = v;
	}
	return f;
}

export const temFiltro = (f: Filtros) => DIMENSOES_FILTRO.some((d) => f[d]);

/** Filtro da pessoa (todos menos o de página): aí clique e tempo de tela só contam quando se sabe de quem são. */
export const filtroDaPessoa = (f: Filtros) => DIMENSOES_FILTRO.some((d) => d !== 'pagina' && f[d]);

/** A página do filtro separada no site (se veio) e no caminho. */
export function lerPagina(v: string): { site: string | null; caminho: string } {
	if (v.charAt(36) === '|' && UUID.test(v.slice(0, 36))) return { site: v.slice(0, 36), caminho: v.slice(37) };
	return { site: null, caminho: v };
}

/** O valor de página que vai na URL. */
export const valorDaPagina = (site: string | null | undefined, caminho: string) => (site ? `${site}|${caminho}` : caminho);

/**
 * O que vai para dmetric_eventos_painel (0091). Na página de um site (siteFixo), a
 * página do filtro é dele; em "todos os sites", a do site que veio junto.
 */
export function filtrosParaBanco(f: Filtros, siteFixo: string | null = null): Record<string, string> {
	const b: Record<string, string> = {};
	for (const d of DIMENSOES_FILTRO) {
		const v = f[d];
		if (!v) continue;
		if (d !== 'pagina') {
			b[d] = v;
			continue;
		}
		const p = lerPagina(v);
		b.pagina = p.caminho;
		const site = siteFixo ?? p.site;
		if (site) b.pagina_site = site;
	}
	return b;
}

/**
 * O endereço com mudanças: valor novo troca, null (ou vazio) tira. Os outros
 * parâmetros ficam onde estavam — o mesmo recorte dá sempre o mesmo link.
 */
export function buscaCom(atual: URLSearchParams, mudancas: Record<string, string | null>): string {
	const p = new URLSearchParams(atual);
	for (const [k, v] of Object.entries(mudancas)) {
		if (v) p.set(k, v);
		else p.delete(k);
	}
	const s = p.toString();
	return s ? `?${s}` : '?';
}

/** Tira todos os filtros (o período, o site e o resto ficam). */
export const semFiltros = (atual: URLSearchParams) =>
	buscaCom(atual, Object.fromEntries(DIMENSOES_FILTRO.map((d) => [d, null])));

/** O que passa de uma tela para a outra: o período, a comparação, o gráfico e os filtros. */
const LEVAR = ['periodo', 'comparar', 'grafico'] as const;

/**
 * O recorte levado do painel para a página de um site. A página do filtro só vai
 * se for desse site (e vai sem o site, que ali está fixo).
 */
export function buscaParaSite(atual: URLSearchParams, site: string): string {
	const p = new URLSearchParams();
	for (const k of LEVAR) {
		const v = atual.get(k);
		if (v) p.set(k, v);
	}
	for (const [d, v] of Object.entries(lerFiltros(atual))) {
		if (d !== 'pagina') p.set(d, v);
		else {
			const pg = lerPagina(v);
			if (pg.site === site) p.set(d, pg.caminho);
		}
	}
	const s = p.toString();
	return s ? `?${s}` : '';
}

/** E de volta, da página do site para o painel de todos: a página do filtro ganha o site. */
export function buscaParaTodos(atual: URLSearchParams, site: string): string {
	const p = new URLSearchParams();
	for (const k of LEVAR) {
		const v = atual.get(k);
		if (v) p.set(k, v);
	}
	for (const [d, v] of Object.entries(lerFiltros(atual))) p.set(d, d === 'pagina' ? valorDaPagina(site, lerPagina(v).caminho) : v);
	const s = p.toString();
	return s ? `?${s}` : '';
}

// ---- Horário de Brasília ------------------------------------------------------

const PARTES = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'America/Sao_Paulo',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23'
});

/** O dia (AAAA-MM-DD) e a hora com fração (14,5 = 14h30) de um instante, em Brasília. */
export function emBrasilia(d: Date): { dia: string; hora: number } {
	const p = Object.fromEntries(PARTES.formatToParts(d).map((x) => [x.type, x.value]));
	return {
		dia: `${p.year}-${p.month}-${p.day}`,
		hora: Number(p.hour) + Number(p.minute) / 60 + Number(p.second) / 3600
	};
}

/**
 * A meia-noite de um dia em Brasília, como instante (ISO). Brasília está em UTC−3
 * desde 2019, sem horário de verão; a conta confere o fuso do próprio dia mesmo assim.
 */
export function inicioDoDia(dia: string): string {
	const palpite = Date.parse(`${dia}T03:00:00Z`);
	const b = emBrasilia(new Date(palpite));
	const ajuste = b.dia === dia ? b.hora : b.hora - 24;
	return new Date(palpite - ajuste * 3_600_000).toISOString();
}

/** "14:35" em Brasília. */
const HORA = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

/** 14,75 → "14h45"; 9 → "9h". */
function horaCurta(h: number): string {
	const total = Math.floor(h * 60);
	const m = total % 60;
	return `${Math.floor(total / 60)}h${m ? String(m).padStart(2, '0') : ''}`;
}

// ---- Comparação ------------------------------------------------------------------

export const COMPARACOES = [
	{ id: 'anterior', rotulo: 'Período anterior' },
	{ id: 'ano', rotulo: 'Ano passado' },
	{ id: 'nao', rotulo: 'Sem comparação' }
] as const;
export type Comparacao = (typeof COMPARACOES)[number]['id'];

/** Sem escolha na URL, compara com o período anterior. */
export const lerComparacao = (v: string | null): Comparacao =>
	COMPARACOES.some((c) => c.id === v) ? (v as Comparacao) : 'anterior';

/**
 * Uma janela do painel: os instantes (para a lista de acessos) e os dias, em
 * Brasília (para os contadores). `ateHora`: a janela termina hoje, no meio do
 * dia — o último dia só conta até essa hora (14,5 = 14h30).
 */
export type Janela = { desde: string; ate: string; de: string; ateDia: string; ateHora: number | null };

/** A janela do período escolhido, terminando agora. */
export function janelaDoPeriodo(periodo: Periodo, hoje: string, agora: Date): Janela {
	const recente = RECENTES[periodo];
	if (recente) {
		const desde = new Date(agora.getTime() - recente.horas * 3_600_000);
		// Um minuto de folga no fim: o relógio do banco pode estar um pouco à frente.
		const ate = new Date(agora.getTime() + 60_000);
		return { desde: desde.toISOString(), ate: ate.toISOString(), de: emBrasilia(desde).dia, ateDia: hoje, ateHora: emBrasilia(agora).hora };
	}
	const { de, ate } = intervalo(periodo, hoje);
	return { desde: inicioDoDia(de), ate: inicioDoDia(somarDias(ate, 1)), de, ateDia: ate, ateHora: null };
}

/** A mesma data um ano antes (29/02 vira 28/02). */
export function anoAntes(dia: string): string {
	const [a, m, d] = dia.split('-').map(Number);
	const ultimo = new Date(Date.UTC(a - 1, m, 0)).getUTCDate();
	return `${a - 1}-${String(m).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`;
}

/**
 * A janela com que se compara: a de antes, do mesmo tamanho, ou a mesma do ano
 * passado. A de hoje ainda não acabou, então a de antes para na mesma hora do dia
 * — senão a comparação sairia sempre para baixo. "Desde o começo" não tem antes.
 */
export function janelaAnterior(j: Janela, periodo: Periodo, comparacao: Comparacao, hoje: string, agora: Date): Janela | null {
	if (comparacao === 'nao' || periodo === 'tudo') return null;
	const recente = RECENTES[periodo];
	if (recente) {
		const mover = (iso: string) => {
			const d = new Date(iso);
			if (comparacao === 'ano') d.setUTCFullYear(d.getUTCFullYear() - 1);
			else d.setTime(d.getTime() - recente.horas * 3_600_000);
			return d;
		};
		const desde = mover(j.desde);
		const ate = mover(j.ate);
		const fim = emBrasilia(ate);
		return { desde: desde.toISOString(), ate: ate.toISOString(), de: emBrasilia(desde).dia, ateDia: fim.dia, ateHora: fim.hora };
	}
	const n = diasEntre(j.de, j.ateDia).length;
	const de = comparacao === 'ano' ? anoAntes(j.de) : somarDias(j.de, -n);
	const ateDia = comparacao === 'ano' ? anoAntes(j.ateDia) : somarDias(j.ateDia, -n);
	const ateHora = j.ateDia === hoje ? emBrasilia(agora).hora : null;
	const ate =
		ateHora === null
			? inicioDoDia(somarDias(ateDia, 1))
			: new Date(Date.parse(inicioDoDia(ateDia)) + ateHora * 3_600_000).toISOString();
	return { desde: inicioDoDia(de), ate, de, ateDia, ateHora };
}

/**
 * A janela anterior está inteira dentro do que foi contado? Nos contadores, a
 * partir do primeiro dia inteiro (o primeiro dia começou no meio, quando o código
 * entrou no site); na lista de acessos, a partir do primeiro acesso guardado.
 */
export function janelaCoberta(j: Janela, fonte: { primeiroDia?: string | null; desde?: string | null }): boolean {
	if ('desde' in fonte) return !!fonte.desde && Date.parse(j.desde) >= Date.parse(fonte.desde);
	return !!fonte.primeiroDia && j.de > fonte.primeiroDia;
}

/** O que a comparação usa, em palavras: "os 7 dias anteriores", "o mesmo período do ano passado". */
export function descricaoDaComparacao(periodo: Periodo, comparacao: Comparacao): string {
	if (comparacao === 'ano') return 'o mesmo período do ano passado';
	return (
		{
			'1h': 'a hora anterior',
			'24h': 'as 24 horas anteriores',
			'7d': 'os 7 dias anteriores',
			'30d': 'os 30 dias anteriores',
			'12m': 'os 12 meses anteriores',
			tudo: ''
		} as const
	)[periodo];
}

/** As datas de uma janela, para a dica: "10/10 a 16/10/2026, até 16h45" ou "22/10, 15:30 a 16:30". */
export function datasDaJanela(j: Janela, periodo: Periodo): string {
	if (RECENTES[periodo]) {
		const desde = new Date(j.desde);
		const ate = new Date(j.ate);
		const dDesde = dataBr(emBrasilia(desde).dia).slice(0, 5);
		const dAte = dataBr(emBrasilia(ate).dia).slice(0, 5);
		return dDesde === dAte
			? `${dDesde}, ${HORA.format(desde)} a ${HORA.format(ate)}`
			: `${dDesde}, ${HORA.format(desde)} a ${dAte}, ${HORA.format(ate)}`;
	}
	return rotuloDias(j.de, j.ateDia) + (j.ateHora !== null ? `, até ${horaCurta(j.ateHora)}` : '');
}

/** Os números que se comparam. Tempo médio = segundos ÷ visitas. */
export type NumerosComparados = { visitas: number; visualizacoes: number; segundos: number; cliques: number };

export type Comparativo = {
	comparacao: Comparacao;
	/** "os 7 dias anteriores". */
	descricao: string;
	/** "10/10 a 16/10/2026, até 16h45". */
	datas: string;
	/** Os números de antes; null = não dá para comparar (o motivo diz por quê). */
	numeros: NumerosComparados | null;
	motivo?: string;
	/** Com filtro da pessoa: cliques e tempo de tela de antes ainda não sabiam de quem eram. */
	semEventos?: boolean;
};

/** A variação contra o período anterior (0,12 = +12%). Sem base (antes, zero), null. */
export function variacao(atual: number, anterior: number): number | null {
	if (!(anterior > 0)) return null;
	return atual / anterior - 1;
}

/** "+12%", "−8%" (com o sinal de menos de verdade) ou "0%". */
export function textoVariacao(v: number): string {
	const p = Math.round(v * 100);
	if (p === 0) return '0%';
	return `${p > 0 ? '+' : '−'}${new Intl.NumberFormat('pt-BR').format(Math.abs(p))}%`;
}

// ---- A linha tracejada do gráfico ---------------------------------------------------

/**
 * A janela do gráfico por dia para comparar: o mês, o ano ou os dias de antes — ou
 * os mesmos do ano passado.
 */
export function graficoAnterior(g: EscolhaGrafico, comparacao: Comparacao): { de: string; ate: string; rotulo: string } | null {
	if (comparacao === 'nao') return null;
	if (g.tipo === 'ano') {
		const a = String(Number(g.id) - 1);
		return { de: `${a}-01-01`, ate: `${a}-12-31`, rotulo: a };
	}
	if (g.tipo === 'mes') {
		const [a, m] = g.id.split('-').map(Number);
		const mes =
			comparacao === 'ano'
				? `${a - 1}-${String(m).padStart(2, '0')}`
				: m === 1
					? `${a - 1}-12`
					: `${a}-${String(m - 1).padStart(2, '0')}`;
		return { ...diasDoMes(mes), rotulo: rotuloMes(mes) };
	}
	const n = diasEntre(g.de, g.ate).length;
	const de = comparacao === 'ano' ? anoAntes(g.de) : somarDias(g.de, -n);
	const ate = comparacao === 'ano' ? anoAntes(g.ate) : somarDias(g.ate, -n);
	return { de, ate, rotulo: rotuloDias(de, ate) };
}

/**
 * A série de antes, ponto a ponto com a de agora (o 1º dia com o 1º dia, a 1ª hora
 * com a 1ª hora). Ponto de antes sem dados (antes de contar) fica sem linha.
 */
export function comSerieAnterior(serie: PontoSerie[], anterior: PontoSerie[]): PontoSerie[] {
	return serie.map((p, i) => {
		const a = anterior[i];
		return {
			...p,
			anterior: a && !a.semDados && !a.futuro ? { visitas: a.visitas, visualizacoes: a.visualizacoes, rotulo: a.rotulo } : null
		};
	});
}
