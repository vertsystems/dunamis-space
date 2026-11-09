// Caminho do avatar: A* nas células (8 direções) e depois um "puxa-fio" que
// tira os zigue-zagues sempre que dá para ir em linha reta.
//
// A grade é passada de fora (célula livre? parede entre vizinhas?) para dar
// para testar com mapas pequenos, sem o escritório inteiro.

import type { Ponto } from './iso';

export type Grade = {
	largura: number;
	altura: number;
	livre(x: number, y: number): boolean;
	/** Parede entre duas células vizinhas em cruz. */
	parede(x1: number, y1: number, x2: number, y2: number): boolean;
};

/** Dá para ir da célula a para a vizinha b (inclusive na diagonal, sem cortar quina)? */
export function podePassar(g: Grade, ax: number, ay: number, bx: number, by: number): boolean {
	if (!g.livre(bx, by)) return false;
	const dx = bx - ax;
	const dy = by - ay;
	if (dx === 0 || dy === 0) return !g.parede(ax, ay, bx, by);
	// Diagonal: os dois caminhos em L precisam estar abertos.
	return (
		g.livre(bx, ay) &&
		g.livre(ax, by) &&
		!g.parede(ax, ay, bx, ay) &&
		!g.parede(bx, ay, bx, by) &&
		!g.parede(ax, ay, ax, by) &&
		!g.parede(ax, by, bx, by)
	);
}

const VIZINHOS: [number, number, number][] = [
	[1, 0, 1],
	[-1, 0, 1],
	[0, 1, 1],
	[0, -1, 1],
	[1, 1, Math.SQRT2],
	[1, -1, Math.SQRT2],
	[-1, 1, Math.SQRT2],
	[-1, -1, Math.SQRT2]
];

/** Células do caminho, da inicial à final (inclusive), ou null se não há como chegar. */
export function aEstrela(g: Grade, ini: Ponto, fim: Ponto): Ponto[] | null {
	const n = g.largura * g.altura;
	const idx = (x: number, y: number) => y * g.largura + x;
	if (!g.livre(fim.x, fim.y)) return null;
	const custo = new Float64Array(n).fill(Infinity);
	const veio = new Int32Array(n).fill(-1);
	const fechado = new Uint8Array(n);
	const h = (x: number, y: number) => {
		const dx = Math.abs(x - fim.x);
		const dy = Math.abs(y - fim.y);
		return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
	};
	// Fila de prioridade simples (heap binário de [f, índice]).
	const heap: [number, number][] = [];
	const empurra = (f: number, i: number) => {
		heap.push([f, i]);
		let c = heap.length - 1;
		while (c > 0) {
			const p = (c - 1) >> 1;
			if (heap[p][0] <= heap[c][0]) break;
			[heap[p], heap[c]] = [heap[c], heap[p]];
			c = p;
		}
	};
	const tira = (): [number, number] => {
		const topo = heap[0];
		const ultimo = heap.pop()!;
		if (heap.length) {
			heap[0] = ultimo;
			let c = 0;
			for (;;) {
				const l = 2 * c + 1;
				const r = l + 1;
				let m = c;
				if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
				if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
				if (m === c) break;
				[heap[m], heap[c]] = [heap[c], heap[m]];
				c = m;
			}
		}
		return topo;
	};

	const i0 = idx(ini.x, ini.y);
	custo[i0] = 0;
	empurra(h(ini.x, ini.y), i0);
	const alvo = idx(fim.x, fim.y);

	while (heap.length) {
		const [, atual] = tira();
		if (fechado[atual]) continue;
		if (atual === alvo) break;
		fechado[atual] = 1;
		const cx = atual % g.largura;
		const cy = (atual - cx) / g.largura;
		for (const [dx, dy, passo] of VIZINHOS) {
			const nx = cx + dx;
			const ny = cy + dy;
			if (nx < 0 || ny < 0 || nx >= g.largura || ny >= g.altura) continue;
			const ni = idx(nx, ny);
			if (fechado[ni] || !podePassar(g, cx, cy, nx, ny)) continue;
			const novo = custo[atual] + passo;
			if (novo < custo[ni]) {
				custo[ni] = novo;
				veio[ni] = atual;
				empurra(novo + h(nx, ny), ni);
			}
		}
	}

	if (alvo !== i0 && veio[alvo] === -1) return null;
	const celulas: Ponto[] = [];
	for (let i = alvo; i !== -1; i = veio[i]) {
		celulas.push({ x: i % g.largura, y: Math.floor(i / g.largura) });
		if (i === i0) break;
	}
	return celulas.reverse();
}

