// Projeção isométrica do DGathe: o losango 2:1 dos jogos de estratégia em tile.
//
// Mundo: x cresce para a direita-baixo da tela, y para a esquerda-baixo e z para
// cima. Uma unidade de x ou y é um ladrilho. Quem olha está do lado de x e y
// grandes, então as faces visíveis de uma caixa são o topo, a +y e a +x.

export const LADRILHO_L = 64; // largura do losango na tela, em px, no zoom 1
export const LADRILHO_A = 32; // altura do losango
export const ALTURA_UNIDADE = 34; // px de tela por unidade de altura (z)

export type Ponto = { x: number; y: number };

/** Caixa alinhada aos eixos, em unidades de mundo. */
export type Caixa = { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number };

/** Retângulo na tela. */
export type Retangulo = { x0: number; y0: number; x1: number; y1: number };

export function paraTela(x: number, y: number, z = 0): Ponto {
	return {
		x: ((x - y) * LADRILHO_L) / 2,
		y: ((x + y) * LADRILHO_A) / 2 - z * ALTURA_UNIDADE
	};
}

/** Ponto do chão (z = 0) que aparece numa posição da tela. */
export function paraMundo(sx: number, sy: number): Ponto {
	const a = sx / (LADRILHO_L / 2);
	const b = sy / (LADRILHO_A / 2);
	return { x: (a + b) / 2, y: (b - a) / 2 };
}

/**
 * Contorno de uma caixa na tela: o hexágono que ela ocupa, em sentido horário a
 * partir do canto de cima. Serve para o clique e para saber quem cobre quem.
 */
export function contornoCaixa(c: Caixa): Ponto[] {
	return [
		paraTela(c.x0, c.y0, c.z1),
		paraTela(c.x1, c.y0, c.z1),
		paraTela(c.x1, c.y0, c.z0),
		paraTela(c.x1, c.y1, c.z0),
		paraTela(c.x0, c.y1, c.z0),
		paraTela(c.x0, c.y1, c.z1)
	];
}

export function retanguloDe(pontos: Ponto[]): Retangulo {
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	for (const p of pontos) {
		if (p.x < x0) x0 = p.x;
		if (p.y < y0) y0 = p.y;
		if (p.x > x1) x1 = p.x;
		if (p.y > y1) y1 = p.y;
	}
	return { x0, y0, x1, y1 };
}

/** Os dois retângulos se cruzam (encostar não conta). */
export function cruzam(a: Retangulo, b: Retangulo): boolean {
	return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/** Ponto dentro de um polígono convexo em sentido horário (y para baixo). */
export function dentroDoPoligono(p: Ponto, poli: Ponto[]): boolean {
	for (let i = 0; i < poli.length; i++) {
		const a = poli[i];
		const b = poli[(i + 1) % poli.length];
		if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) < 0) return false;
	}
	return true;
}

const cacheTom = new Map<string, string>();

/**
 * Escurece (f < 1) ou clareia (f > 1) uma cor #rrggbb. Clarear puxa para o
 * branco, em vez de estourar o canal, para o topo das caixas não ficar néon.
 */
export function tom(hex: string, f: number): string {
	const chave = hex + f;
	const pronto = cacheTom.get(chave);
	if (pronto) return pronto;
	const n = parseInt(hex.slice(1), 16);
	const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
		f <= 1 ? Math.round(c * f) : Math.round(c + (255 - c) * (f - 1))
	);
	const saida = '#' + canais.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
	cacheTom.set(chave, saida);
	return saida;
}

/** Número pseudoaleatório estável para uma célula (variação da grama, cor de livro…). */
export function sorteio(x: number, y: number, semente = 0): number {
	let h = (x * 374761393 + y * 668265263 + semente * 2147483647) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
}
