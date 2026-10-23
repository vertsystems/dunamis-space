// DMetric — saúde da página: a nota de 0 a 100 de cada site, a partir do que o
// script mediu no aparelho de quem visitou (dmetric_saude_painel, 0081). Só
// regras, sem I/O: a aba Saúde usa isto e o teste cobre (saude.test.ts).
//
// A nota junta três partes:
//   velocidade (60%) — as medidas do Google (Web Vitals), cada visita contando
//     100 se foi boa, 50 se "a melhorar" e 0 se ruim, com o peso de cada medida;
//   erros (25%) — erros de JavaScript e arquivos que não carregaram, por página
//     aberta, nas últimas 72 horas (é o que a lista mostra: o que foi corrigido
//     sai sozinho; migration 0083);
//   links quebrados (15%) — quantas das páginas abertas deram 404.
// As faixas são as do Lighthouse: 90+ ótima, 50–89 pode melhorar, abaixo ruim.

export type MetricaVital = 'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb';

export type LinhaVital = {
	site_id: string;
	metrica: MetricaVital;
	bons: number;
	medios: number;
	ruins: number;
	soma: number;
};

export type LinhaErro = {
	site_id: string;
	/** js = erro de JavaScript; recurso = arquivo que não carregou; 404 = página que não existe */
	tipo: 'js' | 'recurso' | '404';
	/** js: a mensagem; recurso: o endereço do arquivo; 404: o endereço quebrado. */
	mensagem: string;
	pagina: string;
	/** js/recurso: domínio do arquivo; 404: a página que tinha o link, ou a origem (Instagram…). */
	origem: string;
	ocorrencias: number;
	/** O último dia em que aconteceu. */
	ultimo: string;
	/** Quando aconteceu pela última vez (JS e arquivo: é o que conta nas 72 horas). */
	ultimo_em?: string;
};

/** Todos os erros de um site, contados por tipo (dmetric_saude_painel, 0089): a base da nota. */
export type ResumoErros = {
	site_id: string;
	tipo: LinhaErro['tipo'];
	/** Quantos erros diferentes. */
	distintos: number;
	/** Quantas vezes, somando todos. */
	ocorrencias: number;
};

export type SaudeDados = {
	vitais: LinhaVital[];
	/** Os 60 mais frequentes de cada site: o que a tela e o PDF mostram. */
	erros: LinhaErro[];
	/** Todos os erros de cada site, contados. Sem ele (dados antigos), a conta sai da lista. */
	erros_resumo?: ResumoErros[];
	visualizacoes: { site_id: string; visualizacoes: number }[];
	/** Páginas vistas nos dias que as 72 horas alcançam: a base da nota de erros. */
	visualizacoes_72h?: { site_id: string; visualizacoes: number }[];
};

export const SAUDE_VAZIA: SaudeDados = { vitais: [], erros: [], erros_resumo: [], visualizacoes: [], visualizacoes_72h: [] };

/** Os erros da página (JS e arquivo) valem por este tanto: depois, saem da lista e do banco. */
export const HORAS_ERROS = 72;

export const MEDIDAS: {
	id: MetricaVital;
	nome: string;
	sigla: string;
	explica: string;
	/** Até aqui é bom; até `ruim` é "a melhorar"; acima, ruim (limites do Google). */
	bom: number;
	ruim: number;
	peso: number;
}[] = [
	{ id: 'lcp', nome: 'Carregamento', sigla: 'LCP', explica: 'quanto o conteúdo principal leva para aparecer', bom: 2500, ruim: 4000, peso: 35 },
	{ id: 'inp', nome: 'Resposta ao toque', sigla: 'INP', explica: 'quanto a tela demora para reagir a um toque ou clique', bom: 200, ruim: 500, peso: 30 },
	{ id: 'cls', nome: 'Estabilidade', sigla: 'CLS', explica: 'quanto a página "pula" enquanto carrega', bom: 0.1, ruim: 0.25, peso: 15 },
	{ id: 'fcp', nome: 'Primeira imagem', sigla: 'FCP', explica: 'quanto leva para aparecer a primeira coisa na tela', bom: 1800, ruim: 3000, peso: 10 },
	{ id: 'ttfb', nome: 'Resposta do servidor', sigla: 'TTFB', explica: 'quanto o servidor demora para começar a responder', bom: 800, ruim: 1800, peso: 10 }
];

