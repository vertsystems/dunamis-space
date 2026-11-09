import { describe, expect, it } from 'vitest';
import { aEstrela, podePassar, suavizar, visada, livreMaisProxima, type Grade } from './caminho';

/**
 * Grade 6×5 com uma parede vertical na linha x = 3 (entre as colunas 2 e 3),
 * aberta só na linha y = 2 (a porta). A célula (1, 1) tem um móvel.
 */
function gradeComPorta(): Grade {
	return {
		largura: 6,
		altura: 5,
		livre: (x, y) => x >= 0 && y >= 0 && x < 6 && y < 5 && !(x === 1 && y === 1),
		parede: (x1, y1, x2, y2) => {
			const cruzaLinha3 = (x1 === 2 && x2 === 3) || (x1 === 3 && x2 === 2);
			return cruzaLinha3 && y1 === y2 && y1 !== 2;
		}
	};
}

describe('podePassar', () => {
	const g = gradeComPorta();
	it('bloqueia a parede e libera a porta', () => {
		expect(podePassar(g, 2, 0, 3, 0)).toBe(false);
		expect(podePassar(g, 2, 2, 3, 2)).toBe(true);
	});
	it('não corta quina de móvel na diagonal', () => {
		expect(podePassar(g, 0, 0, 1, 1)).toBe(false); // destino é o móvel
		expect(podePassar(g, 0, 1, 1, 2)).toBe(false); // passa raspando em (1,1)
		expect(podePassar(g, 0, 2, 1, 3)).toBe(true);
	});
	it('não atravessa a ponta da parede na diagonal', () => {
		expect(podePassar(g, 2, 1, 3, 2)).toBe(false);
	});
});

describe('aEstrela', () => {
	const g = gradeComPorta();
	it('contorna a parede passando pela porta', () => {
		const c = aEstrela(g, { x: 0, y: 0 }, { x: 5, y: 0 });
		expect(c).not.toBeNull();
		expect(c![0]).toEqual({ x: 0, y: 0 });
		expect(c![c!.length - 1]).toEqual({ x: 5, y: 0 });
		expect(c!.some((p) => p.x === 2 && p.y === 2)).toBe(true);
		expect(c!.some((p) => p.x === 3 && p.y === 2)).toBe(true);
	});
	it('devolve null quando não há como chegar', () => {
		const fechada: Grade = { ...gradeComPorta(), parede: (x1, y1, x2) => (x1 === 2 && x2 === 3) || (x1 === 3 && x2 === 2) };
		expect(aEstrela(fechada, { x: 0, y: 0 }, { x: 5, y: 4 })).toBeNull();
	});
	it('devolve null quando o destino é um móvel', () => {
		expect(aEstrela(gradeComPorta(), { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
	});
	it('origem igual ao destino é um caminho de uma célula', () => {
		expect(aEstrela(gradeComPorta(), { x: 4, y: 4 }, { x: 4, y: 4 })).toEqual([{ x: 4, y: 4 }]);
	});
});

describe('visada e suavizar', () => {
	const g = gradeComPorta();
	it('a parede corta a linha reta', () => {
		expect(visada(g, { x: 0.5, y: 0.5 }, { x: 5.5, y: 0.5 })).toBe(false);
		expect(visada(g, { x: 0.5, y: 2.5 }, { x: 5.5, y: 2.5 })).toBe(true);
	});
	it('um corredor reto vira um segmento só', () => {
		const pontos = [0, 1, 2, 3, 4, 5].map((x) => ({ x: x + 0.5, y: 2.5 }));
		expect(suavizar(g, pontos)).toEqual([pontos[0], pontos[5]]);
	});
	it('mantém a curva quando o atalho atravessa a parede', () => {
		const c = aEstrela(g, { x: 0, y: 0 }, { x: 5, y: 0 })!;
		const rota = suavizar(
			g,
			c.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }))
		);
		expect(rota.length).toBeGreaterThan(2);
		for (let i = 1; i < rota.length; i++) expect(visada(g, rota[i - 1], rota[i])).toBe(true);
	});
});

describe('livreMaisProxima', () => {
	it('acha a vizinha livre de um móvel', () => {
		const p = livreMaisProxima(gradeComPorta(), { x: 1.5, y: 1.5 });
		expect(p).not.toBeNull();
		expect(Math.abs(p!.x - 1) + Math.abs(p!.y - 1)).toBe(1);
	});
});
