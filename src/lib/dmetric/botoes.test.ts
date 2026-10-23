import { describe, expect, it } from 'vitest';
import { nomeDoBotao, ordenarBotoes, resumoDosBotoes, slugDoPageLinks, type BotaoPageLinks } from './botoes';

const b = (posicao: number | null, cliques: number, titulo: string | null = `B${posicao}`, tipo = 'link'): BotaoPageLinks => ({
	id: `id${posicao}-${cliques}`,
	tipo,
	titulo,
	imagem: null,
	noAr: posicao !== null,
	posicao,
	cliques,
	itens: [],
	semItem: 0
});

describe('botões do PageLinks', () => {
	it('só as páginas do dnms.fun', () => {
		expect(slugDoPageLinks({ dominio: 'dnms.fun', caminho: 'lojasmari' })).toBe('lojasmari');
		expect(slugDoPageLinks({ dominio: 'DNMS.FUN', caminho: 'Nali-Bar' })).toBe('nali-bar');
		expect(slugDoPageLinks({ dominio: 'dnms.fun', caminho: '' })).toBeNull();
		expect(slugDoPageLinks({ dominio: 'ninasantana.com', caminho: '' })).toBeNull();
	});
	it('o nome: o título, ou o tipo de bloco', () => {
		expect(nomeDoBotao({ titulo: ' Cardápio ', tipo: 'link' })).toBe('Cardápio');
		expect(nomeDoBotao({ titulo: null, tipo: 'imagem' })).toBe('Imagem com link');
		expect(nomeDoBotao({ titulo: '', tipo: 'xyz' })).toBe('Bloco');
	});
	it('o resumo: campeão e o peso dos três primeiros', () => {
		const r = resumoDosBotoes([b(1, 19), b(2, 28), b(3, 10), b(4, 53), b(5, 24)]);
		expect(r.total).toBe(134);
		expect(r.campeao?.posicao).toBe(4);
		expect(r.primeiros).toBeCloseTo(57 / 134);
		// Com 3 botões ou menos, "os três primeiros" são todos: não diz nada.
		expect(resumoDosBotoes([b(1, 5), b(2, 3)]).primeiros).toBeNull();
		expect(resumoDosBotoes([b(1, 0), b(2, 0)])).toEqual({ total: 0, campeao: null, primeiros: null });
	});
	it('ordem da página (fora do ar por último) ou dos mais clicados', () => {
		const lista = [b(2, 5), b(null, 9, 'Antigo'), b(1, 3)];
		expect(ordenarBotoes(lista, 'pagina').map((x) => x.posicao)).toEqual([1, 2, null]);
		expect(ordenarBotoes(lista, 'cliques').map((x) => x.cliques)).toEqual([9, 5, 3]);
	});
});
