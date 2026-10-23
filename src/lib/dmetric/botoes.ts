// DMetric — os botões de uma página do PageLinks: o que a rota /api/dmetric/botoes/
// do PageLinks devolve e as contas do quadro (qual rende mais, a taxa de clique e
// o peso dos primeiros). Sem I/O (testado em botoes.test.ts).

/** Um item dentro do bloco: a loja de "Unidades", o ícone de "Redes", a imagem do carrossel. */
export type ItemDoBotao = { nome: string; imagem: string | null; cliques: number };

export type BotaoPageLinks = {
	id: string;
	tipo: string;
	titulo: string | null;
	imagem: string | null;
	/** Está na página agora (ativo e dentro do período de publicação). */
	noAr: boolean;
	/** O lugar entre os botões no ar hoje (1 = o primeiro da página); fora do ar, null. */
	posicao: number | null;
	cliques: number;
	itens: ItemDoBotao[];
	/** Cliques do bloco de antes de o PageLinks guardar qual item foi. */
	semItem: number;
};

export type BotoesPageLinks = {
	pagina: { slug: string; titulo: string };
	botoes: BotaoPageLinks[];
	/** Cliques sem origem: robôs, fora das contas. */
	semOrigem: number;
};

/** O endereço do PageLinks de um site do DMetric (dnms.fun/<slug>); outro site, null. */
export function slugDoPageLinks(site: { dominio: string | null; caminho?: string | null }): string | null {
	if ((site.dominio ?? '').toLowerCase() !== 'dnms.fun') return null;
	const slug = (site.caminho ?? '').toLowerCase();
	return /^[a-z0-9-]{1,80}$/.test(slug) ? slug : null;
}

const NOME_DO_TIPO: Record<string, string> = {
	link: 'Botão',
	destaque: 'Botão em destaque',
	whatsapp: 'WhatsApp',
	imagem: 'Imagem com link',
	redes: 'Redes sociais',
	carrossel: 'Carrossel',
	unidades: 'Unidades'
};

/** O nome do botão no quadro: o título dele, ou o tipo de bloco quando não tem título. */
export const nomeDoBotao = (b: Pick<BotaoPageLinks, 'titulo' | 'tipo'>) => b.titulo?.trim() || NOME_DO_TIPO[b.tipo] || 'Bloco';

/** O tipo por extenso, para a linha de baixo. */
export const tipoDoBotao = (tipo: string) => NOME_DO_TIPO[tipo] ?? tipo;

/**
 * O resumo do quadro: o total de cliques, o botão campeão e quanto os três
 * primeiros da página levam (é onde o olho chega primeiro — vale saber se a
 * ordem está ajudando).
 */
export function resumoDosBotoes(botoes: BotaoPageLinks[]): {
	total: number;
	campeao: BotaoPageLinks | null;
	/** Fatia dos cliques nos botões 1, 2 e 3 (null com menos de 4 botões no ar). */
	primeiros: number | null;
} {
	const total = botoes.reduce((t, b) => t + b.cliques, 0);
	const campeao = total ? botoes.reduce((m, b) => (b.cliques > m.cliques ? b : m), botoes[0]) : null;
	const noAr = botoes.filter((b) => b.posicao !== null);
	const primeiros =
		total && noAr.length >= 4 ? noAr.filter((b) => (b.posicao ?? 99) <= 3).reduce((t, b) => t + b.cliques, 0) / total : null;
	return { total, campeao, primeiros };
}

/** Na ordem da página (fora do ar por último) ou dos mais clicados. */
export function ordenarBotoes(botoes: BotaoPageLinks[], ordem: 'pagina' | 'cliques'): BotaoPageLinks[] {
	return [...botoes].sort((a, b) =>
		ordem === 'cliques'
			? b.cliques - a.cliques || (a.posicao ?? 999) - (b.posicao ?? 999)
			: (a.posicao ?? 999) - (b.posicao ?? 999) || b.cliques - a.cliques
	);
}
