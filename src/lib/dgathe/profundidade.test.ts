import { describe, expect, it } from 'vitest';
import { compara, ordenar, posicaoDinamica, telaDaCaixa, type Desenhavel } from './profundidade';
import { paraMundo, paraTela, type Caixa } from './iso';

const peca = (c: Caixa): Desenhavel & { nome?: string } => ({ caixa: c, tela: telaDaCaixa(c) });

describe('projeção', () => {
	it('ida e volta da tela para o chão', () => {
		const t = paraTela(7.25, 3.5);
		const m = paraMundo(t.x, t.y);
		expect(m.x).toBeCloseTo(7.25);
		expect(m.y).toBeCloseTo(3.5);
	});
});

describe('quem cobre quem', () => {
	it('separação em x, em y e em z', () => {
		const a = { x0: 0, y0: 0, z0: 0, x1: 1, y1: 1, z1: 1 };
		expect(compara(a, { ...a, x0: 1, x1: 2 })).toBe(-1);
		expect(compara({ ...a, y0: 2, y1: 3 }, a)).toBe(1);
		expect(compara(a, { ...a, z0: 1, z1: 1.5 })).toBe(-1);
	});

	it('o monitor vai depois da mesa em que está', () => {
		const mesa = peca({ x0: 0, y0: 0, z0: 0, x1: 2, y1: 1, z1: 0.5 });
		const monitor = peca({ x0: 0.6, y0: 0.4, z0: 0.5, x1: 1.4, y1: 0.5, z1: 1 });
		expect(ordenar([monitor, mesa])).toEqual([mesa, monitor]);
	});

	it('o avatar na quina da mesa grande fica na frente quando está à frente em y', () => {
		// O caso que a ordenação por x + y errava: o avatar está à frente da mesa em y,
		// mas o centro dele (0,1 + 2,27 = 2,37) soma menos que o da mesa (2,5).
		const mesa = peca({ x0: 0, y0: 0, z0: 0, x1: 3, y1: 2, z1: 0.55 });
		const avatar = peca({ x0: -0.12, y0: 2.05, z0: 0, x1: 0.32, y1: 2.49, z1: 1.4 });
		expect(avatar.tela.x1 > mesa.tela.x0).toBe(true); // eles se sobrepõem na tela
		expect(posicaoDinamica([mesa], avatar)).toBe(1);
	});

	it('o avatar atrás da mesa é desenhado antes dela', () => {
		const mesa = peca({ x0: 0, y0: 0, z0: 0, x1: 3, y1: 2, z1: 0.55 });
		const avatar = peca({ x0: 1.28, y0: -0.72, z0: 0, x1: 1.72, y1: -0.28, z1: 1.4 });
		expect(posicaoDinamica([mesa], avatar)).toBe(0);
	});
});