const PESO_VELOCIDADE = 60;
const PESO_ERROS = 25;
const PESO_LINKS = 15;
/** Menos medidas que isso: a nota aparece, com o aviso de que ainda pode mudar. */
export const AMOSTRA_MINIMA = 10;

export type Avaliacao = 'bom' | 'medio' | 'ruim';
export type Faixa = 'otima' | 'melhorar' | 'ruim';

export type Medida = {
	id: MetricaVital;
	n: number;
	bons: number;
	medios: number;
	ruins: number;
	/** Média do valor (ms; cls sem unidade). */
	media: number;
	/** Como o Google avalia: em que faixa caem 3 de cada 4 visitas. */
	avaliacao: Avaliacao;
	nota: number;
};

export type SaudeSite = {
	site_id: string;
	/** null = ainda sem medidas de velocidade (a nota precisa delas). */
	nota: number | null;
	faixa: Faixa | null;
	velocidade: number | null;
	erros: number;
	links: number;
	medidas: Medida[];
	/** Quantas visitas mandaram medidas (a maior contagem entre as medidas). */
	amostra: number;
	/** Páginas abertas: as vistas mais as que deram 404. */
	cargas: number;
	/** Páginas vistas nos dias das últimas 72 horas (a base da nota de erros). */
	cargas72: number;
	/** Erros de JavaScript e arquivos que não carregaram, os mais frequentes primeiro (até 60). */
	listaErros: LinhaErro[];
	/** Os 404, os mais frequentes primeiro (até 60, junto com os erros). */
	quebrados: LinhaErro[];
	/** Quantos erros diferentes (JS e arquivo) o site teve de verdade — a lista pode mostrar menos. */
	nErros: number;
	/** Quantos endereços diferentes deram 404. */
	nQuebrados: number;
};

export function avaliar(id: MetricaVital, valor: number): Avaliacao {
	const m = MEDIDAS.find((x) => x.id === id)!;
	return valor <= m.bom ? 'bom' : valor <= m.ruim ? 'medio' : 'ruim';
}

export function faixaDaNota(nota: number): Faixa {
	return nota >= 90 ? 'otima' : nota >= 50 ? 'melhorar' : 'ruim';
}

export const ROTULO_FAIXA: Record<Faixa, string> = { otima: 'Ótima', melhorar: 'Pode melhorar', ruim: 'Ruim' };
export const ROTULO_AVALIACAO: Record<Avaliacao, string> = { bom: 'Bom', medio: 'A melhorar', ruim: 'Ruim' };

/** Uma medida somada no período (as linhas de um site, de uma métrica). */
export function medida(id: MetricaVital, linhas: LinhaVital[]): Medida | null {
	let bons = 0;
	let medios = 0;
	let ruins = 0;
	let soma = 0;
	for (const l of linhas) {
		if (l.metrica !== id) continue;
		bons += l.bons;
		medios += l.medios;
		ruins += l.ruins;
		soma += l.soma;
	}
	const n = bons + medios + ruins;
	if (!n) return null;
	return {
		id,
		n,
		bons,
		medios,
		ruins,
		media: soma / n,
		avaliacao: bons / n >= 0.75 ? 'bom' : (bons + medios) / n >= 0.75 ? 'medio' : 'ruim',
		nota: Math.round((bons * 100 + medios * 50) / n)
	};
}

/** 0–100 a partir de uma taxa: cada ponto percentual tira `porPonto` pontos. */
const pelaTaxa = (taxa: number, porPonto: number) => Math.round(Math.max(0, 100 - taxa * 100 * porPonto));

