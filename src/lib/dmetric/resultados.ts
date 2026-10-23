// DMetric — resultados: o que conta como resultado em cada site (as metas) e a
// conversão (dmetric_conversao, 0093). Sem I/O (testado em resultados.test.ts).

/**
 * O que conta como resultado num site que ainda não escolheu: é o contato que
 * vira venda. O mesmo de dmetric_metas_padrao(), no banco (0093).
 */
export const METAS_PADRAO = ['WhatsApp', 'Telefone', 'E-mail', 'Mapa'] as const;

/** Até quantas metas um site escolhe, e o maior nome de destino (o da lista de cliques). */
export const MAX_METAS = 20;
const MAX_VALOR = 80;

/** Uma linha das quebras (por origem, campanha, cidade, site). */
export type GrupoConversao = { valor: string; visitas: number; resultados: number };

/** O que dmetric_conversao devolve. */
export type Conversao = {
	visitas: number;
	/** Visitas que clicaram em alguma coisa (WhatsApp, link, mapa…). */
	clicaram: number;
	/** Visitas que clicaram numa meta. */
	converteram: number;
	/** Cada meta: quantos cliques e quantas visitas clicaram nela. */
	metas: { valor: string; cliques: number; visitas: number }[];
	grupos: Partial<Record<'origem' | 'campanha' | 'cidade' | 'site', GrupoConversao[]>>;
	/** De quando a conta começa: o começo do período, ou quando o clique passou a saber de quem é. */
	desde: string | null;
	/** O período começa antes disso: a conta é só da parte que dá para saber. */
	cortado: boolean;
};

export const CONVERSAO_VAZIA: Conversao = {
	visitas: 0,
	clicaram: 0,
	converteram: 0,
	metas: [],
	grupos: {},
	desde: null,
	cortado: false
};

/** As metas do site: as escolhidas ou, sem nenhuma, as do padrão. */
export function metasDoSite(escolhidas: string[]): { metas: string[]; padrao: boolean } {
	return escolhidas.length ? { metas: escolhidas, padrao: false } : { metas: [...METAS_PADRAO], padrao: true };
}

/**
 * O que veio do formulário de metas: sem vazio, sem repetida, no tamanho do banco.
 * Escolher exatamente o padrão é o mesmo que não escolher (fica a lista vazia).
 */
export function lerMetas(valores: string[]): string[] {
	const limpas = [...new Set(valores.map((v) => v.trim().slice(0, MAX_VALOR)).filter(Boolean))].slice(0, MAX_METAS);
	const ehPadrao = limpas.length === METAS_PADRAO.length && METAS_PADRAO.every((m) => limpas.includes(m));
	return ehPadrao ? [] : limpas;
}

/** A taxa de uma parte sobre o todo; sem todo, null. */
export const taxa = (parte: number, todo: number): number | null => (todo > 0 ? parte / todo : null);

/**
 * As opções para escolher as metas: os destinos que o site já teve, com as metas
 * atuais e as do padrão sempre na lista (mesmo sem clique ainda).
 */
export function opcoesDeMeta(destinos: { valor: string; cliques: number }[], metas: string[]): { valor: string; cliques: number; marcada: boolean }[] {
	const por = new Map(destinos.map((d) => [d.valor, d.cliques]));
	for (const m of [...METAS_PADRAO, ...metas]) if (!por.has(m)) por.set(m, 0);
	return [...por.entries()]
		.map(([valor, cliques]) => ({ valor, cliques, marcada: metas.includes(valor) }))
		.sort((a, b) => Number(b.marcada) - Number(a.marcada) || b.cliques - a.cliques || a.valor.localeCompare(b.valor, 'pt-BR'));
}