/**
 * Dá para andar em linha reta de a até b? Percorre as células que o segmento
 * cruza (DDA) e confere cada passagem, inclusive as quinas.
 */
export function visada(g: Grade, a: Ponto, b: Ponto): boolean {
	let cx = Math.floor(a.x);
	let cy = Math.floor(a.y);
	const fx = Math.floor(b.x);
	const fy = Math.floor(b.y);
	if (!g.livre(cx, cy)) return false;
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const passoX = dx > 0 ? 1 : -1;
	const passoY = dy > 0 ? 1 : -1;
	const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
	const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
	let tMaxX = dx !== 0 ? (dx > 0 ? cx + 1 - a.x : a.x - cx) * tDeltaX : Infinity;
	let tMaxY = dy !== 0 ? (dy > 0 ? cy + 1 - a.y : a.y - cy) * tDeltaY : Infinity;
	let guarda = 0;
	while ((cx !== fx || cy !== fy) && guarda++ < 512) {
		if (Math.abs(tMaxX - tMaxY) < 1e-9) {
			// Passa exatamente pela quina: precisa das duas passagens em L.
			if (!podePassar(g, cx, cy, cx + passoX, cy + passoY)) return false;
			cx += passoX;
			cy += passoY;
			tMaxX += tDeltaX;
			tMaxY += tDeltaY;
		} else if (tMaxX < tMaxY) {
			if (!podePassar(g, cx, cy, cx + passoX, cy)) return false;
			cx += passoX;
			tMaxX += tDeltaX;
		} else {
			if (!podePassar(g, cx, cy, cx, cy + passoY)) return false;
			cy += passoY;
			tMaxY += tDeltaY;
		}
	}
	return true;
}

/** Linha reta com folga de um "corpo" de raio r: confere o meio e as duas bordas. */
export function visadaComCorpo(g: Grade, a: Ponto, b: Ponto, r = 0.2): boolean {
	if (!visada(g, a, b)) return false;
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const len = Math.hypot(dx, dy);
	if (len < 1e-6) return true;
	const nx = (-dy / len) * r;
	const ny = (dx / len) * r;
	return (
		visada(g, { x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny }) &&
		visada(g, { x: a.x - nx, y: a.y - ny }, { x: b.x - nx, y: b.y - ny })
	);
}

/** Tira os pontos do meio sempre que dá para pular direto (puxa-fio guloso). */
export function suavizar(g: Grade, pontos: Ponto[]): Ponto[] {
	if (pontos.length <= 2) return pontos.slice();
	const saida: Ponto[] = [pontos[0]];
	let i = 0;
	while (i < pontos.length - 1) {
		let j = pontos.length - 1;
		while (j > i + 1 && !visadaComCorpo(g, pontos[i], pontos[j])) j--;
		saida.push(pontos[j]);
		i = j;
	}
	return saida;
}

/**
 * Célula livre mais perto de um ponto, procurando em anéis até `raio`.
 * Serve para o clique em cima de um móvel: o avatar vai até o lado dele.
 */
export function livreMaisProxima(g: Grade, p: Ponto, raio = 4): Ponto | null {
	const cx = Math.floor(p.x);
	const cy = Math.floor(p.y);
	let melhor: Ponto | null = null;
	let melhorD = Infinity;
	for (let y = cy - raio; y <= cy + raio; y++) {
		for (let x = cx - raio; x <= cx + raio; x++) {
			if (x < 0 || y < 0 || x >= g.largura || y >= g.altura || !g.livre(x, y)) continue;
			const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
			if (d < melhorD) {
				melhorD = d;
				melhor = { x, y };
			}
		}
	}
	return melhor;
}
