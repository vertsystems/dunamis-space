// Quem cobre quem na tela isométrica.
//
// Ordenar só por x + y falha com móvel grande (o avatar passava "por dentro" da
// mesa de reunião na quina). Aqui a regra é a geométrica: duas caixas que não
// se cruzam têm sempre um eixo que as separa, e quem olha está do lado de x, y
// e z grandes. Então quem tem o x (ou y, ou z) todo menor fica atrás.
//
// Os móveis não se mexem: são ordenados uma vez (ordenação topológica só entre
// pares que se sobrepõem na tela). O avatar é encaixado nessa lista a cada quadro.

import { contornoCaixa, cruzam, retanguloDe, type Caixa, type Retangulo } from './iso';

export type Desenhavel = { caixa: Caixa; tela: Retangulo };

const E = 1e-3;

/** -1: a fica atrás de b; 1: a fica na frente; 0: se cruzam (sem resposta geométrica). */
export function compara(a: Caixa, b: Caixa): -1 | 0 | 1 {
	if (a.x1 <= b.x0 + E) return -1;
	if (b.x1 <= a.x0 + E) return 1;
	if (a.y1 <= b.y0 + E) return -1;
	if (b.y1 <= a.y0 + E) return 1;
	if (a.z1 <= b.z0 + E) return -1;
	if (b.z1 <= a.z0 + E) return 1;
	return 0;
}

/** Profundidade aproximada (o centro da base), para desempate. */
export function chave(c: Caixa): number {
	return (c.x0 + c.x1) / 2 + (c.y0 + c.y1) / 2 + c.z0 * 0.01;
}

function atras(a: Caixa, b: Caixa): boolean {
	const r = compara(a, b);
	return r === 0 ? chave(a) < chave(b) : r < 0;
}

export function telaDaCaixa(c: Caixa): Retangulo {
	return retanguloDe(contornoCaixa(c));
}

/** Ordena do fundo para a frente. */
export function ordenar<T extends Desenhavel>(itens: T[]): T[] {
	const n = itens.length;
	const depois: number[][] = Array.from({ length: n }, () => []);
	const entrada = new Int32Array(n);
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			if (!cruzam(itens[i].tela, itens[j].tela)) continue;
			if (atras(itens[i].caixa, itens[j].caixa)) {
				depois[i].push(j);
				entrada[j]++;
			} else {
				depois[j].push(i);
				entrada[i]++;
			}
		}
	}
	// Kahn, sempre pegando o mais ao fundo entre os liberados (desenho estável).
	const chaves = itens.map((it) => chave(it.caixa));
	const pronto = new Uint8Array(n);
	const saida: T[] = [];
	const livres: number[] = [];
	for (let i = 0; i < n; i++) if (entrada[i] === 0) livres.push(i);
	while (saida.length < n) {
		let escolhido = -1;
		if (livres.length) {
			let k = 0;
			for (let i = 1; i < livres.length; i++) if (chaves[livres[i]] < chaves[livres[k]]) k = i;
			escolhido = livres.splice(k, 1)[0];
		} else {
			// Ciclo (raro, com caixas que se cruzam): sai o mais ao fundo que sobrou.
			for (let i = 0; i < n; i++) if (!pronto[i] && (escolhido < 0 || chaves[i] < chaves[escolhido])) escolhido = i;
		}
		pronto[escolhido] = 1;
		saida.push(itens[escolhido]);
		for (const j of depois[escolhido]) {
			if (pronto[j]) continue;
			entrada[j]--;
			if (entrada[j] === 0) livres.push(j);
		}
	}
	return saida;
}

/**
 * Onde encaixar uma caixa que se mexe numa lista já ordenada: logo depois do
 * último item que fica atrás dela e que se sobrepõe a ela na tela.
 */
export function posicaoDinamica(ordenados: Desenhavel[], movel: Desenhavel): number {
	let ultimoAtras = -1;
	for (let i = 0; i < ordenados.length; i++) {
		const it = ordenados[i];
		if (!cruzam(it.tela, movel.tela)) continue;
		if (atras(it.caixa, movel.caixa)) ultimoAtras = i;
	}
	return ultimoAtras + 1;
}