/** A saúde de cada site com alguma coisa medida no período, a pior nota primeiro. */
export function saudePorSite(dados: SaudeDados): SaudeSite[] {
	const ids = new Set<string>();
	for (const l of dados.vitais) ids.add(l.site_id);
	for (const e of dados.erros) ids.add(e.site_id);
	for (const r of dados.erros_resumo ?? []) ids.add(r.site_id);
	const vistas = new Map(dados.visualizacoes.map((v) => [v.site_id, v.visualizacoes]));
	const vistas72 = new Map((dados.visualizacoes_72h ?? []).map((v) => [v.site_id, v.visualizacoes]));

	const fora: SaudeSite[] = [];
	for (const site_id of ids) {
		const linhas = dados.vitais.filter((l) => l.site_id === site_id);
		const medidas = MEDIDAS.map((m) => medida(m.id, linhas)).filter((m): m is Medida => !!m);
		let peso = 0;
		let soma = 0;
		for (const m of medidas) {
			const p = MEDIDAS.find((x) => x.id === m.id)!.peso;
			peso += p;
			soma += m.nota * p;
		}
		const velocidade = peso ? Math.round(soma / peso) : null;

		const doSite = dados.erros.filter((e) => e.site_id === site_id).sort((a, b) => b.ocorrencias - a.ocorrencias);
		const listaErros = doSite.filter((e) => e.tipo !== '404');
		const quebrados = doSite.filter((e) => e.tipo === '404');
		// A conta usa todos os erros do site (o resumo), não só os que cabem na lista:
		// com a lista cortada, um site parecia sem erro e tirava 100.
		const resumo = dados.erros_resumo
			? dados.erros_resumo.filter((r) => r.site_id === site_id)
			: doSite.map((e) => ({ site_id, tipo: e.tipo, distintos: 1, ocorrencias: e.ocorrencias }));
		const doTipo = (tipos: LinhaErro['tipo'][], campo: 'distintos' | 'ocorrencias') =>
			resumo.filter((r) => tipos.includes(r.tipo)).reduce((t, r) => t + r[campo], 0);
		const n404 = doTipo(['404'], 'ocorrencias');
		const cargas = (vistas.get(site_id) ?? 0) + n404;
		// O script manda cada erro uma vez por página aberta: as ocorrências são,
		// no máximo, páginas com aquele erro. Arquivo que não carregou pesa metade.
		// Os erros são das últimas 72 horas: comparam com as páginas do mesmo trecho.
		const pesoErros = doTipo(['js'], 'ocorrencias') + doTipo(['recurso'], 'ocorrencias') * 0.5;
		const cargas72 = vistas72.get(site_id) ?? 0;
		// Erro de 1 em cada 4 páginas zera a parte de erros; 404 em 1 de cada 10, a de links.
		const erros = cargas72 ? pelaTaxa(pesoErros / cargas72, 4) : pesoErros ? 0 : 100;
		const links = cargas ? pelaTaxa(n404 / cargas, 10) : n404 ? 0 : 100;

		const nota =
			velocidade === null
				? null
				: Math.round((velocidade * PESO_VELOCIDADE + erros * PESO_ERROS + links * PESO_LINKS) / (PESO_VELOCIDADE + PESO_ERROS + PESO_LINKS));
		fora.push({
			site_id,
			nota,
			faixa: nota === null ? null : faixaDaNota(nota),
			velocidade,
			erros,
			links,
			medidas,
			amostra: Math.max(0, ...medidas.map((m) => m.n)),
			cargas,
			cargas72,
			listaErros,
			quebrados,
			nErros: doTipo(['js', 'recurso'], 'distintos'),
			nQuebrados: doTipo(['404'], 'distintos')
		});
	}
	// Pior primeiro (é o que precisa de atenção); sem nota, por último.
	return fora.sort((a, b) => (a.nota ?? 101) - (b.nota ?? 101) || b.cargas - a.cargas);
}

/** "1,8 s", "350 ms" — ou, no CLS, o número puro ("0,12"). */
export function valorDaMedida(id: MetricaVital, v: number): string {
	if (id === 'cls') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	if (v >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
	return `${Math.round(v)} ms`;
}

