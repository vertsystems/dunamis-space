// Peças novas da CABEÇA do boneco do DGathe (pintor da cabeça).
//
// Pedido do Bruno (10/11/2026): personagens prontos, com bastante variedade
// (reais, sobrenaturais, heróis). Aqui ficam os cabelos novos, as barbas e
// bigodes, os chapéus e enfeites, os óculos novos, as expressões e os rostos e
// cabeças de fantasia. Na segunda rodada (mesmo dia, refs. 18 a 55) entraram
// mais cabelos, chapéus e óculos, a máscara inteira e as cabeças dos bichos de
// roupa (urso, panda, guaxinim, tigre, gato, cachorro, dálmata, lobo, macaco e
// coelho). A lista exata (id, como é, quem usa) está em docs/dgathe/personagens.md.
//
// Como funciona: avatar.ts chama cada função abaixo no ponto certo da ordem de
// desenho, já com o contexto no lugar (pés na origem, espelhado quando anda
// para a esquerda, a cabeça já erguida pelo porte). As peças ORIGINAIS
// (cabelos curto, social, raspado, cacheado, black, chanel, longo, rabo,
// coque, careca; óculos grau, grosso, sol; o rosto 'sorriso') continuam em
// avatar.ts: aqui só entra o que é novo. Função que não desenha nada deixa o
// boneco como estava.
//
// Regras: importar só de avatar-base.ts (nunca de avatar.ts); cada função
// deixa o contexto como encontrou (save/restore); contorno com forma() e
// sombra chapada à direita com sombraDireita(); cabeça centrada em (0, CY),
// raio R.
//
// O boneco tem ~54 px: cada peça foi pensada para ler nesse tamanho (poucas
// formas, bem contornadas) e para não esconder o rosto: franja, aba e máscara
// param acima das sobrancelhas (y ≈ -44,6 dele, -45,7 dela) ou abaixo dos
// olhos (y ≈ -38,3). O rosto olha um pouco para a direita (3/4): o meio dele
// fica em x ≈ +0,5.

import {
	CONTORNO,
	CY,
	DOURADO,
	LW,
	OLHOS,
	R,
	SOMBRA,
	brilho,
	caixa,
	extraOu,
	forma,
	luzDe,
	oval,
	ponto,
	temDetalhe,
	tom,
	traco,
	type C,
	type Quadro
} from './avatar-base';

const PI2 = Math.PI * 2;
/** Bola de cacho: [x, y, raio] ou elipse [x, y, rx, ry]. */
type Bola = readonly number[];

// ================================================================== ajudantes

/** Várias curvas seguidas: (cx, cy, x, y) repetido. */
function curvas(ctx: C, n: readonly number[]) {
	for (let i = 0; i + 3 < n.length; i += 4) ctx.quadraticCurveTo(n[i], n[i + 1], n[i + 2], n[i + 3]);
}

/**
 * Preenche, desenha o miolo (`dentro`, recortado na forma: sombra, faixa,
 * vinco) e só depois passa o contorno, para o contorno ficar inteiro por cima.
 */
function pintar(ctx: C, f: () => void, cor: string, dentro?: () => void, lw = LW, regra: CanvasFillRule = 'nonzero') {
	ctx.beginPath();
	f();
	ctx.fillStyle = cor;
	ctx.fill(regra);
	if (dentro) {
		ctx.save();
		ctx.beginPath();
		f();
		ctx.clip(regra);
		dentro();
		ctx.restore();
	}
	if (lw > 0) {
		ctx.beginPath();
		f();
		contornar(ctx, lw);
	}
}

function contornar(ctx: C, lw = LW, cor = CONTORNO) {
	ctx.strokeStyle = cor;
	ctx.lineWidth = lw;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.stroke();
}

/** Sombra chapada do lado direito, dentro de um recorte já feito. */
function sombra(ctx: C, xDe: number, cor: string = SOMBRA) {
	ctx.fillStyle = cor;
	ctx.fillRect(xDe, -80, 40, 100);
}

/** Cor do risco sobre o cabelo (mecha, trança, textura): clara no cabelo escuro, escura no claro. */
const risco = (cor: string) => (luzDe(cor) < 70 ? tom(cor, 1.42) : tom(cor, 0.7));

/** Curva solta, sem contorno: [x0, y0, cx, cy, x1, y1, ...]. */
function linha(ctx: C, p: readonly number[], cor: string, lw = 0.6) {
	ctx.beginPath();
	ctx.moveTo(p[0], p[1]);
	for (let i = 2; i + 3 < p.length; i += 4) ctx.quadraticCurveTo(p[i], p[i + 1], p[i + 2], p[i + 3]);
	contornar(ctx, lw, cor);
}

/** Cápsula de (x0, y0) a (x1, y1): dread, trança, fita. */
const capsula = (ctx: C, x0: number, y0: number, x1: number, y1: number, w: number) => () => {
	const a = Math.atan2(y1 - y0, x1 - x0);
	const r = w / 2;
	ctx.arc(x0, y0, r, a + Math.PI / 2, a - Math.PI / 2);
	ctx.arc(x1, y1, r, a - Math.PI / 2, a + Math.PI / 2);
	ctx.closePath();
};

/** As bolas (e elipses) como um só caminho. */
const bolas = (ctx: C, lista: readonly Bola[]) => () => {
	for (const b of lista) {
		if (b.length > 3) {
			ctx.moveTo(b[0] + b[2], b[1]);
			ctx.ellipse(b[0], b[1], b[2], b[3], 0, 0, PI2);
		} else {
			ctx.moveTo(b[0] + b[2], b[1]);
			ctx.arc(b[0], b[1], b[2], 0, PI2);
		}
	}
};

/**
 * Nuvem de cachos: várias bolas que viram uma silhueta só (o contorno grosso
 * vai primeiro e o preenchimento cobre a metade de dentro, então só sobra o
 * contorno de fora), com sombra à direita e uma meia-lua de risco em alguns
 * cachos.
 */
function nuvem(ctx: C, lista: readonly Bola[], cor: string, xSombra: number, cachosCada = 0) {
	const f = bolas(ctx, lista);
	ctx.beginPath();
	f();
	contornar(ctx, LW * 2);
	ctx.beginPath();
	f();
	ctx.fillStyle = cor;
	ctx.fill();
	ctx.save();
	ctx.beginPath();
	f();
	ctx.clip();
	sombra(ctx, xSombra);
	ctx.restore();
	if (!cachosCada) return;
	ctx.beginPath();
	for (let i = 0; i < lista.length; i += cachosCada) {
		const b = lista[i];
		if (b.length > 3) continue;
		const r = b[2] * 0.52;
		const x = b[0] + 0.3;
		const y = b[1] + 0.2;
		ctx.moveTo(x + r * Math.cos(0.15 * Math.PI), y + r * Math.sin(0.15 * Math.PI));
		ctx.arc(x, y, r, 0.15 * Math.PI, 0.9 * Math.PI);
	}
	contornar(ctx, 0.55, risco(cor));
}

/** Bolas em volta de uma elipse (para nuvens de cachos), calculadas uma vez. */
function anel(cx: number, cy: number, rx: number, ry: number, n: number, r0: number, r1: number): Bola[] {
	const lista: Bola[] = [];
	for (let i = 0; i < n; i++) {
		const a = (i / n) * PI2 - Math.PI / 2;
		lista.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a), i % 2 ? r1 : r0]);
	}
	lista.push([cx, cy, rx, ry]);
	return lista;
}

/**
 * Borda crespa: da elipse no ângulo a0 até a1, em n gomos que saem h px para
 * fora. Continua o caminho atual (chame moveTo antes).
 */
function bordaCrespa(ctx: C, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, h: number) {
	for (let i = 1; i <= n; i++) {
		const a = a0 + ((a1 - a0) * i) / n;
		const am = a0 + ((a1 - a0) * (i - 0.5)) / n;
		ctx.quadraticCurveTo(cx + (rx + 2 * h) * Math.cos(am), cy + (ry + 2 * h) * Math.sin(am), cx + rx * Math.cos(a), cy + ry * Math.sin(a));
	}
}

/** Mecha comprida e ondulada (cai na frente do ombro), afinando na ponta. */
const mechaOndulada = (ctx: C, x: number, y0: number, y1: number, larg: number, amp: number, ondas: number, fase: number) => () => {
	const n = 12;
	const borda = (i: number, lado: number) => {
		const t = i / n;
		const cx = x + amp * Math.sin(fase + ondas * PI2 * t);
		const w = (larg / 2) * (1 - 0.45 * t * t);
		return [cx + lado * w, y0 + (y1 - y0) * t] as const;
	};
	const [ex, ey] = borda(0, -1);
	ctx.moveTo(ex, ey);
	for (let i = 1; i <= n; i++) {
		const [px, py] = borda(i, -1);
		ctx.lineTo(px, py);
	}
	const ponta = x + amp * Math.sin(fase + ondas * PI2);
	const [dx, dy] = borda(n, 1);
	ctx.quadraticCurveTo(ponta, y1 + larg * 0.6, dx, dy);
	for (let i = n - 1; i >= 0; i--) {
		const [px, py] = borda(i, 1);
		ctx.lineTo(px, py);
	}
	ctx.closePath();
};

/**
 * Chapéus que cobrem o alto da cabeça: o cabelo novo não sobe acima deles e
 * a orelha em pé de bicho sai pelos lados (o guaxinim de gorro, ref. 30).
 */
const COBREM = new Set(['fedora', 'cartola', 'bone', 'gorro', 'boina', 'capuz', 'chapeuMago', 'abaLarga', 'chapeuPalha', 'lencoCabeca', 'chapeuFlor']);
const coberto = (q: Quadro) => COBREM.has(q.a.chapeu);

/** De costas, o cabelo cobre a cabeça (como nos cabelos originais). */
function cobrir(ctx: C, cor: string) {
	pintar(ctx, oval(ctx, 0, -41.4, 10.1, 10.4), cor, () => sombra(ctx, 5.4));
	brilho(ctx, cor, -49.8);
}

/** Calota lisa de frente (o alto da cabeça), da têmpora esquerda à direita. */
function calota(ctx: C, yEsq = -39.4, yDir = -40.4, topo = -52.8) {
	ctx.moveTo(-10.1, yEsq);
	curvas(ctx, [-11, topo + 0.2, 0.2, topo, 11, topo + 0.2, 10.3, yDir]);
}

// ================================================================== cabelos

type Desenho = (ctx: C, q: Quadro, cor: string) => void;
type Penteado = { atras?: Desenho; frente?: Desenho; costas?: Desenho };

// --- topete (ref. 1): laterais curtas e topete alto penteado para trás

const topete: Penteado = {
	frente(ctx, q, cor) {
		// Laterais e alto curtos, rentes à cabeça
		const f = () => {
			ctx.moveTo(-10.1, -39.2);
			curvas(ctx, [-10.9, -51.2, -3.6, -52.2]);
			ctx.lineTo(4.0, -52.2);
			curvas(ctx, [10.9, -51.2, 10.1, -40.4]);
			ctx.lineTo(9.0, -41.6);
			curvas(ctx, [8.6, -45.6, 5.4, -46.4, 0.6, -47.4, -4.6, -46.4, -8.4, -45.6, -9.0, -41.2]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.2));
		if (coberto(q)) return brilho(ctx, cor, -51.8);
		// O topete: um volume próprio que sobe da testa e vira para trás
		const t = () => {
			ctx.moveTo(-7.8, -46.2);
			curvas(ctx, [-9.4, -52.4, -4.6, -55.8, 0.4, -58.0, 6.2, -57.2, 9.0, -55.4, 8.6, -52.0, 8.2, -49.6, 6.2, -47.0, 0.0, -48.6, -7.8, -46.2]);
			ctx.closePath();
		};
		pintar(ctx, t, cor, () => sombra(ctx, 4.6));
		linha(ctx, [-5.4, -48.4, -3.4, -53.6, 2.6, -55.6], risco(cor));
		linha(ctx, [-1.0, -48.4, 2.0, -52.6, 7.4, -53.0], risco(cor));
		brilho(ctx, cor, -56.6, -2.0, 6.4);
	},
	costas(ctx, q, cor) {
		if (coberto(q)) return cobrir(ctx, cor);
		nuvem(ctx, [[0, -41.4, 10.1, 10.4], [0.4, -52.8, 7.0, 4.4]], cor, 5.4);
		linha(ctx, [-4.4, -54.4, -2.0, -52.4, 3.0, -55.6], risco(cor));
		brilho(ctx, cor, -56.6, -1.6, 6);
	}
};

// --- penteado para trás (ref. 5): liso, sem franja, mecha solta; no vampiro, bico na testa

function mechaSolta(ctx: C, cor: string) {
	forma(
		ctx,
		() => {
			ctx.moveTo(-0.8, -52.4);
			curvas(ctx, [2.8, -56.8, 6.8, -55.0, 3.6, -55.0, 1.4, -52.2]);
			ctx.closePath();
		},
		cor,
		0.7
	);
}

const penteadoTras: Penteado = {
	frente(ctx, q, cor) {
		// Bico de viúva só no vampiro (quem tem caninos)
		const bico = temDetalhe(q, 'caninos');
		const f = () => {
			ctx.moveTo(-10.0, -39.6);
			curvas(ctx, [-10.9, -52.6, 0.4, -52.9, 10.9, -52.6, 10.1, -40.6]);
			ctx.lineTo(9.2, -42.0);
			curvas(ctx, [8.4, -46.8, 4.6, -47.6]);
			if (bico) curvas(ctx, [2.4, -48.0, 0.9, -44.8, -0.4, -48.0, -2.8, -47.8]);
			else curvas(ctx, [0.8, -48.4, -2.8, -47.8]);
			curvas(ctx, [-8.0, -47.0, -9.0, -41.6]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5));
		const r = risco(cor);
		linha(ctx, [-5.6, -47.4, -5.8, -50.6, -3.2, -52.2], r);
		linha(ctx, [-0.8, -48.0, -0.2, -50.8, 1.4, -52.4], r);
		linha(ctx, [5.0, -47.2, 6.0, -50.0, 6.4, -51.4], r);
		if (!coberto(q)) mechaSolta(ctx, cor);
		brilho(ctx, cor, -52.0, -3, 6);
	},
	costas(ctx, q, cor) {
		cobrir(ctx, cor);
		// Penteado para trás: os sulcos descem e se juntam na nuca
		const r = risco(cor);
		linha(ctx, [-5.8, -48.8, -3.6, -41.0, -1.4, -33.6], r);
		linha(ctx, [5.8, -48.8, 3.6, -41.0, 1.4, -33.6], r);
		if (!coberto(q)) mechaSolta(ctx, cor);
	}
};

// --- arrepiado (ref. 6): curto e bagunçado, tufos nas laterais (bom sob o chapéu)

function contornoArrepiado(ctx: C, alto: boolean) {
	curvas(ctx, [-10.8, -40.0, -12.6, -41.2, -10.4, -43.0, -12.9, -45.4]);
	if (alto)
		curvas(ctx, [-10.0, -47.2, -11.2, -50.8, -7.6, -49.6, -7.6, -54.4, -4.6, -51.2, -2.8, -55.8, -0.4, -51.8, 2.0, -56.0, 3.8, -51.8, 6.6, -54.8, 7.4, -50.2, 10.9, -51.6, 9.8, -47.8, 12.9, -46.4]);
	else curvas(ctx, [-10.4, -47.6, -10.2, -48.4, -9.6, -52.6, 0.4, -52.8, 9.8, -52.6, 10.6, -48.6, 10.8, -47.6, 12.9, -46.4]);
	curvas(ctx, [10.4, -44.2, 12.7, -41.8, 10.4, -41.0, 10.2, -39.4]);
}

const arrepiado: Penteado = {
	frente(ctx, q, cor) {
		const alto = !coberto(q);
		const f = () => {
			ctx.moveTo(-9.9, -38.0);
			contornoArrepiado(ctx, alto);
			ctx.lineTo(9.1, -41.4);
			curvas(ctx, [8.0, -46.4, 6.4, -43.8, 4.6, -47.8, 2.8, -44.6, 1.0, -47.8, -0.8, -44.6, -2.8, -48.0, -4.8, -44.2, -6.6, -47.6, -8.4, -43.4]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5));
		if (alto) brilho(ctx, cor, -52.2, -2, 6.4);
	},
	costas(ctx, q, cor) {
		const f = () => {
			ctx.moveTo(-9.9, -37.0);
			contornoArrepiado(ctx, !coberto(q));
			curvas(ctx, [10.4, -32.2, 5.6, -30.8, 0.2, -29.6, -5.4, -30.8, -10.4, -32.2, -9.9, -37.0]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		brilho(ctx, cor, -50.4);
	}
};

// --- espetado (ref. 12): pontas para cima em zigue-zague, cartoon

function contornoEspetado(ctx: C, alto: boolean) {
	curvas(ctx, [-10.6, -42.4, -12.8, -43.8, -10.2, -46.4]);
	if (alto)
		curvas(ctx, [
			-12.0, -51.0, -8.0, -50.0, -7.8, -55.8, -4.4, -51.8, -2.4, -57.2, 0.6, -52.4, 3.2, -57.0, 5.4, -51.8, 8.2, -55.2, 8.8, -49.8, 12.2, -51.0, 10.4, -46.0
		]);
	else curvas(ctx, [-10.4, -48.4, -9.8, -52.6, 0.4, -52.8, 9.8, -52.6, 10.6, -48.6, 10.4, -46.0]);
	curvas(ctx, [12.9, -43.2, 10.6, -42.4, 10.2, -40.2]);
}

const espetado: Penteado = {
	frente(ctx, q, cor) {
		if (q.a.chapeu === 'capuz') {
			// Sob o capuz, só a franja espetada aparece na abertura
			pintar(ctx, () => {
				ctx.moveTo(-8.4, -49.8);
				ctx.lineTo(8.8, -50.0);
				ctx.lineTo(8.6, -46.6);
				curvas(ctx, [7.6, -48.8, 6.0, -44.8, 4.4, -48.8, 2.6, -45.0, 1.0, -48.8, -0.8, -44.8, -2.6, -48.8, -4.4, -45.2, -6.0, -48.6, -7.6, -45.6]);
				ctx.closePath();
			}, cor, () => sombra(ctx, 4.8));
			return;
		}
		const f = () => {
			ctx.moveTo(-10.0, -38.6);
			contornoEspetado(ctx, !coberto(q));
			ctx.lineTo(9.4, -41.4);
			curvas(ctx, [8.4, -46.6, 6.8, -43.0, 5.2, -48.0, 3.2, -44.4, 1.6, -48.2, -0.2, -44.2, -2.4, -48.2, -4.4, -44.8, -6.4, -47.8, -8.2, -43.2]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5));
		if (!coberto(q)) {
			linha(ctx, [-4.6, -49.4, -3.6, -52.6, -2.6, -55.0], risco(cor), 0.55);
			linha(ctx, [2.2, -49.6, 2.8, -52.8, 3.0, -55.0], risco(cor), 0.55);
		}
	},
	costas(ctx, q, cor) {
		if (q.a.chapeu === 'capuz') return;
		const f = () => {
			ctx.moveTo(-10.0, -37.0);
			contornoEspetado(ctx, !coberto(q));
			curvas(ctx, [10.6, -32.2, 5.6, -30.8, 0.2, -29.6, -5.4, -30.8, -10.6, -32.2, -10.0, -37.0]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
	}
};

// --- moicano: laterais raspadas e uma crista alta no meio

function raspado(ctx: C, cor: string, costas: boolean, alfa = 0.3, soNaCabeca = false) {
	ctx.save();
	ctx.beginPath();
	// soNaCabeca: de costas, recorta na cabeça (sem passar do contorno dela)
	if (costas && !soNaCabeca) oval(ctx, 0, -41.4, 10.1, 10.4)();
	else if (costas) oval(ctx, 0, CY, R - 0.3, R - 0.3)();
	else oval(ctx, 0, CY, R, R)();
	ctx.clip();
	ctx.globalAlpha = alfa;
	ctx.beginPath();
	if (costas) ctx.rect(-12, -55, 24, 26);
	else {
		ctx.moveTo(-10, -39);
		curvas(ctx, [-10.4, -52.4, 0, -52.4, 10.4, -52.4, 10, -40, 8.6, -45.6, 4, -46.6, 0.4, -47.4, -4, -46.6, -8.6, -45.6, -10, -39]);
	}
	ctx.fillStyle = cor;
	ctx.fill();
	ctx.restore();
}

/** A crista: da testa (base) até as pontas no alto; de costas desce até a nuca. */
function crista(ctx: C, cor: string, c: number, base: number, costas: boolean) {
	const f = () => {
		ctx.moveTo(c - 2.2, base);
		ctx.lineTo(c - 2.9, -50.6);
		ctx.lineTo(c - 4.8, -53.0);
		ctx.lineTo(c - 2.6, -53.2);
		ctx.lineTo(c - 3.5, -56.4);
		ctx.lineTo(c - 1.2, -55.0);
		ctx.lineTo(c, -58.6);
		ctx.lineTo(c + 1.2, -55.0);
		ctx.lineTo(c + 3.5, -56.4);
		ctx.lineTo(c + 2.6, -53.2);
		ctx.lineTo(c + 4.8, -53.0);
		ctx.lineTo(c + 2.9, -50.6);
		ctx.lineTo(c + 2.2, base);
		if (costas) ctx.quadraticCurveTo(c, base + 2, c - 2.2, base);
		else ctx.quadraticCurveTo(c, base + 0.6, c - 2.2, base);
		ctx.closePath();
	};
	pintar(ctx, f, cor, () => sombra(ctx, c + 0.7));
	traco(ctx, c - 1.4, base - 1.6, c - 1.9, -52.2, tom(cor, 1.45), 0.7);
}

const moicano: Penteado = {
	frente(ctx, q, cor) {
		raspado(ctx, cor, false);
		if (!coberto(q)) crista(ctx, cor, 0.7, -46.6, false);
	},
	costas(ctx, q, cor) {
		raspado(ctx, cor, true);
		if (!coberto(q)) crista(ctx, cor, 0, -33.4, true);
	}
};

// --- calvo com laterais: careca em cima, cabelo só dos lados e na nuca

function brilhoDaCareca(ctx: C, x = -3, y = -47.4) {
	ctx.globalAlpha = 0.32;
	ponto(ctx, x, y, 1.6, '#ffffff');
	ctx.globalAlpha = 0.55;
	ponto(ctx, x + 2.1, y - 1.5, 0.55, '#ffffff');
	ctx.globalAlpha = 1;
}

const calvoLados: Penteado = {
	frente(ctx, _q, cor) {
		for (const s of [-1, 1]) {
			const f = () => {
				ctx.moveTo(s * 8.4, -47.4);
				curvas(ctx, [s * 11.9, -47.0, s * 11.8, -43.8, s * 11.6, -41.4, s * 10.0, -41.2]);
				ctx.lineTo(s * 9.4, -37.8);
				curvas(ctx, [s * 8.6, -38.6, s * 8.5, -41.4, s * 8.0, -44.6, s * 8.4, -47.4]);
				ctx.closePath();
			};
			pintar(ctx, f, cor, s > 0 ? () => sombra(ctx, 9.9) : undefined);
			linha(ctx, [s * 9.4, -46.0, s * 10.8, -45.0, s * 10.6, -42.6], risco(cor), 0.5);
		}
		brilhoDaCareca(ctx);
	},
	costas(ctx, _q, cor) {
		// Ferradura na nuca: de orelha a orelha, por trás
		const a = Math.asin(3 / 10.4);
		const f = () => {
			ctx.moveTo(-10.1 * Math.cos(a), -44.4);
			ctx.quadraticCurveTo(0, -41.6, 10.1 * Math.cos(a), -44.4);
			ctx.ellipse(0, -41.4, 10.1, 10.4, 0, -a, Math.PI + a);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		brilhoDaCareca(ctx, -2, -47.8);
	}
};

// --- crespo curto: rente, contorno em gomos, textura de pontinhos

const PONTOS_CRESPO: readonly (readonly [number, number])[] = [
	[-6.6, -49.4],
	[-2.4, -51.0],
	[2.0, -51.0],
	[6.2, -49.4],
	[-8.8, -45.2],
	[9.0, -45.6],
	[-4.2, -48.6],
	[4.2, -48.8]
];

function pontinhos(ctx: C, cor: string, lista: readonly (readonly [number, number])[]) {
	const c = luzDe(cor) < 70 ? tom(cor, 1.3) : tom(cor, 0.78);
	for (const [x, y] of lista) ponto(ctx, x, y, 0.42, c);
}

const afroCurto: Penteado = {
	frente(ctx, _q, cor) {
		const a0 = Math.PI - 0.27;
		const a1 = PI2 + 0.13;
		const f = () => {
			ctx.moveTo(0.2 + 10.5 * Math.cos(a0), -41.6 + 10.8 * Math.sin(a0));
			bordaCrespa(ctx, 0.2, -41.6, 10.5, 10.8, a0, a1, 9, 0.7);
			ctx.lineTo(9.4, -42.6);
			curvas(ctx, [8.8, -46.6, 4.4, -47.2, 0.6, -48.0, -3.6, -47.2, -8.2, -46.6, -9.0, -42.4]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.2));
		pontinhos(ctx, cor, PONTOS_CRESPO);
	},
	costas(ctx, _q, cor) {
		const f = () => {
			ctx.moveTo(10.4, -41.6);
			bordaCrespa(ctx, 0, -41.6, 10.4, 10.4, 0, PI2, 14, 0.65);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		pontinhos(ctx, cor, PONTOS_CRESPO);
		pontinhos(ctx, cor, [
			[-5.4, -41.0],
			[1.0, -42.4],
			[6.2, -38.8],
			[-1.6, -35.6]
		]);
	}
};

// --- dreads: grossos até o ombro, pontas arredondadas

function dread(ctx: C, x0: number, y0: number, x1: number, y1: number, cor: string, w = 2.8) {
	pintar(ctx, capsula(ctx, x0, y0, x1, y1, w), cor, undefined, 0.85);
	// Gomos ao longo do dread
	const dx = x1 - x0;
	const dy = y1 - y0;
	const n = Math.hypot(dx, dy);
	const nx = -dy / n;
	const ny = dx / n;
	const c = risco(cor);
	for (const t of [0.4, 0.62, 0.84]) {
		const px = x0 + dx * t;
		const py = y0 + dy * t;
		traco(ctx, px - nx * w * 0.36, py - ny * w * 0.36, px + nx * w * 0.36, py + ny * w * 0.36, c, 0.5);
	}
}

const DREADS_ATRAS: readonly (readonly [number, number, number, number])[] = [
	[-3.2, -49, -7.8, -28.4],
	[3.4, -49, 8.2, -28.4],
	[-6.6, -47, -11.4, -29.2],
	[6.8, -47, 11.8, -29.4],
	[-9.0, -45, -13.2, -31.4],
	[9.2, -45, 13.4, -31.6]
];
const DREADS_FRENTE: readonly (readonly [number, number, number, number])[] = [
	[-11.0, -43.4, -13.2, -33.6],
	[11.2, -43.6, 13.4, -33.8],
	[-9.6, -44.8, -11.2, -31.0],
	[9.8, -45.0, 11.4, -31.2]
];

const dreads: Penteado = {
	atras(ctx, _q, cor) {
		const c = tom(cor, 0.86);
		for (const [a, b, d, e] of DREADS_ATRAS) dread(ctx, a, b, d, e, c);
	},
	frente(ctx, q, cor) {
		for (const [a, b, d, e] of DREADS_FRENTE) dread(ctx, a, b, d, e, cor, 2.7);
		const a0 = Math.PI - 0.2;
		const a1 = PI2 + 0.06;
		const f = () => {
			ctx.moveTo(0.2 + 10.4 * Math.cos(a0), -41.6 + 10.8 * Math.sin(a0));
			bordaCrespa(ctx, 0.2, -41.6, 10.4, 10.8, a0, a1, 8, 0.5);
			ctx.lineTo(9.6, -42.8);
			curvas(ctx, [8.8, -46.8, 4.6, -47.4, 0.6, -48.2, -3.6, -47.4, -8.4, -46.8, -9.2, -43.0]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.2));
		if (!coberto(q)) {
			const r = risco(cor);
			for (const x of [-5.6, -1.6, 2.6, 6.4]) linha(ctx, [x, -47.6, x - 0.2, -50.0, x + 0.6, -52.0], r, 0.5);
		}
	},
	costas(ctx, q, cor) {
		cobrir(ctx, cor);
		const c = tom(cor, 0.94);
		for (const [a, b, d, e] of [
			[-9.6, -43, -13.0, -30.0],
			[9.6, -43, 13.0, -30.0]
		] as const)
			dread(ctx, a, b, d, e, c);
		const topo = coberto(q) ? -46 : -48;
		for (const x of [-7.4, -4.4, -1.4, 1.6, 4.6, 7.4]) dread(ctx, x, topo + Math.abs(x) * 0.25, x * 1.32, -27.2 + Math.abs(x) * 0.18, cor);
	}
};

// --- tranças: finas e longas até o meio das costas, repartidas ao meio

function tranca(ctx: C, x0: number, y0: number, x1: number, y1: number, cor: string, conta: boolean, w = 1.9) {
	pintar(ctx, capsula(ctx, x0, y0, x1, y1, w), cor, undefined, 0.75);
	const dx = x1 - x0;
	const dy = y1 - y0;
	const n = Math.hypot(dx, dy);
	const ux = dx / n;
	const uy = dy / n;
	const c = risco(cor);
	ctx.beginPath();
	for (let s = 1.6; s < n - 0.8; s += 1.7) {
		const px = x0 + ux * s;
		const py = y0 + uy * s;
		ctx.moveTo(px - uy * w * 0.4, py + ux * w * 0.4);
		ctx.lineTo(px + ux * 0.7, py + uy * 0.7);
		ctx.lineTo(px + uy * w * 0.4, py - ux * w * 0.4);
	}
	contornar(ctx, 0.42, c);
	if (conta) forma(ctx, oval(ctx, x1 + ux * 0.9, y1 + uy * 0.9, 0.85, 0.95), DOURADO, 0.5);
}

const TRANCAS_ATRAS: readonly (readonly [number, number, number, number])[] = [
	[-5.6, -48, -9.4, -22.0],
	[5.8, -48, 9.6, -22.0],
	[-7.6, -46, -11.6, -21.6],
	[7.8, -46, 11.8, -21.6],
	[-9.6, -44, -13.2, -23.4],
	[9.8, -44, 13.4, -23.4]
];
const TRANCAS_FRENTE: readonly (readonly [number, number, number, number])[] = [
	[-11.0, -43.4, -12.6, -28.6],
	[11.2, -43.4, 12.8, -28.8],
	[-9.6, -44.6, -10.8, -27.0],
	[9.8, -44.6, 11.0, -27.2]
];

const trancas: Penteado = {
	atras(ctx, _q, cor) {
		const c = tom(cor, 0.86);
		for (const [a, b, d, e] of TRANCAS_ATRAS) tranca(ctx, a, b, d, e, c, false);
	},
	frente(ctx, q, cor) {
		for (const [a, b, d, e] of TRANCAS_FRENTE) tranca(ctx, a, b, d, e, cor, true);
		const f = () => {
			calota(ctx, -39.4, -40.4);
			ctx.lineTo(9.2, -42.4);
			curvas(ctx, [8.6, -46.4, 4.6, -47.2, 0.6, -47.8, -3.6, -47.2, -8.4, -46.4, -9.0, -42.2]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.2));
		const r = risco(cor);
		for (const s of [-1, 1]) {
			linha(ctx, [0.5 + s * 0.6, -51.6, 0.5 + s * 4.6, -51.0, 0.5 + s * 8.0, -47.6], r, 0.5);
			linha(ctx, [0.5 + s * 0.6, -49.4, 0.5 + s * 3.8, -49.0, 0.5 + s * 6.0, -47.0], r, 0.5);
		}
		// Risca do meio: aparece o couro cabeludo
		if (!coberto(q)) traco(ctx, 0.5, -52.6, 0.5, -48.0, q.pele, 0.7);
	},
	costas(ctx, q, cor) {
		cobrir(ctx, cor);
		traco(ctx, 0, -51.4, 0, -33.2, q.pele, 0.7);
		for (const x of [-8.2, -5.8, -3.4, -1.1, 1.1, 3.4, 5.8, 8.2]) tranca(ctx, x, -40 + Math.abs(x) * 0.3, x * 1.32, -21.4 + Math.abs(x) * 0.12, cor, false);
	}
};

// --- longo ondulado (ref. 2): abaixo do ombro, ondas em S, repartido de lado

const massaOndulada = (ctx: C) => () => {
	ctx.moveTo(-10.6, -46);
	curvas(ctx, [
		-12.6, -41.0, -11.2, -36.6, -9.8, -32.4, -12.2, -28.6, -13.8, -25.4, -11.6, -22.8, -9.0, -21.4, -6.6, -23.0, -3.4, -21.4, 0, -22.8, 3.4,
		-21.4, 6.6, -23.0, 9.0, -21.4, 11.6, -22.8, 13.8, -25.4, 12.2, -28.6, 9.8, -32.4, 11.2, -36.6, 12.6, -41.0, 10.6, -46, 10.4, -53.4, 0, -53.4,
		-10.4, -53.4, -10.6, -46
	]);
	ctx.closePath();
};

const ondulado: Penteado = {
	atras(ctx, _q, cor) {
		pintar(ctx, massaOndulada(ctx), cor, () => sombra(ctx, 4.6));
		const r = risco(cor);
		linha(ctx, [-11.6, -33.6, -10.0, -29.4, -11.6, -25.0], r);
		linha(ctx, [11.6, -33.6, 10.0, -29.4, 11.6, -25.0], r);
	},
	frente(ctx, _q, cor) {
		// Mechas da frente primeiro: saem de baixo da calota
		pintar(ctx, mechaOndulada(ctx, -10.6, -45.4, -25.0, 3.8, 0.85, 1.3, 0), cor, () => sombra(ctx, -9.8));
		pintar(ctx, mechaOndulada(ctx, 10.8, -45.0, -25.6, 3.6, 0.85, 1.3, Math.PI), cor, () => sombra(ctx, 11.4));
		const f = () => {
			ctx.moveTo(-10.2, -38.6);
			curvas(ctx, [-11.2, -52.8, -0.6, -53.2, 10.8, -52.8, 10.4, -40.6, 8.6, -45.0, 4.4, -46.8, 0.2, -48.2, -3.4, -48.2, -8.4, -47.0, -10.2, -38.6]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		const r = risco(cor);
		linha(ctx, [-2.8, -51.6, 2.8, -49.8, 8.6, -44.6], r);
		linha(ctx, [-3.8, -50.8, -7.0, -49.4, -9.0, -44.4], r);
		brilho(ctx, cor, -52.4, -3, 6.2);
	},
	costas(ctx, _q, cor) {
		pintar(ctx, massaOndulada(ctx), cor, () => sombra(ctx, 5));
		const r = risco(cor);
		linha(ctx, [-6.0, -44.0, -7.8, -36.0, -5.6, -29.6, -3.6, -24.6, -5.6, -22.4], r);
		linha(ctx, [0.2, -46.0, -1.4, -37.4, 0.6, -30.6, 2.4, -25.6, 0.4, -22.8], r);
		linha(ctx, [6.2, -44.0, 4.6, -36.0, 6.8, -29.6, 8.6, -24.8, 6.8, -22.4], r);
		brilho(ctx, cor, -52.2);
	}
};

// --- cachos volumosos (ref. 7): nuvem de cachos grandes em volta do rosto até o ombro

const CACHOS_ATRAS = anel(0.2, -42.4, 11.4, 11.0, 16, 3.9, 3.4);
const CACHOS_COSTAS = anel(0, -42.0, 11.2, 10.8, 16, 3.9, 3.4);
const CACHOS_FRENTE: readonly Bola[] = [
	[0.2, -50.0, 8.6, 3.6],
	[-9.0, -44.6, 3.0],
	[-6.4, -48.4, 3.3],
	[-2.6, -50.4, 3.3],
	[1.6, -50.8, 3.3],
	[5.6, -49.2, 3.3],
	[8.8, -45.6, 3.0],
	[-10.6, -40.2, 2.7],
	[-11.0, -35.6, 2.6],
	[10.9, -40.8, 2.7],
	[11.3, -36.2, 2.6]
];

const cachosVolumosos: Penteado = {
	atras: (ctx, _q, cor) => nuvem(ctx, CACHOS_ATRAS, cor, 5.6, 2),
	frente(ctx, _q, cor) {
		nuvem(ctx, CACHOS_FRENTE, cor, 5.2, 1);
		brilho(ctx, cor, -53.2, -2.6, 5.6);
	},
	costas(ctx, _q, cor) {
		nuvem(ctx, CACHOS_COSTAS, cor, 5.4, 1);
		brilho(ctx, cor, -53.4, -1.6, 6);
	}
};

// --- chanel cacheado (ref. 3): na altura do queixo, cacheado e cheio dos lados

const CHANEL_ATRAS = anel(0.2, -42.8, 11.6, 9.2, 14, 3.5, 3.1);
const CHANEL_COSTAS = anel(0, -42.6, 11.4, 9.4, 14, 3.5, 3.1);
const CHANEL_FRENTE: readonly Bola[] = [
	[0.4, -50.2, 8.6, 3.4],
	[-7.4, -48.0, 3.4],
	[-3.6, -50.8, 3.6],
	[0.8, -51.8, 3.6],
	[5.0, -50.6, 3.6],
	[8.4, -47.4, 3.4],
	[-0.6, -48.6, 2.4],
	[-10.4, -43.4, 3.0],
	[-11.2, -38.6, 3.0],
	[-10.6, -33.8, 2.8],
	[10.8, -43.6, 3.0],
	[11.4, -38.8, 3.0],
	[10.8, -34.0, 2.8]
];

const chanelCacheado: Penteado = {
	atras: (ctx, _q, cor) => nuvem(ctx, CHANEL_ATRAS, cor, 5.6, 2),
	frente(ctx, _q, cor) {
		nuvem(ctx, CHANEL_FRENTE, cor, 5.2, 1);
		brilho(ctx, cor, -54.4, -2, 5.8);
	},
	costas(ctx, _q, cor) {
		nuvem(ctx, CHANEL_COSTAS, cor, 5.4, 1);
		brilho(ctx, cor, -52.8, -1.6, 6);
	}
};

// --- rabo cacheado (ref. 17): rabo alto, cachos descendo por trás; frente lisa puxada

const RABO_CACHEADO: readonly Bola[] = [
	[0.4, -53.6, 3.2, 2.6],
	[-2.8, -56.0, 2.5],
	[-6.0, -55.6, 2.7],
	[-8.8, -53.4, 2.8],
	[-10.9, -50.2, 2.9],
	[-12.2, -46.6, 2.9],
	[-12.8, -42.8, 2.9],
	[-12.8, -38.8, 2.8],
	[-12.4, -34.8, 2.8],
	[-11.8, -30.8, 2.6],
	[-11.0, -27.0, 2.4],
	[-10.0, -23.6, 2.1]
];
const RABO_CACHEADO_COSTAS: readonly Bola[] = [
	[0.2, -53.6, 3.0],
	[-0.6, -49.6, 3.1],
	[-1.2, -45.4, 3.2],
	[-1.4, -41.2, 3.2],
	[-1.2, -37.0, 3.1],
	[-0.8, -33.0, 3.0],
	[-0.4, -29.2, 2.8],
	[0, -25.6, 2.5],
	[0.2, -22.6, 2.2]
];

/** O elástico na base do rabo. */
const elastico = (ctx: C, x: number, y: number, cor = '#1c2534') => forma(ctx, oval(ctx, x, y, 1.0, 1.5), cor, 0.55);

/** Calota lisa puxada para trás (a mesma do rabo de cavalo original). */
const capaLisa = (ctx: C) => () => {
	ctx.moveTo(-9.9, -39.6);
	curvas(ctx, [-10.6, -52.2, 0, -52.4, 10.6, -52.2, 9.9, -40.6, 3, -47.8, -9.9, -39.6]);
	ctx.closePath();
};

const raboCacheado: Penteado = {
	atras(ctx, _q, cor) {
		nuvem(ctx, RABO_CACHEADO, cor, 4.4, 1);
		elastico(ctx, -1.6, -54.4);
	},
	frente(ctx, _q, cor) {
		pintar(ctx, capaLisa(ctx), cor, () => sombra(ctx, 5.2));
		const r = risco(cor);
		linha(ctx, [-7.0, -44.6, -5.0, -50.0, 0, -52.0], r);
		linha(ctx, [5.4, -45.6, 3.8, -50.4, 0.6, -52.2], r);
		brilho(ctx, cor, -49.4);
	},
	costas(ctx, _q, cor) {
		cobrir(ctx, cor);
		nuvem(ctx, RABO_CACHEADO_COSTAS, cor, 1.6, 1);
		elastico(ctx, 0.2, -51.0);
	}
};

// --- longo com franja: liso, franja reta até as sobrancelhas

const franja: Penteado = {
	atras(ctx, _q, cor) {
		const f = caixa(ctx, -11.4, -52.6, 22.8, 28.8, [10, 10, 2.4, 2.4]);
		pintar(ctx, f, cor, () => sombra(ctx, 4.4));
	},
	frente(ctx, q, cor) {
		const lado = (x: number, w: number, h: number) => pintar(ctx, caixa(ctx, x, -45.2, w, h, [1.6, 1.6, 1.2, 1.2]), cor, () => sombra(ctx, x + w * 0.6));
		lado(-11.6, 3.8, 18.2);
		lado(8.2, 3.6, 17.2);
		// Nela, a franja para logo acima da sobrancelha (que vai até -45,7)
		const b = q.feminino ? -46.0 : -45.0;
		const f = () => {
			ctx.moveTo(-10.4, -38.4);
			curvas(ctx, [-11.2, -52.8, 0.2, -53.0, 11.2, -52.8, 10.6, -39.6]);
			ctx.lineTo(9.6, -44.4);
			ctx.quadraticCurveTo(9.4, b - 0.2, 7.6, b);
			ctx.lineTo(3.4, b);
			ctx.lineTo(2.8, b + 0.7);
			ctx.lineTo(2.2, b);
			ctx.lineTo(-3.0, b);
			ctx.lineTo(-3.6, b + 0.7);
			ctx.lineTo(-4.2, b);
			ctx.lineTo(-7.6, b);
			ctx.quadraticCurveTo(-9.4, b - 0.2, -9.6, -44.0);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		brilho(ctx, cor, -51.0, -2.6, 6);
	},
	costas(ctx, _q, cor) {
		pintar(ctx, caixa(ctx, -11.4, -52.6, 22.8, 28.8, [10, 10, 2.4, 2.4]), cor, () => sombra(ctx, 5));
		const r = risco(cor);
		linha(ctx, [-4.6, -46.0, -5.0, -36.0, -4.6, -25.4], r);
		linha(ctx, [4.6, -46.0, 5.0, -36.0, 4.6, -25.4], r);
		brilho(ctx, cor, -50.4);
	}
};

// --- maria-chiquinha: dois rabinhos dos lados, presos com elástico, franja leve

function rabinhos(ctx: C, q: Quadro, cor: string) {
	const balanco = (q.andando ? Math.sin(q.fase) * 0.12 : 0) + Math.sin(q.t * 2) * 0.03;
	const corElastico = extraOu(q, '#ff6f9a');
	for (const s of [-1, 1]) {
		const ex = 0.2 + s * 10.3;
		const ey = -45.4;
		ctx.save();
		ctx.translate(ex, ey);
		ctx.rotate(s * balanco);
		ctx.scale(s, 1);
		pintar(ctx, () => {
			ctx.moveTo(-0.2, -1.4);
			ctx.bezierCurveTo(4.4, -2.8, 5.8, 4.0, 4.0, 10.0);
			ctx.bezierCurveTo(3.4, 5.6, 2.2, 2.8, -0.2, 1.6);
			ctx.closePath();
		}, cor);
		linha(ctx, [1.2, -0.4, 3.4, 1.4, 3.4, 6.2], risco(cor), 0.5);
		ctx.restore();
		elastico(ctx, ex, ey, corElastico);
	}
}

const mariaChiquinha: Penteado = {
	frente(ctx, q, cor) {
		rabinhos(ctx, q, cor);
		const f = () => {
			calota(ctx, -39.2, -40.2);
			ctx.lineTo(9.6, -43.6);
			curvas(ctx, [8.2, -47.8, 6.4, -46.2, 4.4, -48.4, 2.2, -46.2, 0.4, -48.6, -1.6, -46.4, -3.8, -48.4, -5.8, -46.2, -7.6, -48.0, -9.0, -44.2]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		brilho(ctx, cor, -51.2);
	},
	costas(ctx, q, cor) {
		cobrir(ctx, cor);
		traco(ctx, 0, -51.4, 0, -33.4, q.pele, 0.7);
		rabinhos(ctx, q, cor);
	}
};

// --- joãozinho: curtinho (pixie), franja de lado, nuca curta

const joaozinho: Penteado = {
	frente(ctx, _q, cor) {
		const f = () => {
			ctx.moveTo(-9.6, -37.4);
			ctx.lineTo(-10.6, -42.0);
			curvas(ctx, [-11.2, -52.6, -0.2, -52.8, 10.8, -52.6, 10.6, -42.2]);
			ctx.lineTo(9.8, -37.8);
			ctx.lineTo(9.0, -41.8);
			curvas(ctx, [7.4, -46.6, 3.6, -47.2, -1.4, -47.0, -8.0, -43.4]);
			ctx.lineTo(-8.8, -45.6);
			ctx.lineTo(-9.2, -41.6);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.2));
		const r = risco(cor);
		linha(ctx, [5.4, -50.4, 0.2, -48.6, -5.4, -45.2], r);
		linha(ctx, [7.6, -48.6, 4.0, -48.0, 1.0, -47.6], r, 0.5);
		brilho(ctx, cor, -51.4);
	},
	costas(ctx, _q, cor) {
		cobrir(ctx, cor);
		linha(ctx, [-3.6, -49.6, -5.4, -42.0, -3.6, -33.6], risco(cor));
		linha(ctx, [3.0, -49.6, 4.4, -42.0, 3.2, -33.6], risco(cor), 0.5);
	}
};

// ------------------------------------------------------- segunda rodada (refs. 18 a 55)

// --- repicado (ref. 27): médio, repicado até a orelha, franja em mechas na testa

/** Contorno de fora: pontas repicadas dos lados (cobrem o alto da orelha) e volume em cima. */
function contornoRepicado(ctx: C, alto: boolean) {
	ctx.moveTo(-9.0, -36.4);
	curvas(ctx, [-10.4, -36.8, -11.8, -35.8, -11.2, -38.6, -11.0, -40.4, -12.0, -40.8, -12.8, -41.4, -11.4, -42.8, -11.4, -44.4, -12.4, -45.6, -12.6, -46.8]);
	if (alto) curvas(ctx, [-11.0, -48.4, -10.6, -50.0, -8.8, -54.0, -2.6, -54.4, 1.4, -54.8, 4.2, -54.0, 9.6, -53.2, 10.9, -49.6]);
	else curvas(ctx, [-11.0, -48.4, -10.4, -50.4, -9.6, -52.6, 0.4, -52.8, 9.8, -52.6, 10.9, -49.6]);
	curvas(ctx, [12.6, -48.6, 12.9, -47.0, 11.6, -45.8, 11.5, -44.8, 12.7, -43.4, 12.9, -41.6, 11.7, -40.8, 11.3, -39.6, 12.3, -37.8, 12.0, -36.2, 10.7, -36.9, 9.7, -37.4]);
}

const repicado: Penteado = {
	frente(ctx, q, cor) {
		const alto = !coberto(q);
		const f = () => {
			contornoRepicado(ctx, alto);
			ctx.lineTo(9.4, -39.4);
			curvas(ctx, [9.6, -42.6, 8.8, -44.2]);
			// A franja: mechas que caem para a esquerda, com a ponta acima da sobrancelha
			curvas(ctx, [8.6, -46.2, 7.6, -47.4, 7.2, -45.6, 4.8, -45.0, 5.2, -46.8, 3.4, -48.0, 3.0, -46.0, 0.6, -45.2, 1.0, -47.2, -0.8, -48.2]);
			curvas(ctx, [-1.2, -46.2, -3.6, -45.1, -3.2, -46.8, -4.8, -47.9, -5.6, -45.6, -7.8, -43.4, -8.0, -45.2, -8.6, -45.6, -9.4, -42.0, -9.2, -39.0]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.2));
		const r = risco(cor);
		if (alto) {
			linha(ctx, [7.8, -51.6, 5.0, -50.6, 3.0, -48.4], r, 0.55);
			linha(ctx, [2.6, -53.2, -0.4, -51.6, -2.0, -48.6], r, 0.55);
			linha(ctx, [-3.8, -53.0, -6.6, -51.4, -7.2, -48.0], r, 0.55);
			brilho(ctx, cor, -53.6, -2.6, 6.2);
		}
		linha(ctx, [-11.0, -44.6, -10.2, -41.6, -10.6, -38.6], r, 0.5);
		linha(ctx, [11.4, -44.6, 10.6, -41.6, 11.0, -38.6], r, 0.5);
	},
	costas(ctx, q, cor) {
		const alto = !coberto(q);
		const f = () => {
			contornoRepicado(ctx, alto);
			// A nuca repicada, em pontas
			curvas(ctx, [10.8, -34.6, 10.2, -32.2, 8.8, -33.0, 6.8, -30.8, 5.0, -32.2, 2.6, -30.0, 0.8, -31.8, -1.6, -30.0]);
			curvas(ctx, [-3.4, -31.8, -5.8, -30.6, -7.6, -32.4, -9.6, -31.6, -9.8, -34.0, -9.0, -36.4]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		const r = risco(cor);
		linha(ctx, [-5.0, -50.0, -6.4, -42.0, -5.4, -32.6], r, 0.55);
		linha(ctx, [1.0, -52.0, 0.2, -42.0, 1.0, -31.8], r, 0.55);
		linha(ctx, [6.4, -50.0, 7.4, -42.0, 6.6, -32.4], r, 0.55);
		if (alto) brilho(ctx, cor, -53.2, -1.6, 6);
	}
};

// --- ondulado curto (refs. 22 e 43): ondas grandes em cima, mecha em S na testa, laterais curtas

/** O alto em ondas, com o volume indo para cima e para a direita. */
function ondasDoAlto(ctx: C, alto: boolean) {
	ctx.moveTo(-10.0, -39.0);
	curvas(ctx, [-10.8, -44.6, -10.4, -47.4]);
	if (alto) curvas(ctx, [-10.9, -51.4, -6.8, -51.6, -5.6, -55.0, -0.8, -54.4, 3.4, -55.6, 6.6, -52.8, 11.6, -52.4, 11.0, -47.4]);
	else curvas(ctx, [-10.2, -52.6, 0.4, -52.8, 10.8, -52.6, 11.0, -47.4]);
	curvas(ctx, [11.0, -43.6, 10.2, -40.2]);
}

const onduladoCurto: Penteado = {
	frente(ctx, q, cor) {
		const alto = !coberto(q);
		const f = () => {
			ondasDoAlto(ctx, alto);
			ctx.lineTo(9.2, -41.6);
			curvas(ctx, [8.8, -45.4, 6.4, -46.8, 3.4, -48.4, 0.4, -48.0, -4.8, -48.2, -7.8, -46.2, -9.2, -44.0, -9.0, -41.0]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		const r = risco(cor);
		if (alto) {
			// O desenho das ondas: um arco em cada onda
			linha(ctx, [-9.0, -47.6, -8.4, -50.0, -6.0, -50.4], r, 0.55);
			linha(ctx, [-4.8, -49.6, -3.6, -53.0, 0.4, -53.0], r, 0.55);
			linha(ctx, [1.6, -50.4, 3.6, -53.6, 7.0, -51.4], r, 0.55);
			brilho(ctx, cor, -54.0, -3.6, 4.6);
		}
		// A mecha em S caindo na testa, entre as sobrancelhas
		pintar(
			ctx,
			() => {
				ctx.moveTo(-0.8, -48.6);
				curvas(ctx, [-3.4, -47.8, -2.0, -46.0, -1.0, -45.2, 0.0, -45.4, -0.8, -45.8, -1.0, -46.6, 0.4, -47.6, 1.8, -48.0]);
				ctx.closePath();
			},
			cor,
			undefined,
			0.75
		);
	},
	costas(ctx, q, cor) {
		const alto = !coberto(q);
		const f = () => {
			ondasDoAlto(ctx, alto);
			curvas(ctx, [10.4, -33.4, 0.2, -31.4, -10.2, -33.4, -10.0, -39.0]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		const r = risco(cor);
		if (alto) {
			linha(ctx, [-8.6, -47.8, -6.6, -50.4, -3.4, -50.2], r, 0.55);
			linha(ctx, [-1.6, -50.6, 1.4, -53.4, 5.0, -51.6], r, 0.55);
			brilho(ctx, cor, -54.0, -3.6, 4.6);
		}
		linha(ctx, [-4.0, -44.0, -2.0, -38.6, -3.0, -33.6], r, 0.5);
		linha(ctx, [4.6, -45.0, 3.0, -39.0, 4.0, -33.6], r, 0.5);
	}
};

// --- flattop (ref. 26): topete reto e chapado em cima, laterais raspadas. Cara própria, sem franja

/**
 * O bloco do flattop; dx = 0,4 de frente (rosto em 3/4), 0 de costas. Mais
 * estreito que a cabeça, o alto chato com cerdinhas na beira e SEM contorno
 * embaixo: o bloco sai do raspado (contorno embaixo e faixa escura viravam gorro).
 */
function blocoFlattop(ctx: C, cor: string, dx: number, base: number) {
	// A beira de cima: chata, com cerdinhas miúdas
	const topo = () => {
		ctx.lineTo(dx - 6.6, -54.6);
		for (let x = -5.8; x <= 5.4; x += 1.4) {
			ctx.lineTo(dx + x, -55.9 - (x + 6) * 0.03);
			ctx.lineTo(dx + x + 0.7, -55.4 - (x + 6) * 0.03);
		}
		ctx.lineTo(dx + 6.6, -55.6);
		ctx.lineTo(dx + 7.0, -54.4);
	};
	const f = () => {
		ctx.moveTo(dx - 6.4, base + 0.3);
		ctx.lineTo(dx - 6.9, -53.8);
		topo();
		ctx.lineTo(dx + 6.8, base);
		curvas(ctx, [dx + 0.2, base - 1.6, dx - 6.4, base + 0.3]);
		ctx.closePath();
	};
	ctx.beginPath();
	f();
	ctx.fillStyle = cor;
	ctx.fill();
	ctx.save();
	ctx.beginPath();
	f();
	ctx.clip();
	// O plano de cima, chato, mais claro
	ctx.beginPath();
	ctx.moveTo(dx - 8, -57);
	ctx.lineTo(dx + 8, -57.4);
	ctx.lineTo(dx + 8, -54.2);
	ctx.lineTo(dx - 8, -53.6);
	ctx.closePath();
	ctx.fillStyle = tom(cor, 1.28);
	ctx.fill();
	const r = risco(cor);
	for (const x of [-3.4, 0.2, 3.6]) traco(ctx, dx + x, -53.0, dx + x + 0.3, -50.4, r, 0.5);
	sombra(ctx, dx + 3.6);
	ctx.restore();
	// Contorno só dos lados e do alto
	ctx.beginPath();
	ctx.moveTo(dx - 6.4, base + 0.3);
	ctx.lineTo(dx - 6.9, -53.8);
	topo();
	ctx.lineTo(dx + 6.8, base);
	contornar(ctx);
	linha(ctx, [dx - 5.0, -48.6, dx - 5.3, -51.0, dx - 4.6, -52.8], tom(cor, 1.5), 0.85);
}

const flattop: Penteado = {
	frente(ctx, q, cor) {
		// Laterais raspadas um pouco mais marcadas que as do moicano
		raspado(ctx, cor, false, 0.42);
		if (!coberto(q)) blocoFlattop(ctx, cor, 0.4, -46.6);
	},
	costas(ctx, q, cor) {
		raspado(ctx, cor, true, 0.42, true);
		if (!coberto(q)) blocoFlattop(ctx, cor, 0, -47.8);
	}
};

// --- coque solto (refs. 37 e 45): coque alto e bagunçado, duas mechas soltas emoldurando o rosto

const COQUE_SOLTO: readonly Bola[] = [
	[0.6, -53.4, 3.4],
	[-2.4, -52.6, 2.4],
	[3.6, -52.4, 2.5],
	[-0.4, -54.7, 1.9]
];
const COQUE_SOLTO_COSTAS: readonly Bola[] = [
	[0, -52.0, 3.6],
	[-3.0, -51.0, 2.4],
	[3.0, -51.0, 2.4],
	[0.8, -54.6, 2.0]
];

/** Fios soltos saindo do coque (o bagunçado). */
function fiosDoCoque(ctx: C, cor: string, dx: number, y: number) {
	for (const [x0, x1, x2, y1, y2] of [
		[-2.6, -5.4, -4.8, -2.4, -3.4],
		[3.4, 5.8, 5.8, -2.4, -3.4]
	] as const) {
		ctx.beginPath();
		ctx.moveTo(dx + x0, y - 1.6);
		ctx.quadraticCurveTo(dx + x1, y + y1, dx + x2, y + y2);
		contornar(ctx, 1.5);
		contornar(ctx, 0.6, cor);
	}
}

/** As duas mechas soltas dos lados do rosto, na frente da orelha. */
function mechasDoRosto(ctx: C, cor: string) {
	pintar(ctx, mechaOndulada(ctx, -9.6, -45.4, -33.6, 2.2, 0.7, 1.2, 0.5), cor, undefined, 0.8);
	pintar(ctx, mechaOndulada(ctx, 10.4, -45.6, -33.8, 2.2, 0.7, 1.2, Math.PI + 0.5), cor, () => sombra(ctx, 10.4), 0.8);
}

const coqueSolto: Penteado = {
	atras(ctx, q, cor) {
		if (coberto(q)) return;
		fiosDoCoque(ctx, cor, 0.6, -53.4);
		nuvem(ctx, COQUE_SOLTO, cor, 2.0, 1);
	},
	frente(ctx, _q, cor) {
		pintar(ctx, capaLisa(ctx), cor, () => sombra(ctx, 5.2));
		const r = risco(cor);
		// Puxado para trás, em direção ao coque
		linha(ctx, [-7.4, -44.2, -5.6, -49.4, -1.0, -52.0], r);
		linha(ctx, [6.0, -45.0, 4.6, -49.8, 1.6, -52.2], r);
		mechasDoRosto(ctx, cor);
		brilho(ctx, cor, -49.6);
	},
	costas(ctx, q, cor) {
		cobrir(ctx, cor);
		const r = risco(cor);
		linha(ctx, [-6.4, -34.0, -6.0, -42.6, -2.4, -49.4], r);
		linha(ctx, [6.4, -34.0, 6.0, -42.6, 2.4, -49.4], r);
		linha(ctx, [0, -33.2, 0.2, -42.0, 0, -48.6], r, 0.5);
		if (coberto(q)) return;
		fiosDoCoque(ctx, cor, 0, -52.0);
		nuvem(ctx, COQUE_SOLTO_COSTAS, cor, 2.4, 1);
	}
};

// --- chanel ondulado (ref. 38): retrô na altura do queixo, ondas grandes, pontas viradas para fora

/** A massa do chanel (atrás da cabeça, e vista de costas), com as pontas viradas para fora. */
const massaChanelOndulado = (ctx: C) => () => {
	ctx.moveTo(-10.4, -47.0);
	curvas(ctx, [-12.8, -42.6, -11.4, -38.6, -10.4, -36.0, -12.2, -33.8, -13.4, -32.8, -13.6, -31.4, -11.4, -31.0, -9.4, -32.0]);
	curvas(ctx, [0.2, -30.4, 9.8, -32.0]);
	curvas(ctx, [12.0, -31.0, 14.0, -31.6, 13.8, -33.2, 12.6, -34.0, 10.8, -36.2, 11.8, -38.6, 13.2, -42.6, 10.8, -47.0]);
	curvas(ctx, [10.6, -53.4, 0.2, -53.6, -10.2, -53.4, -10.4, -47.0]);
	ctx.closePath();
};

/** Cada lado do chanel na frente: cobre a orelha e termina no queixo com a ponta virada para fora. */
const ladoChanelOndulado = (ctx: C, s: number) => () => {
	const x = (v: number) => (s < 0 ? v : 0.6 - v);
	ctx.moveTo(x(-8.8), -45.4);
	curvas(ctx, [x(-12.0), -42.4, x(-11.0), -38.8, x(-10.0), -36.2, x(-11.8), -34.0, x(-13.2), -32.8, x(-13.6), -31.4]);
	curvas(ctx, [x(-11.6), -30.8, x(-9.8), -31.8, x(-8.2), -33.0, x(-8.4), -35.8]);
	curvas(ctx, [x(-9.0), -39.6, x(-8.8), -45.4]);
	ctx.closePath();
};

const chanelOndulado: Penteado = {
	atras(ctx, _q, cor) {
		pintar(ctx, massaChanelOndulado(ctx), cor, () => sombra(ctx, 4.8));
	},
	frente(ctx, q, cor) {
		const r = risco(cor);
		for (const s of [-1, 1]) {
			pintar(ctx, ladoChanelOndulado(ctx, s), cor, s > 0 ? () => sombra(ctx, 9.8) : undefined);
			// A onda no meio do lado
			const x = (v: number) => (s < 0 ? v : 0.6 - v);
			linha(ctx, [x(-10.6), -41.6, x(-9.4), -38.4, x(-10.6), -35.4], r, 0.55);
		}
		// O alto, repartido de lado; a onda grande atravessa a testa para a direita
		const f = () => {
			ctx.moveTo(-10.0, -40.6);
			curvas(ctx, [-11.2, -52.8, -3.0, -53.2, 9.8, -53.6, 10.8, -44.6, 10.8, -42.4, 10.0, -40.8]);
			ctx.lineTo(9.0, -42.4);
			curvas(ctx, [8.6, -45.8, 5.6, -46.4, 2.2, -46.6, 0.4, -48.0, -1.4, -49.4, -3.4, -49.6, -6.6, -48.8, -8.6, -45.6, -9.4, -43.6, -9.0, -41.0]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		if (!coberto(q)) {
			linha(ctx, [-2.0, -51.4, 4.6, -51.0, 8.4, -46.4], r, 0.55);
			linha(ctx, [-4.4, -51.8, -7.4, -50.4, -8.8, -46.6], r, 0.55);
			brilho(ctx, cor, -52.4, 0.4, 5.6);
		}
	},
	costas(ctx, _q, cor) {
		pintar(ctx, massaChanelOndulado(ctx), cor, () => sombra(ctx, 5));
		const r = risco(cor);
		linha(ctx, [-6.0, -46.0, -4.4, -40.6, -6.4, -35.4], r, 0.55);
		linha(ctx, [0.4, -48.0, 2.0, -41.0, 0.4, -33.4], r, 0.55);
		linha(ctx, [6.6, -46.0, 5.0, -40.6, 6.8, -35.4], r, 0.55);
		brilho(ctx, cor, -52.4);
	}
};

// --- na altura do ombro (ref. 44): ondas leves, repartido de lado, cobrindo as orelhas

const massaOmbro = (ctx: C) => () => {
	ctx.moveTo(-10.8, -46.0);
	curvas(ctx, [-12.6, -40.0, -12.0, -34.0, -11.6, -30.0, -12.8, -27.2]);
	curvas(ctx, [-10.6, -25.8, -8.0, -26.8, -4.0, -25.8, 0.2, -26.6, 4.4, -25.8, 8.4, -26.8, 11.0, -25.8, 13.2, -27.2]);
	curvas(ctx, [12.2, -30.0, 12.6, -34.0, 13.0, -40.0, 11.0, -46.0]);
	curvas(ctx, [10.6, -53.4, 0.2, -53.4, -10.4, -53.4, -10.8, -46.0]);
	ctx.closePath();
};

/** Cada cortina do lado, da têmpora ao ombro, por cima da orelha. */
const cortinaOmbro = (ctx: C, s: number) => () => {
	const x = (v: number) => (s < 0 ? v : 0.6 - v);
	ctx.moveTo(x(-8.6), -46.4);
	curvas(ctx, [x(-12.4), -42.4, x(-11.8), -36.6, x(-11.2), -31.6, x(-12.8), -27.4]);
	curvas(ctx, [x(-11.0), -26.2, x(-9.4), -27.2]);
	curvas(ctx, [x(-9.2), -30.6, x(-8.8), -34.4, x(-8.4), -38.8, x(-8.8), -42.2]);
	ctx.closePath();
};

const ombro: Penteado = {
	atras(ctx, _q, cor) {
		pintar(ctx, massaOmbro(ctx), cor, () => sombra(ctx, 4.6));
	},
	frente(ctx, q, cor) {
		const r = risco(cor);
		for (const s of [-1, 1]) {
			pintar(ctx, cortinaOmbro(ctx, s), cor, s > 0 ? () => sombra(ctx, 10.0) : undefined);
			const x = (v: number) => (s < 0 ? v : 0.6 - v);
			linha(ctx, [x(-10.4), -41.4, x(-10.8), -35.0, x(-10.2), -29.4], r, 0.5);
		}
		const f = () => {
			ctx.moveTo(-10.0, -41.4);
			curvas(ctx, [-11.2, -52.8, -2.8, -53.2, 9.8, -53.4, 10.8, -44.8, 10.8, -42.4, 10.2, -41.4]);
			ctx.lineTo(9.2, -42.8);
			curvas(ctx, [8.4, -46.0, 4.8, -46.6, 1.4, -47.4, -0.6, -49.2, -2.8, -49.8, -6.2, -49.0, -8.4, -46.4, -9.2, -44.4, -9.0, -41.8]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.4));
		if (!coberto(q)) {
			linha(ctx, [-1.4, -51.4, 4.4, -50.6, 8.0, -46.6], r, 0.55);
			linha(ctx, [-4.2, -51.6, -7.0, -50.2, -8.6, -46.8], r, 0.55);
			brilho(ctx, cor, -52.4, 0.6, 5.6);
		}
	},
	costas(ctx, _q, cor) {
		pintar(ctx, massaOmbro(ctx), cor, () => sombra(ctx, 5));
		const r = risco(cor);
		linha(ctx, [-5.6, -47.0, -6.4, -37.0, -5.0, -27.4], r, 0.55);
		linha(ctx, [0.4, -49.0, 0.0, -38.0, 0.6, -27.0], r, 0.55);
		linha(ctx, [6.2, -47.0, 6.8, -37.0, 5.6, -27.4], r, 0.55);
		brilho(ctx, cor, -52.2);
	}
};

// --- duas tranças (ref. 47): repartido ao meio, duas tranças grossas pela frente dos ombros

/**
 * Trança grossa embutida ao longo da curva (x0, y0) → (x1, y1) com controle
 * (cx, cy): um tubo com os gomos em "V" e, na ponta, o elástico e o pincel.
 */
function trancaGrossa(ctx: C, cor: string, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n: number, larg: number, ponta: boolean) {
	const em = (t: number) => {
		const u = 1 - t;
		return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1] as const;
	};
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.quadraticCurveTo(cx, cy, x1, y1);
	contornar(ctx, larg + LW * 2);
	contornar(ctx, larg, cor);
	// Os gomos: um "V" apontando para a ponta em cada trecho, e um recorte na borda
	const r = risco(cor);
	for (let i = 1; i < n; i++) {
		const [px, py] = em(i / n);
		const [qx, qy] = em(Math.min(1, i / n + 0.02));
		const d = Math.hypot(qx - px, qy - py) || 1;
		const ux = (qx - px) / d;
		const uy = (qy - py) / d;
		const w = larg * 0.5;
		ctx.beginPath();
		ctx.moveTo(px - uy * w - ux * 0.9, py + ux * w - uy * 0.9);
		ctx.lineTo(px + ux * 0.5, py + uy * 0.5);
		ctx.lineTo(px + uy * w - ux * 0.9, py - ux * w - uy * 0.9);
		contornar(ctx, 0.55, r);
		// O recorte entre gomos, na borda de fora
		for (const s of [-1, 1]) traco(ctx, px + s * uy * (w + 0.5) - ux * 0.9, py - s * ux * (w + 0.5) - uy * 0.9, px + s * uy * (w - 0.1) - ux * 0.5, py - s * ux * (w - 0.1) - uy * 0.5, CONTORNO, 0.7);
	}
	if (!ponta) return;
	// O elástico e o pincel da ponta
	const [ex, ey] = em(1);
	pintar(ctx, () => {
		ctx.moveTo(ex - 0.9, ey + 0.4);
		curvas(ctx, [ex - 1.8, ey + 2.6, ex - 0.2, ey + 3.4, ex + 0.4, ey + 2.4, ex + 1.8, ey + 2.4, ex + 1.1, ey + 0.2]);
		ctx.closePath();
	}, cor, undefined, 0.7);
	forma(ctx, oval(ctx, ex + 0.1, ey + 0.4, 1.3, 0.7), '#1c2534', 0.5);
}

const duasTrancas: Penteado = {
	frente(ctx, q, cor) {
		// Cada lado desce por cima da orelha até o começo da trança
		for (const s of [-1, 1]) {
			const x = (v: number) => (s < 0 ? v : 0.6 - v);
			pintar(ctx, () => {
				ctx.moveTo(x(-8.6), -45.0);
				curvas(ctx, [x(-12.0), -42.2, x(-11.4), -37.4, x(-10.4), -35.2, x(-8.8), -36.8, x(-9.4), -40.8, x(-8.6), -45.0]);
				ctx.closePath();
			}, cor, s > 0 ? () => sombra(ctx, 10.2) : undefined, 0.85);
		}
		const f = () => {
			calota(ctx, -40.4, -41.0);
			ctx.lineTo(9.4, -42.2);
			curvas(ctx, [8.6, -46.6, 4.6, -47.4, 0.5, -49.0, -3.6, -47.4, -8.2, -46.6, -9.0, -42.0]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => sombra(ctx, 5.2));
		const r = risco(cor);
		for (const s of [-1, 1]) {
			linha(ctx, [0.5 + s * 0.6, -51.8, 0.5 + s * 5.0, -51.0, 0.5 + s * 8.6, -46.6], r, 0.5);
			linha(ctx, [0.5 + s * 0.6, -49.8, 0.5 + s * 3.8, -49.2, 0.5 + s * 6.8, -47.0], r, 0.5);
		}
		// Risca do meio: aparece o couro cabeludo
		if (!coberto(q)) traco(ctx, 0.5, -52.6, 0.5, -49.4, q.pele, 0.7);
		// As tranças, pela frente dos ombros até o peito
		trancaGrossa(ctx, cor, -10.0, -36.6, -9.0, -30.2, -6.6, -23.6, 6, 3.0, true);
		trancaGrossa(ctx, cor, 10.6, -36.6, 9.8, -30.2, 7.4, -23.6, 6, 3.0, true);
	},
	costas(ctx, q, cor) {
		cobrir(ctx, cor);
		traco(ctx, 0, -51.4, 0, -34.0, q.pele, 0.7);
		const r = risco(cor);
		linha(ctx, [-0.6, -48.0, -4.6, -42.0, -2.6, -34.6], r, 0.5);
		linha(ctx, [0.6, -48.0, 4.6, -42.0, 2.6, -34.6], r, 0.5);
		// Da nuca, cada trança vai para um lado e passa para a frente do ombro
		trancaGrossa(ctx, cor, -2.2, -34.4, -6.6, -32.6, -9.4, -27.4, 4, 3.0, false);
		trancaGrossa(ctx, cor, 2.2, -34.4, 6.6, -32.6, 9.4, -27.4, 4, 3.0, false);
	}
};

// --- permanente (ref. 49): curtinho e fofo de senhora, ondinhas miúdas; aparece por baixo do chapéu

const PERMANENTE: readonly Bola[] = [
	// Cachinhos de orelha a orelha, por cima
	[-10.0, -38.6, 2.0],
	[-10.9, -41.8, 2.2],
	[-11.0, -45.2, 2.2],
	[-9.6, -48.4, 2.2],
	[-7.0, -50.6, 2.2],
	[-3.6, -51.5, 2.2],
	[0.4, -51.7, 2.2],
	[4.2, -51.5, 2.2],
	[7.6, -50.6, 2.2],
	[10.2, -48.4, 2.2],
	[11.6, -45.2, 2.2],
	[11.6, -41.8, 2.2],
	[10.8, -38.6, 2.0],
	// O miolo e a franjinha de cachos na testa (para acima da sobrancelha)
	[0.4, -50.0, 9.0, 3.2],
	[-6.6, -47.8, 1.6],
	[-3.4, -48.4, 1.7],
	[0.2, -48.6, 1.7],
	[3.8, -48.4, 1.7],
	[7.2, -47.8, 1.6]
];
const PERMANENTE_COSTAS = anel(0, -42.4, 9.8, 9.2, 18, 2.3, 2.0);

const permanente: Penteado = {
	frente(ctx, _q, cor) {
		nuvem(ctx, PERMANENTE, cor, 5.6, 1);
		brilho(ctx, cor, -52.2, -2.6, 5.4);
	},
	costas(ctx, _q, cor) {
		nuvem(ctx, PERMANENTE_COSTAS, cor, 5.4, 1);
		brilho(ctx, cor, -52.4, -1.6, 5.6);
	}
};

const PENTEADOS: Record<string, Penteado> = {
	repicado,
	onduladoCurto,
	flattop,
	coqueSolto,
	chanelOndulado,
	ombro,
	duasTrancas,
	permanente,
	topete,
	penteadoTras,
	arrepiado,
	espetado,
	moicano,
	calvoLados,
	afroCurto,
	dreads,
	trancas,
	ondulado,
	cachosVolumosos,
	chanelCacheado,
	raboCacheado,
	franja,
	mariaChiquinha,
	joaozinho
};

// ================================================================== barbas

/**
 * Barba com o furo da boca: o contorno de fora já inclui o bigode, e o furo
 * (elipse em volta da boca) deixa a expressão aparecer.
 */
function barbaComFuro(ctx: C, cor: string, fora: () => void, furo: (() => void) | null, xSombra = 4.4) {
	const f = () => {
		fora();
		furo?.();
	};
	pintar(ctx, f, cor, () => sombra(ctx, xSombra), 0, 'evenodd');
	ctx.beginPath();
	fora();
	contornar(ctx, LW);
	if (furo) {
		ctx.beginPath();
		furo();
		contornar(ctx, 0.55);
	}
}

const furoDaBoca = (ctx: C, rx = 3.5, ry = 1.5, y = -34.7) => () => {
	ctx.moveTo(1 + rx, y);
	ctx.ellipse(1, y, rx, ry, 0, 0, PI2);
};

/** Bigode solto (o do cavanhaque e o fino). */
function bigode(ctx: C, cor: string, fino: boolean) {
	const f = fino
		? () => {
				ctx.moveTo(-2.2, -35.9);
				curvas(ctx, [-0.8, -37.4, 1.0, -36.9, 2.8, -37.4, 4.2, -35.9, 2.8, -36.4, 1.0, -36.2, -0.8, -36.4, -2.2, -35.9]);
				ctx.closePath();
			}
		: () => {
				ctx.moveTo(-2.4, -35.5);
				curvas(ctx, [-1.4, -37.6, 1.0, -37.1, 3.4, -37.6, 4.4, -35.5, 3.0, -36.1, 1.0, -35.8, -1.0, -36.1, -2.4, -35.5]);
				ctx.closePath();
			};
	pintar(ctx, f, cor, () => sombra(ctx, 3.2), fino ? 0.55 : 0.75);
}

function barba(ctx: C, q: Quadro) {
	const cor = q.cabelo;
	switch (q.a.barba) {
		case 'porFazer': {
			// Sombra de barba sem contorno, presa ao rosto
			ctx.save();
			ctx.beginPath();
			oval(ctx, 0, CY, R - 0.3, R - 0.3)();
			ctx.clip();
			ctx.globalAlpha = 0.26;
			ctx.beginPath();
			ctx.moveTo(-9.6, -42);
			ctx.lineTo(-9.8, -38);
			curvas(ctx, [-9.8, -30.4, 0.6, -30.4, 10, -30.4, 10, -38.4]);
			ctx.lineTo(9.6, -42);
			ctx.lineTo(8.8, -42);
			ctx.lineTo(8.6, -38.6);
			curvas(ctx, [8.0, -35.6, 5.0, -35.2, 3.6, -37.3, 1.0, -37.0, -1.6, -37.3, -2.8, -35.2, -7.6, -35.6, -8.6, -38.6]);
			ctx.lineTo(-8.8, -42);
			ctx.closePath();
			furoDaBoca(ctx, 3.4, 1.4)();
			ctx.fillStyle = cor;
			ctx.fill('evenodd');
			ctx.restore();
			return;
		}
		case 'curta':
			// Desenhada rente à mandíbula, bigode ligado, sorriso à mostra (ref. 1)
			barbaComFuro(
				ctx,
				cor,
				() => {
					ctx.moveTo(-9.5, -43.0);
					ctx.lineTo(-9.9, -38.6);
					curvas(ctx, [-9.8, -33.0, -5.4, -30.8, 0.6, -28.4, 6.4, -30.8, 10.2, -33.0, 10.0, -38.8]);
					ctx.lineTo(9.6, -43.0);
					ctx.lineTo(8.6, -42.8);
					ctx.lineTo(8.8, -38.6);
					curvas(ctx, [8.6, -35.6, 5.4, -35.2, 4.0, -37.4, 1.0, -37.1, -1.8, -37.4, -3.2, -35.2, -8.0, -35.6, -8.6, -38.4]);
					ctx.lineTo(-8.4, -42.8);
					ctx.closePath();
				},
				furoDaBoca(ctx, 3.6, 1.6)
			);
			return;
		case 'cheia':
			// Cheia e arredondada, cobrindo o queixo (ref. 10)
			barbaComFuro(
				ctx,
				cor,
				() => {
					ctx.moveTo(-9.6, -43.4);
					ctx.lineTo(-10.2, -38.8);
					curvas(ctx, [-10.6, -31.6, -5.6, -28.4, 0.6, -25.8, 6.6, -28.4, 11.2, -31.6, 10.4, -39.0]);
					ctx.lineTo(9.8, -43.4);
					ctx.lineTo(8.8, -43.2);
					ctx.lineTo(8.6, -39.0);
					curvas(ctx, [8.2, -35.2, 5.6, -35.0, 4.0, -37.8, 1.0, -37.4, -2.0, -37.8, -3.4, -35.2, -7.8, -35.4, -8.4, -39.0]);
					ctx.lineTo(-8.6, -43.2);
					ctx.closePath();
				},
				furoDaBoca(ctx, 3.4, 1.5)
			);
			linha(ctx, [-2.6, -31.6, -1.8, -29.6, -0.4, -28.4], risco(cor), 0.5);
			linha(ctx, [4.0, -31.6, 3.4, -29.6, 2.2, -28.4], risco(cor), 0.5);
			return;
		case 'cavanhaque': {
			bigode(ctx, cor, false);
			// No diabinho (quem tem chifres), o cavanhaque é pontudo
			const pontudo = temDetalhe(q, 'chifres');
			pintar(ctx, () => {
				ctx.moveTo(-1.4, -33.0);
				ctx.quadraticCurveTo(1.0, -32.4, 3.4, -33.0);
				if (pontudo) curvas(ctx, [3.4, -30.8, 1.2, -27.2, -1.2, -30.8, -1.4, -33.0]);
				else curvas(ctx, [3.2, -30.4, 1.0, -29.4, -1.2, -30.4, -1.4, -33.0]);
				ctx.closePath();
			}, cor, () => sombra(ctx, 1.8), 0.75);
			return;
		}
		case 'bigode':
			bigode(ctx, cor, true);
			return;
		case 'bigodao': {
			// Bigodão farto caindo pelos cantos da boca (ref. 5)
			const f = () => {
				ctx.moveTo(1.0, -37.2);
				curvas(ctx, [-1.6, -38.4, -3.4, -36.8, -4.8, -35.4, -4.4, -33.2, -2.8, -34.6, -1.0, -34.6, 0.2, -34.8, 1.0, -35.6, 1.8, -34.8, 3.0, -34.6, 4.8, -34.6, 6.4, -33.2, 6.8, -35.4, 5.4, -36.8, 3.6, -38.4, 1.0, -37.2]);
				ctx.closePath();
			};
			pintar(ctx, f, cor, () => sombra(ctx, 3.2), 0.8);
			const r = risco(cor);
			linha(ctx, [0.2, -36.6, -1.8, -36.4, -3.4, -34.6], r, 0.45);
			linha(ctx, [1.8, -36.6, 3.8, -36.4, 5.4, -34.6], r, 0.45);
			return;
		}
		case 'longa':
			// Barba de mago até o peito, por cima da roupa
			barbaComFuro(
				ctx,
				cor,
				() => {
					ctx.moveTo(-9.4, -43.0);
					ctx.lineTo(-9.9, -38.6);
					curvas(ctx, [-10.2, -30.0, -6.6, -24.4, -3.6, -19.6, 1.0, -17.4, 5.8, -19.6, 8.6, -24.4, 11.0, -30.0, 10.1, -38.8]);
					ctx.lineTo(9.6, -43.0);
					ctx.lineTo(8.6, -42.8);
					ctx.lineTo(8.6, -38.8);
					curvas(ctx, [8.2, -35.4, 5.6, -35.2, 3.8, -37.6, 1.0, -37.2, -1.8, -37.6, -3.4, -35.2, -8.2, -35.4, -8.6, -38.6]);
					ctx.lineTo(-8.4, -42.8);
					ctx.closePath();
				},
				furoDaBoca(ctx, 3.0, 1.15, -34.9),
				4.2
			);
			{
				const r = risco(cor);
				linha(ctx, [-4.6, -31.0, -4.0, -26.0, -1.6, -21.6], r, 0.5);
				linha(ctx, [6.0, -31.0, 5.6, -26.0, 3.6, -21.6], r, 0.5);
				linha(ctx, [1.0, -32.4, 1.4, -27.0, 1.0, -21.0], r, 0.5);
			}
			return;
	}
}

// ================================================================== rosto

type Sobrancelha = 'normal' | 'ergue' | 'reta' | 'brava' | 'alta';
type Olhos = 'abertos' | 'piscada' | 'fechados';
type Boca = 'sorriso' | 'fechada' | 'meia' | 'reta' | 'dentes' | 'doce';
type Expressao = { sobrancelha: Sobrancelha; olhos: Olhos; boca: Boca; corada?: boolean };

const EXPRESSOES: Record<string, Expressao> = {
	sorriso: { sobrancelha: 'normal', olhos: 'abertos', boca: 'sorriso' },
	sorrisoFechado: { sobrancelha: 'normal', olhos: 'abertos', boca: 'fechada' },
	confiante: { sobrancelha: 'ergue', olhos: 'abertos', boca: 'meia' },
	piscada: { sobrancelha: 'normal', olhos: 'piscada', boca: 'sorriso' },
	serio: { sobrancelha: 'reta', olhos: 'abertos', boca: 'reta' },
	bravo: { sobrancelha: 'brava', olhos: 'abertos', boca: 'dentes' },
	sonhador: { sobrancelha: 'alta', olhos: 'fechados', boca: 'doce', corada: true }
};

const OLHO = '#1f2230';
const BATOM = '#c4405e';

/** `cor`: a do bicho (o pelo escurecido); sem ela, a do cabelo. */
function sobrancelhas(ctx: C, q: Quadro, tipo: Sobrancelha, cor = tom(q.cabelo, 0.7)) {
	const fem = q.feminino;
	ctx.beginPath();
	OLHOS.x.forEach((x, i) => {
		// i = 0: olho da esquerda (a ponta de dentro fica em +x); i = 1: o da direita
		const d = i === 0 ? 1 : -1;
		switch (tipo) {
			case 'ergue':
				// A da direita levantada; a da esquerda um pouco mais baixa
				if (i === 1) {
					ctx.moveTo(x - (fem ? 1.7 : 1.5), fem ? -44.8 : -44.5);
					ctx.quadraticCurveTo(x, fem ? -47.0 : -46.3, x + (fem ? 1.7 : 1.6), fem ? -45.3 : -44.9);
				} else {
					ctx.moveTo(x - (fem ? 1.7 : 1.6), fem ? -43.6 : -43.3);
					ctx.quadraticCurveTo(x, fem ? -44.9 : -44.0, x + (fem ? 1.7 : 1.5), fem ? -43.9 : -43.4);
				}
				break;
			case 'reta':
				ctx.moveTo(x - d * 1.6, fem ? -44.3 : -43.7);
				ctx.lineTo(x + d * 1.6, fem ? -43.8 : -43.1);
				break;
			case 'brava':
				ctx.moveTo(x - d * 1.8, fem ? -45.0 : -44.9);
				ctx.lineTo(x + d * 1.5, fem ? -42.9 : -42.6);
				break;
			case 'alta':
				ctx.moveTo(x - (fem ? 1.7 : 1.6), fem ? -44.6 : -44.4);
				ctx.quadraticCurveTo(x, fem ? -46.6 : -45.6, x + (fem ? 1.7 : 1.5), fem ? -45.0 : -44.6);
				break;
			default:
				if (fem) {
					ctx.moveTo(x - 1.7, -43.8);
					ctx.quadraticCurveTo(x - 0.1, -45.7, x + 1.7, -44.2);
				} else {
					ctx.moveTo(x - 1.6, -43.5);
					ctx.quadraticCurveTo(x, -44.6, x + 1.5, -43.7);
				}
		}
	});
	const grossa = tipo === 'brava' ? 0.4 : tipo === 'reta' ? 0.12 : 0;
	contornar(ctx, (fem ? 0.7 : 0.95) + grossa, cor);
}

/** Cílios para fora (dela), no olho aberto. */
function cilios(ctx: C, x: number) {
	const fora = x < 0.5 ? -1 : 1;
	traco(ctx, x + fora * 1.2, -41.5, x + fora * 2.5, -42.1, OLHO, 0.7);
	traco(ctx, x + fora * 0.7, -42.1, x + fora * 1.6, -43.2, OLHO, 0.65);
	traco(ctx, x + fora * 1.45, -40.7, x + fora * 2.6, -40.8, OLHO, 0.6);
}

/** `aro`: anel claro em volta do olho, para ele aparecer sobre mancha escura (panda, guaxinim). */
function olhoAberto(ctx: C, x: number, fem: boolean, aro?: string) {
	if (aro) forma(ctx, oval(ctx, x, -40.3, (fem ? 1.55 : 1.45) + 0.55, (fem ? 2.05 : 1.95) + 0.55), aro, 0);
	ctx.beginPath();
	ctx.ellipse(x, -40.3, fem ? 1.55 : 1.45, fem ? 2.05 : 1.95, 0, 0, PI2);
	ctx.fillStyle = OLHO;
	ctx.fill();
	ponto(ctx, x + 0.45, -41.1, 0.6, '#ffffff');
	if (fem) cilios(ctx, x);
}

/** Olho fechado em arco feliz (∩); nela, um cílio na ponta de fora. */
function olhoFechado(ctx: C, x: number, fem: boolean) {
	ctx.beginPath();
	ctx.moveTo(x - 1.6, -39.8);
	ctx.quadraticCurveTo(x, -42.3, x + 1.6, -39.8);
	contornar(ctx, 0.95, OLHO);
	if (fem) {
		const fora = x < 0.5 ? -1 : 1;
		traco(ctx, x + fora * 1.5, -40.3, x + fora * 2.5, -41.0, OLHO, 0.65);
	}
}

/** Olhos grandes e claros que brilham (alienígena, marciana). */
function olhoBrilhando(ctx: C, q: Quadro, x: number) {
	const luz = q.a.pele === 'azul' ? '#ffd54a' : '#5ff0c0';
	ctx.globalAlpha = 0.24 + Math.sin(q.t * 3) * 0.06;
	ponto(ctx, x, -40.3, 3.2, luz);
	ctx.globalAlpha = 1;
	forma(ctx, oval(ctx, x, -40.3, 2.1, 2.6), '#f2fffb', 0.7);
	forma(ctx, oval(ctx, x + 0.3, -40.1, 1.4, 1.8), luz, 0);
	forma(ctx, oval(ctx, x + 0.4, -40.0, 0.55, 0.85), OLHO, 0);
	ponto(ctx, x - 0.3, -41.3, 0.55, '#ffffff');
}

function boca(ctx: C, q: Quadro, tipo: Boca) {
	const fem = q.feminino;
	const dentro = fem ? '#8f2a40' : '#7a2530';
	const borda = fem ? BATOM : CONTORNO;
	switch (tipo) {
		case 'fechada':
			ctx.beginPath();
			ctx.moveTo(-1.3, -35.5);
			ctx.quadraticCurveTo(1, -33.5, 3.3, -35.5);
			contornar(ctx, fem ? 1.15 : 0.85, borda);
			return;
		case 'reta':
			ctx.beginPath();
			ctx.moveTo(fem ? -0.6 : -0.3, -35.0);
			ctx.quadraticCurveTo(1.1, -34.8, fem ? 2.8 : 2.5, -35.0);
			contornar(ctx, fem ? 1.1 : 0.85, borda);
			return;
		case 'meia': {
			// Meio sorriso de lado: o canto da direita sobe
			const f = () => {
				ctx.moveTo(-0.9, -35.0);
				curvas(ctx, [1.6, -34.5, 4.0, -36.4, 2.2, -33.0, -0.9, -35.0]);
				ctx.closePath();
			};
			ctx.save();
			ctx.beginPath();
			f();
			ctx.fillStyle = dentro;
			ctx.fill();
			ctx.clip();
			ctx.beginPath();
			ctx.moveTo(-0.9, -35.0);
			ctx.quadraticCurveTo(1.6, -34.5, 4.0, -36.4);
			contornar(ctx, 1.0, '#ffffff');
			ctx.restore();
			ctx.beginPath();
			f();
			contornar(ctx, fem ? 0.9 : 0.7, borda);
			return;
		}
		case 'dentes': {
			// Dentes cerrados: bravo de desenho, não de filme de terror
			const f = caixa(ctx, -2.0, -36.6, 6.0, 3.0, 1.0);
			pintar(ctx, f, '#ffffff', () => {
				traco(ctx, -2, -35.1, 4, -35.1, '#a7afbd', 0.45);
				for (const x of [0, 2]) traco(ctx, x, -36.6, x, -33.6, '#a7afbd', 0.45);
			}, 0.75);
			return;
		}
		case 'doce': {
			const f = () => {
				ctx.moveTo(-0.6, -35.4);
				ctx.quadraticCurveTo(1, -32.8, 2.6, -35.4);
				ctx.closePath();
			};
			pintar(ctx, f, dentro, () => ponto(ctx, 1, -33.9, 0.8, '#e8707a'), fem ? 0.9 : 0.75);
			if (fem) {
				ctx.beginPath();
				f();
				contornar(ctx, 0.9, BATOM);
			}
			return;
		}
		default: {
			// O sorriso aberto de sempre (o mesmo de avatar.ts)
			const f = () => {
				ctx.moveTo(-1.7, -35.7);
				ctx.quadraticCurveTo(1, -31.6, 3.7, -35.7);
				ctx.closePath();
			};
			ctx.save();
			ctx.beginPath();
			f();
			ctx.fillStyle = dentro;
			ctx.fill();
			ctx.clip();
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(-2, -35.9, 6, 0.95);
			ctx.beginPath();
			ctx.ellipse(1, -33.2, 1.3, 0.75, 0, 0, PI2);
			ctx.fillStyle = '#e8707a';
			ctx.fill();
			ctx.restore();
			ctx.beginPath();
			f();
			contornar(ctx, fem ? 1 : 0.75, borda);
		}
	}
}

function expressao(ctx: C, q: Quadro, ex: Expressao, brilhando: boolean) {
	const fem = q.feminino;
	// Bochechas (mais coradas nela e no sonhador)
	const k = ex.corada ? 0.18 : 0;
	for (const x of [-5.5, 6.4]) {
		ctx.beginPath();
		ctx.ellipse(x, -36.4, fem ? 2.1 : 1.9, fem ? 1.3 : 1.15, 0, 0, PI2);
		ctx.fillStyle = fem ? `rgba(236, 96, 120, ${0.55 + k})` : `rgba(236, 104, 116, ${0.42 + k})`;
		ctx.fill();
	}
	// Quem tem olhos brilhando (alienígena) não tem sobrancelha
	if (!brilhando) sobrancelhas(ctx, q, ex.sobrancelha);
	OLHOS.x.forEach((x, i) => {
		const fechado = ex.olhos === 'fechados' || (ex.olhos === 'piscada' && i === 1);
		if (fechado) olhoFechado(ctx, x, fem);
		else if (brilhando) olhoBrilhando(ctx, q, x);
		else olhoAberto(ctx, x, fem);
	});
	// Nariz
	ctx.beginPath();
	ctx.arc(1, -38.2, 0.95, 0.05 * Math.PI, 0.95 * Math.PI);
	contornar(ctx, 0.75, tom(q.pele, 0.62));
	boca(ctx, q, ex.boca);
}

/** Rosto do robô: visor escuro com olhos de luz, bochechas de LED e sorriso de luz. */
function rostoRobo(ctx: C, q: Quadro) {
	const luz = extraOu(q, '#22c7e0');
	pintar(ctx, caixa(ctx, -7.6, -44.4, 16.4, 6.8, 3.2), '#1d2430', undefined, 0.9);
	ctx.globalAlpha = 0.3;
	for (const x of OLHOS.x) forma(ctx, oval(ctx, x, -41, 2.6, 2.2), luz, 0);
	ctx.globalAlpha = 1;
	// Pisca de vez em quando
	const pisca = q.t % 4.6 < 0.14;
	for (const x of OLHOS.x) {
		if (pisca) traco(ctx, x - 1.3, -40.9, x + 1.3, -40.9, luz, 0.9);
		else {
			forma(ctx, caixa(ctx, x - 1.3, -42.3, 2.6, 2.8, 0.9), luz, 0);
			ponto(ctx, x - 0.4, -41.6, 0.45, '#ffffff');
		}
	}
	traco(ctx, -6.0, -43.3, -3.4, -43.3, 'rgba(255,255,255,0.35)', 0.7);
	ctx.globalAlpha = 0.55;
	forma(ctx, caixa(ctx, -7.0, -36.8, 2.6, 1.2, 0.6), '#ff7a9a', 0);
	forma(ctx, caixa(ctx, 5.4, -36.8, 2.6, 1.2, 0.6), '#ff7a9a', 0);
	ctx.globalAlpha = 1;
	ctx.beginPath();
	ctx.moveTo(-1.2, -35.6);
	ctx.quadraticCurveTo(1, -33.4, 3.2, -35.6);
	contornar(ctx, 1.7);
	contornar(ctx, 0.8, luz);
}

// ================================================================== óculos

function haste(ctx: C, x0: number, y0: number, x1: number, y1: number, cor: string, lw = 0.55) {
	traco(ctx, x0, y0, x1, y1, CONTORNO, lw + 0.6);
	traco(ctx, x0, y0, x1, y1, cor, lw);
}

const LENTE_CLARA = 'rgba(255,255,255,0.16)';

function desenharOculos(ctx: C, q: Quadro) {
	const [xe, xd] = OLHOS.x;
	switch (q.a.oculos) {
		case 'redondo': {
			// Armação fina dourada, redonda e grande (ref. 7)
			const cor = '#d0a94e';
			const r = 2.95;
			haste(ctx, xe - r, -40.8, -9.4, -41.4, cor);
			haste(ctx, xd + r, -40.8, 9.6, -41.4, cor);
			for (const x of [xe, xd]) {
				ctx.beginPath();
				ctx.arc(x, -40.4, r, 0, PI2);
				ctx.fillStyle = LENTE_CLARA;
				ctx.fill();
				contornar(ctx, 1.25);
				contornar(ctx, 0.6, cor);
			}
			ctx.beginPath();
			ctx.moveTo(xe + r, -41.0);
			ctx.quadraticCurveTo(0.5, -41.9, xd - r, -41.0);
			contornar(ctx, 1.15);
			contornar(ctx, 0.55, cor);
			return;
		}
		case 'meiaLua': {
			// Óculos de leitura, mais baixos, na ponta do nariz
			const cor = '#3a2a22';
			haste(ctx, xe - 2.4, -39.8, -9.4, -41.2, cor, 0.5);
			haste(ctx, xd + 2.4, -39.8, 9.6, -41.2, cor, 0.5);
			for (const x of [xe, xd]) {
				const f = () => {
					ctx.moveTo(x - 2.4, -39.8);
					ctx.lineTo(x + 2.4, -39.8);
					ctx.ellipse(x, -39.8, 2.4, 1.9, 0, 0, Math.PI);
					ctx.closePath();
				};
				pintar(ctx, f, LENTE_CLARA, undefined, 0.85);
			}
			ctx.beginPath();
			ctx.moveTo(xe + 2.4, -39.7);
			ctx.quadraticCurveTo(0.5, -40.8, xd - 2.4, -39.7);
			contornar(ctx, 0.85);
			return;
		}
		case 'gatinho': {
			// Armação gatinho: as pontas de cima levantadas
			haste(ctx, xe - 3.2, -42.4, -9.4, -41.8, '#1f2230', 0.5);
			haste(ctx, xd + 3.2, -42.4, 9.6, -41.8, '#1f2230', 0.5);
			OLHOS.x.forEach((x, i) => {
				const o = i === 0 ? -1 : 1;
				const f = () => {
					ctx.moveTo(x - o * 2.3, -42.0);
					ctx.quadraticCurveTo(x, -42.8, x + o * 2.6, -43.3);
					ctx.lineTo(x + o * 3.4, -44.0);
					curvas(ctx, [x + o * 3.0, -41.0, x + o * 1.8, -38.8, x, -38.0, x - o * 2.1, -39.0, x - o * 2.6, -40.6, x - o * 2.3, -42.0]);
					ctx.closePath();
				};
				pintar(ctx, f, LENTE_CLARA, undefined, 1.2);
				ponto(ctx, x + o * 2.6, -42.9, 0.4, 'rgba(255,255,255,0.6)');
			});
			traco(ctx, xe + 2.3, -41.6, xd - 2.3, -41.6, CONTORNO, 1.0);
			return;
		}
		case 'aviador': {
			// Gota, armação fina de metal, lente escura
			const metal = '#c7cdd6';
			haste(ctx, xe - 2.6, -42.0, -9.4, -41.6, metal, 0.45);
			haste(ctx, xd + 2.6, -42.0, 9.6, -41.6, metal, 0.45);
			OLHOS.x.forEach((x, i) => {
				const o = i === 0 ? -1 : 1;
				const f = () => {
					ctx.moveTo(x - o * 2.2, -42.2);
					curvas(ctx, [x + o * 0.2, -42.9, x + o * 2.6, -42.4, x + o * 3.0, -40.2, x + o * 1.6, -38.6, x + o * 0.2, -37.4, x - o * 1.6, -38.2, x - o * 2.6, -39.6, x - o * 2.2, -42.2]);
					ctx.closePath();
				};
				pintar(ctx, f, '#39424f', () => traco(ctx, x - 1.1, -41.6, x - 0.2, -40.4, 'rgba(255,255,255,0.55)', 0.6), 1.0);
				ctx.beginPath();
				f();
				contornar(ctx, 0.4, metal);
			});
			haste(ctx, xe + 2.2, -42.4, xd - 2.2, -42.4, metal, 0.45);
			return;
		}
		case 'solQuadrado': {
			// Escuros grandes e quadrados, armação grossa, haste clara (ref. 14)
			haste(ctx, xe - 3.0, -42.2, -9.6, -42.6, '#f4f4f2', 0.8);
			haste(ctx, xd + 3.0, -42.2, 9.8, -42.6, '#f4f4f2', 0.8);
			for (const x of OLHOS.x) {
				pintar(ctx, caixa(ctx, x - 3.0, -43.2, 6.0, 4.6, 1.2), '#15171d', undefined, 1.0);
				forma(ctx, caixa(ctx, x - 2.3, -42.5, 4.6, 3.2, 0.8), '#2b313d', 0);
				traco(ctx, x - 1.6, -41.8, x - 0.6, -40.6, 'rgba(255,255,255,0.5)', 0.6);
			}
			traco(ctx, xe + 3.0, -41.8, xd - 3.0, -41.8, '#15171d', 1.3);
			return;
		}
		case 'tartaruga': {
			// Armação grossa arredondada de tartaruga: marrom com pintinhas escuras, lente clara (ref. 39)
			const aro = '#a8692f';
			const pinta = '#5a3418';
			haste(ctx, xe - 3.0, -41.4, -9.4, -41.6, aro, 0.6);
			haste(ctx, xd + 3.0, -41.4, 9.6, -41.6, aro, 0.6);
			for (const x of [xe, xd]) {
				ctx.beginPath();
				ctx.roundRect(x - 2.9, -42.9, 5.8, 4.8, 2.1);
				ctx.fillStyle = LENTE_CLARA;
				ctx.fill();
				contornar(ctx, 2.2);
				contornar(ctx, 1.15, aro);
				// O mesclado da tartaruga: manchas escuras desiguais ao longo do aro
				ctx.save();
				ctx.setLineDash([1.1, 0.9, 0.5, 1.6]);
				ctx.lineDashOffset = x;
				contornar(ctx, 1.15, pinta);
				ctx.restore();
				traco(ctx, x - 1.5, -41.8, x - 0.7, -40.8, 'rgba(255,255,255,0.55)', 0.55);
			}
			ctx.beginPath();
			ctx.moveTo(xe + 2.9, -41.3);
			ctx.quadraticCurveTo(0.5, -42.2, xd - 2.9, -41.3);
			contornar(ctx, 1.9);
			contornar(ctx, 0.9, aro);
			return;
		}
		case 'lenteColorida': {
			// Aviador grande, armação e lente translúcida na cor de destaque (laranja na dálmata, ref. 35)
			const cor = extraOu(q, '#e8862a');
			const aro = tom(cor, 0.78);
			haste(ctx, xe - 3.0, -42.4, -9.4, -41.8, aro, 0.55);
			haste(ctx, xd + 3.0, -42.4, 9.6, -41.8, aro, 0.55);
			OLHOS.x.forEach((x, i) => {
				const o = i === 0 ? -1 : 1;
				const f = () => {
					ctx.moveTo(x - o * 2.5, -42.7);
					curvas(ctx, [x + o * 0.2, -43.5, x + o * 2.9, -42.9, x + o * 3.4, -40.4, x + o * 1.8, -38.4, x + o * 0.2, -37.0, x - o * 1.8, -37.9, x - o * 2.9, -39.5, x - o * 2.5, -42.7]);
					ctx.closePath();
				};
				ctx.globalAlpha = 0.6;
				ctx.beginPath();
				f();
				ctx.fillStyle = cor;
				ctx.fill();
				ctx.globalAlpha = 1;
				ctx.beginPath();
				f();
				contornar(ctx, 1.7);
				contornar(ctx, 0.75, aro);
				traco(ctx, x - 1.4, -41.8, x - 0.4, -40.4, 'rgba(255,255,255,0.6)', 0.6);
			});
			// A barra dupla do aviador
			haste(ctx, xe + 2.5, -42.9, xd - 2.5, -42.9, aro, 0.5);
			haste(ctx, xe + 2.7, -41.4, xd - 2.7, -41.4, aro, 0.45);
			return;
		}
		case 'solRedondo': {
			// Redondo pequeno, lente escura, armação dourada fina (ref. 54)
			const ouro = '#d0a94e';
			haste(ctx, xe - 2.4, -40.9, -9.4, -41.4, ouro, 0.45);
			haste(ctx, xd + 2.4, -40.9, 9.6, -41.4, ouro, 0.45);
			for (const x of [xe, xd]) {
				ctx.beginPath();
				ctx.arc(x, -40.5, 2.4, 0, PI2);
				ctx.fillStyle = '#262a35';
				ctx.fill();
				contornar(ctx, 1.25);
				contornar(ctx, 0.55, ouro);
				ctx.beginPath();
				ctx.arc(x, -40.5, 1.5, Math.PI * 1.1, Math.PI * 1.45);
				contornar(ctx, 0.55, 'rgba(255,255,255,0.6)');
			}
			ctx.beginPath();
			ctx.moveTo(xe + 2.4, -40.9);
			ctx.quadraticCurveTo(0.5, -41.9, xd - 2.4, -40.9);
			contornar(ctx, 1.1);
			contornar(ctx, 0.5, ouro);
			return;
		}
		case 'visor': {
			// Faixa futurista de um lado a outro, translúcida
			const luz = extraOu(q, '#22c7e0');
			const f = caixa(ctx, -9.6, -43.2, 19.8, 4.8, 2.4);
			ctx.globalAlpha = 0.55;
			ctx.beginPath();
			f();
			ctx.fillStyle = luz;
			ctx.fill();
			ctx.globalAlpha = 1;
			ctx.save();
			ctx.beginPath();
			f();
			ctx.clip();
			const xs = -8 + ((q.t * 5) % 16);
			traco(ctx, xs, -43, xs + 0.9, -38.6, 'rgba(255,255,255,0.45)', 0.8);
			traco(ctx, -8.2, -42.2, 6.4, -42.2, 'rgba(255,255,255,0.6)', 0.6);
			ctx.restore();
			ctx.beginPath();
			f();
			contornar(ctx, 0.9);
			return;
		}
	}
}

// ================================================================== chapéus

/** Contorno do chapéu de feltro (deslocado dx: 0,4 de frente, 0 de costas). */
function fedora(ctx: C, q: Quadro, dx: number) {
	const cor = extraOu(q, '#6b6f78');
	pintar(ctx, oval(ctx, dx, -47.2, 12.4, 2.6, -0.03), cor, () => sombra(ctx, dx + 4.4));
	const copa = () => {
		ctx.moveTo(dx - 7.0, -47.8);
		ctx.lineTo(dx - 6.4, -54.6);
		curvas(ctx, [dx - 6.2, -57.2, dx - 3.0, -57.4, dx - 1.0, -57.4, dx + 0.2, -56.0, dx + 1.4, -57.4, dx + 3.4, -57.4, dx + 6.6, -57.2, dx + 6.6, -54.4]);
		ctx.lineTo(dx + 7.2, -47.8);
		ctx.quadraticCurveTo(dx, -46.2, dx - 7.0, -47.8);
		ctx.closePath();
	};
	pintar(ctx, copa, cor, () => {
		// Fita mais escura
		ctx.beginPath();
		ctx.moveTo(dx - 8, -50.6);
		ctx.quadraticCurveTo(dx, -49.2, dx + 8, -50.6);
		ctx.lineTo(dx + 8, -45);
		ctx.lineTo(dx - 8, -45);
		ctx.fillStyle = tom(cor, 0.55);
		ctx.fill();
		sombra(ctx, dx + 3.4);
	});
	traco(ctx, dx + 0.2, -55.8, dx, -53.4, tom(cor, 0.7), 0.6);
	traco(ctx, dx - 4.8, -55.0, dx - 5.0, -51.6, tom(cor, 1.35), 0.8);
}

function cartola(ctx: C, q: Quadro) {
	const cor = extraOu(q, '#1c1f26');
	// A fita: a cor da roupa quando ela aparece no chapéu escuro (o vinho do smoking)
	const fita = luzDe(cor) < 60 ? (luzDe(q.roupa) > luzDe(cor) + 20 ? q.roupa : '#7d2337') : tom(cor, 0.6);
	pintar(ctx, oval(ctx, 0.4, -48.8, 10.4, 2.2), cor, () => sombra(ctx, 4.6));
	const copa = () => {
		ctx.moveTo(-6.0, -49.2);
		ctx.lineTo(-6.5, -59.4);
		ctx.quadraticCurveTo(0.4, -58.0, 7.3, -59.4);
		ctx.lineTo(6.8, -49.2);
		ctx.quadraticCurveTo(0.4, -47.8, -6.0, -49.2);
		ctx.closePath();
	};
	pintar(ctx, copa, cor, () => {
		ctx.beginPath();
		ctx.moveTo(-7, -52.4);
		ctx.quadraticCurveTo(0.4, -51.0, 8, -52.4);
		ctx.lineTo(8, -46);
		ctx.lineTo(-7, -46);
		ctx.fillStyle = fita;
		ctx.fill();
		sombra(ctx, 3.6);
	});
	pintar(ctx, oval(ctx, 0.4, -59.4, 6.9, 1.5), tom(cor, luzDe(cor) < 60 ? 1.25 : 1.1), undefined, LW);
	traco(ctx, -4.6, -57.4, -4.4, -53.2, tom(cor, luzDe(cor) < 60 ? 1.7 : 1.35), 0.9);
}

function bone(ctx: C, q: Quadro, deFrente: boolean) {
	const cor = extraOu(q, '#d93a3a');
	const domo = () => {
		ctx.moveTo(-10.4, -44.6);
		curvas(ctx, [-11.2, -54.6, 0.2, -54.8, 11.4, -54.6, 10.8, -45.4, 0.4, -46.2, -10.4, -44.6]);
		ctx.closePath();
	};
	pintar(ctx, domo, cor, () => {
		sombra(ctx, 4.6);
		const c = tom(cor, 0.72);
		linha(ctx, [0.4, -54.4, 0.8, -50.2, 0.8, -46.0], c, 0.55);
		linha(ctx, [-5.4, -53.6, -6.6, -50.0, -6.4, -45.4], c, 0.55);
		linha(ctx, [6.2, -53.6, 7.4, -50.0, 7.0, -45.8], c, 0.55);
		if (!deFrente) {
			// O fecho de trás
			forma(ctx, () => ctx.ellipse(0, -45.2, 2.6, 2.0, 0, Math.PI, PI2), q.cabelo, 0.6);
			forma(ctx, caixa(ctx, -3.2, -46.0, 6.4, 1.2, 0.5), tom(cor, 0.7), 0.5);
		}
	});
	forma(ctx, oval(ctx, 0.4, -54.7, 0.95, 0.75), tom(cor, 0.82), 0.5);
	traco(ctx, -6.6, -51.6, -3.6, -53.6, tom(cor, 1.35), 0.8);
	if (!deFrente) return;
	// Aba para a frente, levemente de lado (ref. 14)
	pintar(ctx, () => {
		ctx.moveTo(-4.6, -45.8);
		curvas(ctx, [4.6, -46.8, 10.8, -45.6, 15.2, -45.2, 14.6, -43.6, 5.4, -43.6, -4.6, -45.8]);
		ctx.closePath();
	}, tom(cor, 0.86), () => sombra(ctx, 9));
}

function gorro(ctx: C, q: Quadro) {
	const cor = extraOu(q, '#e0662a');
	pintar(ctx, () => {
		ctx.moveTo(-10.6, -46.6);
		curvas(ctx, [-11.4, -55.8, -0.4, -56.4, 11.4, -55.8, 10.8, -46.8]);
		ctx.closePath();
	}, cor, () => {
		sombra(ctx, 4.6);
		const c = tom(cor, 0.8);
		linha(ctx, [-4.4, -55.0, -5.0, -52.0, -4.8, -49.0], c, 0.55);
		linha(ctx, [3.6, -55.2, 4.2, -52.0, 4.0, -49.0], c, 0.55);
	});
	const dobra = () => {
		ctx.moveTo(-11.2, -49.4);
		ctx.quadraticCurveTo(0.2, -48.2, 11.4, -49.4);
		ctx.lineTo(11.2, -45.6);
		ctx.quadraticCurveTo(0.2, -44.6, -11.0, -45.4);
		ctx.closePath();
	};
	pintar(ctx, dobra, tom(cor, 0.9), () => {
		const c = tom(cor, 0.7);
		for (let x = -9.6; x <= 10; x += 1.9) traco(ctx, x, -48.6, x, -45.4, c, 0.5);
		sombra(ctx, 5);
	});
}

function boina(ctx: C, q: Quadro) {
	const cor = extraOu(q, '#1c1f26');
	const escura = luzDe(cor) < 60;
	pintar(ctx, () => {
		ctx.moveTo(-9.6, -49.6);
		ctx.quadraticCurveTo(-0.2, -48.2, 9.4, -50.6);
		ctx.lineTo(9.2, -48.8);
		ctx.quadraticCurveTo(-0.2, -46.4, -9.4, -47.8);
		ctx.closePath();
	}, tom(cor, escura ? 1.2 : 0.82));
	pintar(ctx, oval(ctx, -1.4, -51.8, 10.6, 3.8, -0.16), cor, () => sombra(ctx, 3.6));
	forma(ctx, oval(ctx, -1.1, -55.8, 0.7, 1.0), cor, 0.6);
	linha(ctx, [-8.4, -51.2, -6.4, -54.2, -2.0, -54.8], tom(cor, escura ? 1.7 : 1.3), 0.8);
}

function capuz(ctx: C, q: Quadro, deFrente: boolean) {
	const cor = extraOu(q, q.roupa);
	if (!deFrente) {
		const f = () => {
			ctx.moveTo(-11.4, -30.6);
			curvas(ctx, [-13.6, -44.0, -9.6, -51.8, 0, -58.2, 9.6, -51.8, 13.6, -44, 11.4, -30.6, 0, -27.6, -11.4, -30.6]);
			ctx.closePath();
		};
		pintar(ctx, f, cor, () => {
			sombra(ctx, 4.6);
			traco(ctx, 0, -57.4, 0, -31, tom(cor, luzDe(cor) < 60 ? 1.5 : 0.7), 0.55);
		});
		return;
	}
	const fora = () => {
		ctx.moveTo(-11.4, -30.2);
		curvas(ctx, [-13.6, -44.0, -9.8, -51.8, -0.2, -58.4, 10.2, -51.6, 13.8, -44.0, 11.8, -30.2, 0.6, -27.4, -11.4, -30.2]);
		ctx.closePath();
	};
	const furo = () => {
		ctx.moveTo(0.6 + 8.8, -40.0);
		ctx.ellipse(0.6, -40.0, 8.8, 9.5, 0, 0, PI2);
	};
	// Forro escuro no alto da abertura, por cima da testa
	ctx.save();
	ctx.beginPath();
	furo();
	ctx.clip();
	forma(ctx, oval(ctx, 0.6, -51.2, 10, 3.6), tom(cor, 0.5), 0);
	ctx.restore();
	ctx.beginPath();
	fora();
	furo();
	ctx.fillStyle = cor;
	ctx.fill('evenodd');
	ctx.save();
	ctx.beginPath();
	fora();
	furo();
	ctx.clip('evenodd');
	sombra(ctx, 5.6);
	traco(ctx, 0.2, -57.6, 0.5, -50, tom(cor, luzDe(cor) < 60 ? 1.5 : 0.7), 0.55);
	ctx.restore();
	ctx.beginPath();
	fora();
	furo();
	contornar(ctx);
}

function laco(ctx: C, q: Quadro) {
	const cor = extraOu(q, '#e6d3b3');
	const dobra = tom(cor, 0.78);
	// Pontas caindo para a direita, atrás das alças
	for (const [x1, y1] of [
		[7.4, -46.6],
		[10.4, -49.0]
	] as const) {
		pintar(ctx, () => {
			ctx.moveTo(1.0, -53.6);
			ctx.quadraticCurveTo(x1 - 2.4, -52.2, x1 - 1.0, y1);
			ctx.lineTo(x1 + 0.2, y1 - 1.0);
			ctx.lineTo(x1 + 1.4, y1 + 0.2);
			ctx.quadraticCurveTo(x1 - 0.6, -53.4, 2.4, -54.6);
			ctx.closePath();
		}, dobra, undefined, 0.8);
	}
	const alca = (s: number) => () => {
		ctx.moveTo(1.4, -53.2);
		ctx.bezierCurveTo(1.4 + s * 2.8, -59.0, 1.4 + s * 9.0, -57.8, 1.4 + s * 7.8, -52.6);
		ctx.bezierCurveTo(1.4 + s * 6.8, -50.0, 1.4 + s * 3.2, -51.2, 1.4, -53.2);
		ctx.closePath();
	};
	pintar(ctx, alca(-1), cor);
	pintar(ctx, alca(1), cor, () => sombra(ctx, 5));
	for (const s of [-1, 1]) linha(ctx, [1.4 + s * 1.4, -53.4, 1.4 + s * 3.4, -54.6, 1.4 + s * 5.2, -54.2], dobra, 0.55);
	forma(ctx, oval(ctx, 1.4, -53.0, 1.5, 1.7), dobra, 0.8);
}

function tiara(ctx: C, q: Quadro, deFrente: boolean) {
	const cor = extraOu(q, DOURADO);
	ctx.beginPath();
	if (deFrente) {
		ctx.moveTo(-9.8, -45.6);
		curvas(ctx, [-4.8, -47.8, 0.6, -46.6, 5.8, -47.8, 10.0, -46.0]);
	} else {
		ctx.moveTo(-9.8, -45.8);
		ctx.quadraticCurveTo(0, -44.4, 9.8, -45.8);
	}
	contornar(ctx, 1.9);
	contornar(ctx, 0.95, cor);
	if (!deFrente) return;
	// A pedrinha na testa, entre as sobrancelhas
	pintar(ctx, () => {
		ctx.moveTo(0.6, -47.9);
		ctx.lineTo(1.6, -46.3);
		ctx.lineTo(0.6, -44.7);
		ctx.lineTo(-0.4, -46.3);
		ctx.closePath();
	}, '#3fbf9f', undefined, 0.5);
	ponto(ctx, 0.3, -46.8, 0.35, '#ffffff');
}

function fone(ctx: C, q: Quadro) {
	const cor = extraOu(q, '#22c7e0');
	const arco = '#2a2d35';
	ctx.beginPath();
	ctx.moveTo(-10.4, -41.0);
	ctx.bezierCurveTo(-11.6, -59.6, 11.8, -59.6, 10.6, -41.4);
	contornar(ctx, 2.9);
	contornar(ctx, 1.7, arco);
	for (const s of [-1, 1]) {
		const x = 0.1 + s * 10.4;
		const y = -39.8;
		forma(ctx, oval(ctx, x, y, 2.4, 3.2), arco);
		forma(ctx, oval(ctx, x + s * 0.9, y, 1.8, 2.6), cor, 0.8);
		ponto(ctx, x + s * 0.5, y - 1.1, 0.5, tom(cor, 1.5));
	}
}

function bandana(ctx: C, q: Quadro, deFrente: boolean) {
	const cor = extraOu(q, '#d93a3a');
	const sobe = q.feminino ? 0.6 : 0;
	if (deFrente) {
		pintar(ctx, () => {
			ctx.moveTo(-9.2, -48.6 - sobe);
			ctx.quadraticCurveTo(0.4, -49.4 - sobe, 9.8, -48.8 - sobe);
			ctx.lineTo(10.4, -45.4 - sobe);
			ctx.quadraticCurveTo(0.4, -44.6 - sobe, -10.0, -45.0 - sobe);
			ctx.closePath();
		}, cor, () => {
			sombra(ctx, 5.2);
			traco(ctx, -8.6, -47.0 - sobe, 9.6, -47.2 - sobe, tom(cor, 0.78), 0.5);
		});
		return;
	}
	pintar(ctx, () => {
		ctx.moveTo(-9.8, -48.8 - sobe);
		ctx.quadraticCurveTo(0, -48.0 - sobe, 9.8, -48.8 - sobe);
		ctx.lineTo(10.0, -45.4 - sobe);
		ctx.quadraticCurveTo(0, -44.4 - sobe, -10.0, -45.4 - sobe);
		ctx.closePath();
	}, cor, () => sombra(ctx, 5));
	const balanca = Math.sin(q.t * 3) * 0.5 + (q.andando ? Math.sin(q.fase * 2) * 0.7 : 0);
	pontasDoNo(ctx, cor, 0.2, -46.8 - sobe, balanca, 6.6);
}

/** O nó atrás da cabeça (faixa, máscara ninja), com as duas pontas caindo. */
function pontasDoNo(ctx: C, cor: string, x: number, y: number, balanca: number, comprido: number) {
	pintar(ctx, capsula(ctx, x - 0.3, y + 0.4, x - 2.0 + balanca, y + comprido, 1.4), cor, undefined, 0.7);
	pintar(ctx, capsula(ctx, x + 0.3, y + 0.4, x + 2.2 + balanca, y + comprido - 0.8, 1.4), cor, undefined, 0.7);
	forma(ctx, oval(ctx, x, y, 1.6, 1.3), tom(cor, 0.85), 0.7);
}

/** De frente, as pontas da faixa aparecem esvoaçando atrás da cabeça. */
function pontasDaBandana(ctx: C, q: Quadro) {
	const cor = extraOu(q, '#d93a3a');
	const sobe = q.feminino ? 0.6 : 0;
	const b = Math.sin(q.t * 3) * 0.5 + (q.andando ? Math.sin(q.fase * 2) * 0.8 : 0);
	pintar(ctx, () => {
		ctx.moveTo(-8.6, -48.0 - sobe);
		ctx.quadraticCurveTo(-12.4, -49.8 + b - sobe, -15.0, -47.8 + b - sobe);
		ctx.lineTo(-14.4, -46.2 + b - sobe);
		ctx.quadraticCurveTo(-12.0, -46.8 - sobe, -8.8, -46.0 - sobe);
		ctx.closePath();
	}, cor, undefined, 0.8);
	pintar(ctx, () => {
		ctx.moveTo(-8.8, -47.2 - sobe);
		ctx.quadraticCurveTo(-11.6, -45.2 + b * 0.6 - sobe, -13.6, -42.6 + b * 0.6 - sobe);
		ctx.lineTo(-12.2, -42.0 + b * 0.6 - sobe);
		ctx.quadraticCurveTo(-10.8, -44.6 - sobe, -8.6, -45.6 - sobe);
		ctx.closePath();
	}, tom(cor, 0.85), undefined, 0.8);
}

/** Estrelinha de quatro pontas. */
function estrela(ctx: C, x: number, y: number, r: number, cor: string) {
	ctx.beginPath();
	for (let i = 0; i < 8; i++) {
		const a = (i * Math.PI) / 4 - Math.PI / 2;
		const d = i % 2 ? r * 0.38 : r;
		if (i) ctx.lineTo(x + d * Math.cos(a), y + d * Math.sin(a));
		else ctx.moveTo(x + d * Math.cos(a), y + d * Math.sin(a));
	}
	ctx.closePath();
	ctx.fillStyle = cor;
	ctx.fill();
}

function chapeuMago(ctx: C, q: Quadro) {
	const cor = extraOu(q, '#2f4a9a');
	const escuro = luzDe(cor) < 55;
	// Chapéu escuro (feiticeira) ganha fita na cor da roupa; o claro (mago), estrelinhas
	const fita = escuro && luzDe(q.roupa) > luzDe(cor) + 12 ? q.roupa : tom(cor, 0.68);
	pintar(ctx, oval(ctx, 0.4, -48.4, 13.0, 2.8), cor, () => sombra(ctx, 4.8));
	const cone = () => {
		ctx.moveTo(-7.0, -49.0);
		curvas(ctx, [-3.8, -55.2, 0.6, -60.4, 4.4, -61.6, 7.6, -58.0, 3.8, -57.6, 3.0, -55.4, 4.0, -51.6, 7.6, -49.0, 0.4, -47.6, -7.0, -49.0]);
		ctx.closePath();
	};
	pintar(ctx, cone, cor, () => {
		ctx.beginPath();
		ctx.moveTo(-8, -51.8);
		ctx.quadraticCurveTo(0.4, -50.4, 8.6, -51.8);
		ctx.lineTo(9, -46);
		ctx.lineTo(-8, -46);
		ctx.fillStyle = fita;
		ctx.fill();
		sombra(ctx, 3.2);
	});
	if (!escuro) {
		estrela(ctx, -2.6, -55.4, 1.3, DOURADO);
		estrela(ctx, 1.4, -58.0, 0.95, DOURADO);
		estrela(ctx, 1.6, -53.4, 0.8, DOURADO);
	} else forma(ctx, caixa(ctx, -1.0, -51.6, 2.4, 2.0, 0.4), DOURADO, 0.55);
	traco(ctx, -4.6, -53.4, -2.4, -56.8, tom(cor, escuro ? 1.6 : 1.35), 0.8);
}

function aureola(ctx: C, q: Quadro) {
	const cor = extraOu(q, '#f2c230');
	const y = -58.4 + Math.sin(q.t * 2) * 0.6;
	ctx.globalAlpha = 0.2;
	ctx.beginPath();
	ctx.ellipse(0.4, y, 7.8, 3.0, 0, 0, PI2);
	ctx.fillStyle = cor;
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.beginPath();
	ctx.ellipse(0.4, y, 6.2, 1.7, 0, 0, PI2);
	contornar(ctx, 2.6);
	contornar(ctx, 1.5, cor);
	ctx.beginPath();
	ctx.ellipse(0.4, y, 6.2, 1.7, 0, Math.PI * 1.05, Math.PI * 1.45);
	contornar(ctx, 0.6, tom(cor, 1.5));
}

// --- segunda rodada

/** Chapéu de abas largas, tipo panamá (ref. 48): aba até x ±15 com as pontas viradas para cima, copa com vinco. */
function abaLarga(ctx: C, q: Quadro, deFrente: boolean) {
	const cor = extraOu(q, '#e9e1cf');
	const dx = deFrente ? 0.4 : 0;
	const escuro = luzDe(cor) < 70;
	// A aba: a borda da frente desce no meio; a de trás some atrás da copa
	const aba = () => {
		ctx.moveTo(dx - 15.2, -50.4);
		curvas(ctx, [dx - 12.6, -46.8, dx - 6.0, -46.0, dx, -45.2, dx + 6.0, -46.0, dx + 12.6, -46.8, dx + 15.2, -50.6]);
		curvas(ctx, [dx + 12.0, -51.4, dx + 6.0, -51.6, dx, -51.8, dx - 6.0, -51.6, dx - 12.0, -51.4, dx - 15.2, -50.4]);
		ctx.closePath();
	};
	pintar(ctx, aba, cor, () => {
		sombra(ctx, dx + 5.6);
		// A volta da aba subindo (a ponta virada)
		linha(ctx, [dx - 13.4, -49.6, dx - 7.0, -47.4, dx, -46.8], tom(cor, escuro ? 1.4 : 0.82), 0.5);
	});
	const copa = () => {
		ctx.moveTo(dx - 7.2, -48.6);
		ctx.lineTo(dx - 6.8, -55.2);
		curvas(ctx, [dx - 6.6, -58.0, dx - 3.4, -58.0, dx - 1.2, -58.0, dx + 0.4, -56.8, dx + 2.0, -58.0, dx + 4.2, -58.0, dx + 7.6, -58.0, dx + 7.6, -55.0]);
		ctx.lineTo(dx + 8.0, -48.6);
		curvas(ctx, [dx + 0.4, -47.0, dx - 7.2, -48.6]);
		ctx.closePath();
	};
	pintar(ctx, copa, cor, () => {
		// Fita mais escura na base da copa
		ctx.beginPath();
		ctx.moveTo(dx - 8, -51.4);
		ctx.quadraticCurveTo(dx + 0.4, -49.8, dx + 9, -51.4);
		ctx.lineTo(dx + 9, -46);
		ctx.lineTo(dx - 8, -46);
		ctx.fillStyle = escuro ? tom(cor, 1.5) : tom(cor, 0.58);
		ctx.fill();
		sombra(ctx, dx + 3.6);
	});
	traco(ctx, dx + 0.4, -56.6, dx + 0.2, -53.6, tom(cor, escuro ? 1.4 : 0.72), 0.6);
	traco(ctx, dx - 5.0, -55.4, dx - 5.2, -52.0, tom(cor, escuro ? 1.6 : 1.3), 0.8);
}

/**
 * Chapéu de palha cônico, baixo e bem largo (ref. 32), com a trama em raios e o
 * cordão no queixo. Sem símbolo. A ponta sobe o bastante para cobrir o coque.
 */
function chapeuPalha(ctx: C, q: Quadro, deFrente: boolean) {
	const cor = extraOu(q, '#d9b56a');
	const dx = deFrente ? 0.4 : 0;
	const trama = tom(cor, 0.72);
	if (deFrente) {
		// O cordão sai de baixo da aba e passa embaixo do queixo
		for (const s of [-1, 1]) linha(ctx, [dx + s * 7.8, -45.8, dx + s * 7.2, -35.2, 0.6, -30.8], tom(cor, 0.45), 0.55);
	}
	const cone = () => {
		ctx.moveTo(dx - 15.4, -47.4);
		curvas(ctx, [dx - 7.6, -55.2, dx, -58.2, dx + 7.6, -55.2, dx + 15.4, -47.4]);
		curvas(ctx, [dx, -44.0, dx - 15.4, -47.4]);
		ctx.closePath();
	};
	pintar(ctx, cone, cor, () => {
		for (const x of [-11.0, -5.8, -0.8, 4.4, 9.6]) traco(ctx, dx, -57.4, dx + x, -45.2, trama, 0.5);
		linha(ctx, [dx - 9.6, -51.0, dx, -49.4, dx + 9.6, -51.0], trama, 0.5);
		linha(ctx, [dx - 4.6, -55.0, dx, -54.2, dx + 4.6, -55.0], trama, 0.45);
		sombra(ctx, dx + 4.8);
	});
	linha(ctx, [dx - 11.8, -48.4, dx - 6.6, -52.4, dx - 2.4, -55.8], tom(cor, 1.35), 0.8);
}

/**
 * Cachorro de lenço: a ponta das orelhas caídas sai por baixo do lenço, dos lados
 * do queixo (recortada fora do contorno `lenco`, para parecer que está por baixo).
 */
function pontasDasOrelhas(ctx: C, q: Quadro, lenco: () => void) {
	const b = q.bicho;
	if (b?.forma !== 'cachorro') return;
	ctx.save();
	ctx.beginPath();
	ctx.rect(-30, -80, 60, 100);
	lenco();
	ctx.clip('evenodd');
	for (const s of [-1, 1]) {
		const x = (v: number) => s * v + (s > 0 && q.deFrente ? 0.6 : 0);
		pintar(ctx, () => {
			ctx.moveTo(x(7.4), -36.6);
			curvas(ctx, [x(11.6), -37.4, x(11.4), -33.0, x(11.0), -30.4, x(9.0), -30.8, x(7.6), -31.8, x(7.4), -36.6]);
			ctx.closePath();
		}, b.id === 'dalmata' ? b.pelo : tom(b.pelo, 0.88), s > 0 ? () => sombra(ctx, x(9.6)) : undefined);
		if (b.id === 'dalmata') forma(ctx, oval(ctx, x(9.6), -32.4, 0.8, 0.65), b.escuro, 0);
	}
	ctx.restore();
}

/**
 * Lenço de seda (ref. 35): cobre o alto e os lados da cabeça e amarra embaixo do
 * queixo, com o nó e as pontas no peito. Barrado na cor de destaque, miolo
 * claro com estampinha. Na dálmata, a ponta das orelhas caídas sai por baixo.
 */
function lencoCabeca(ctx: C, q: Quadro, deFrente: boolean) {
	const barra = extraOu(q, '#e8862a');
	const miolo = '#f6efe2';
	const estampa = tom(barra, 0.72);
	const pintinhas = (lista: readonly (readonly [number, number])[]) => {
		for (const [x, y] of lista) {
			ponto(ctx, x, y, 0.55, estampa);
			ponto(ctx, x + 0.9, y + 0.7, 0.32, tom(barra, 0.5));
		}
	};
	if (!deFrente) {
		// Por trás: cobre a cabeça e faz a ponta do triângulo na nuca
		const f = () => {
			ctx.moveTo(-11.6, -38.4);
			curvas(ctx, [-12.4, -53.8, 0, -54.0, 12.4, -53.8, 11.6, -38.4, 8.6, -33.6, 0, -29.4, -8.6, -33.6, -11.6, -38.4]);
			ctx.closePath();
		};
		pintar(ctx, f, miolo, () => {
			pintinhas([
				[-6.0, -48.4],
				[2.4, -51.0],
				[6.6, -45.6],
				[-4.0, -41.0],
				[3.0, -38.6],
				[-1.0, -46.2]
			]);
			ctx.beginPath();
			f();
			contornar(ctx, 2.6, barra);
			linha(ctx, [0, -52.0, 0.4, -42.0, 0, -31.6], tom(miolo, 0.85), 0.6);
			sombra(ctx, 5.4);
		});
		pontasDasOrelhas(ctx, q, f);
		return;
	}
	const fora = () => {
		ctx.moveTo(0.6, -30.6);
		curvas(ctx, [-6.0, -31.0, -9.6, -35.4, -11.4, -40.2, -11.0, -46.0, -10.2, -53.0, 0.4, -53.4, 10.8, -53.0, 11.8, -46.0, 12.4, -40.2, 10.4, -35.2, 7.0, -31.0, 0.6, -30.6]);
		ctx.closePath();
	};
	// A abertura do rosto: da testa (acima da sobrancelha) ao queixo
	const furo = () => {
		ctx.moveTo(0.6, -47.6);
		ctx.bezierCurveTo(-5.8, -47.6, -9.0, -44.6, -8.8, -39.4);
		ctx.bezierCurveTo(-8.6, -34.2, -4.2, -30.9, 0.6, -30.9);
		ctx.bezierCurveTo(5.4, -30.9, 9.8, -34.2, 9.8, -39.4);
		ctx.bezierCurveTo(10.0, -44.6, 6.8, -47.6, 0.6, -47.6);
		ctx.closePath();
	};
	const f = () => {
		fora();
		furo();
	};
	pintar(
		ctx,
		f,
		miolo,
		() => {
			pintinhas([
				[-5.6, -51.0],
				[-1.4, -52.0],
				[3.4, -51.4],
				[7.4, -50.2],
				[-9.8, -44.0],
				[10.6, -43.6]
			]);
			// O barrado: na beira do rosto e na beira de fora
			ctx.beginPath();
			furo();
			contornar(ctx, 2.6, barra);
			ctx.beginPath();
			fora();
			contornar(ctx, 1.7, barra);
			sombra(ctx, 6.0);
		},
		LW,
		'evenodd'
	);
	pontasDasOrelhas(ctx, q, fora);
	// O nó embaixo do queixo e as duas pontas caindo no peito
	pintar(ctx, () => {
		ctx.moveTo(-0.2, -30.8);
		ctx.lineTo(-3.6, -26.4);
		ctx.lineTo(-1.6, -25.4);
		ctx.lineTo(1.0, -29.8);
		ctx.closePath();
	}, barra, undefined, 0.75);
	pintar(ctx, () => {
		ctx.moveTo(1.2, -30.8);
		ctx.lineTo(5.2, -27.0);
		ctx.lineTo(3.4, -25.8);
		ctx.lineTo(0.4, -29.6);
		ctx.closePath();
	}, tom(barra, 0.88), undefined, 0.75);
	forma(ctx, oval(ctx, 0.6, -30.4, 1.9, 1.4), miolo, 0.75);
	ponto(ctx, 0.4, -30.6, 0.5, estampa);
}

/** Florzinha de cinco pétalas (o enfeite do chapéu da dama). */
function flor(ctx: C, x: number, y: number, r: number, petala: string, miolo: string) {
	const f = () => {
		for (let i = 0; i < 5; i++) {
			const a = (i / 5) * PI2 - Math.PI / 2;
			const px = x + Math.cos(a) * r * 0.55;
			const py = y + Math.sin(a) * r * 0.55;
			ctx.moveTo(px + r * 0.5, py);
			ctx.arc(px, py, r * 0.5, 0, PI2);
		}
	};
	// Só o contorno de fora (como a nuvem de cachos)
	ctx.beginPath();
	f();
	contornar(ctx, 1.1);
	ctx.beginPath();
	f();
	ctx.fillStyle = petala;
	ctx.fill();
	ponto(ctx, x, y, r * 0.3, miolo);
}

/**
 * Chapéu de senhora elegante (ref. 49): copa baixa, aba curta virada para cima e
 * uma flor de lado. Na cor da roupa (o conjunto), ou na de destaque.
 */
function chapeuFlor(ctx: C, q: Quadro, deFrente: boolean) {
	const cor = extraOu(q, q.roupa);
	const dx = deFrente ? 0.4 : 0;
	const escuro = luzDe(cor) < 70;
	// A aba de trás aparece dos lados da copa
	pintar(ctx, oval(ctx, dx, -49.6, 11.0, 2.2), tom(cor, 0.86), () => sombra(ctx, dx + 4.6));
	const copa = () => {
		ctx.moveTo(dx - 7.0, -48.8);
		ctx.lineTo(dx - 7.4, -54.6);
		curvas(ctx, [dx - 7.4, -56.5, dx - 4.6, -56.6, dx, -57.1, dx + 4.6, -56.6, dx + 7.8, -56.5, dx + 7.8, -54.6]);
		ctx.lineTo(dx + 7.6, -48.8);
		curvas(ctx, [dx, -47.4, dx - 7.0, -48.8]);
		ctx.closePath();
	};
	pintar(ctx, copa, cor, () => {
		// O alto da copa, chato e um pouco mais claro
		forma(ctx, oval(ctx, dx + 0.2, -57.1, 7.6, 1.6), tom(cor, escuro ? 1.25 : 1.12), 0);
		// A fita
		ctx.beginPath();
		ctx.moveTo(dx - 8, -52.6);
		ctx.quadraticCurveTo(dx, -51.2, dx + 8.4, -52.6);
		ctx.lineTo(dx + 8.4, -46);
		ctx.lineTo(dx - 8, -46);
		ctx.fillStyle = escuro ? tom(cor, 1.45) : tom(cor, 0.62);
		ctx.fill();
		sombra(ctx, dx + 3.8);
	});
	// A aba da frente, virada para cima
	const aba = () => {
		ctx.moveTo(dx - 11.4, -49.2);
		curvas(ctx, [dx, -44.8, dx + 11.4, -49.4]);
		ctx.lineTo(dx + 11.0, -51.0);
		curvas(ctx, [dx, -47.6, dx - 11.0, -50.8]);
		ctx.closePath();
	};
	pintar(ctx, aba, cor, () => sombra(ctx, dx + 5.6));
	linha(ctx, [dx - 9.4, -50.0, dx - 3.0, -48.4, dx + 2.0, -48.4], tom(cor, escuro ? 1.6 : 1.3), 0.6);
	// As flores: uma escura e uma clara, de lado (a da esquerda de frente; de costas fica à direita)
	const lado = deFrente ? -1 : 1;
	flor(ctx, dx + lado * 5.6, -52.4, 2.0, escuro ? '#e9c9d6' : '#7b2d52', '#f2d27a');
	flor(ctx, dx + lado * 2.8, -54.4, 1.5, '#f6ebde', '#e0a84a');
}

/** O chapéu ou enfeite escolhido, de frente ou de costas. */
function desenharChapeu(ctx: C, q: Quadro, deFrente: boolean) {
	switch (q.a.chapeu) {
		case 'fedora':
			return fedora(ctx, q, deFrente ? 0.4 : 0);
		case 'cartola':
			return cartola(ctx, q);
		case 'bone':
			return bone(ctx, q, deFrente);
		case 'gorro':
			return gorro(ctx, q);
		case 'boina':
			return boina(ctx, q);
		case 'capuz':
			return capuz(ctx, q, deFrente);
		case 'laco':
			return laco(ctx, q);
		case 'tiara':
			return tiara(ctx, q, deFrente);
		case 'fone':
			return fone(ctx, q);
		case 'bandana':
			return bandana(ctx, q, deFrente);
		case 'chapeuMago':
			return chapeuMago(ctx, q);
		case 'aureola':
			return aureola(ctx, q);
		case 'abaLarga':
			return abaLarga(ctx, q, deFrente);
		case 'chapeuPalha':
			return chapeuPalha(ctx, q, deFrente);
		case 'lencoCabeca':
			return lencoCabeca(ctx, q, deFrente);
		case 'chapeuFlor':
			return chapeuFlor(ctx, q, deFrente);
	}
}

// ================================================================== detalhes

function orelhaPontuda(ctx: C, s: number, pele: string) {
	pintar(ctx, () => {
		ctx.moveTo(s * 9.2, -37.0);
		curvas(ctx, [s * 11.8, -37.6, s * 12.4, -40.8, s * 13.0, -43.6, s * 14.2, -46.6, s * 11.4, -45.4, s * 9.0, -42.8]);
		ctx.closePath();
	}, pele);
	linha(ctx, [s * 10.0, -39.0, s * 11.4, -41.2, s * 12.6, -44.4], tom(pele, 0.78), 0.55);
}

/** Parafuso no lugar da orelha (cabeça de robô). */
function parafuso(ctx: C, x: number, y: number, metal: string) {
	forma(ctx, oval(ctx, x, y, 2.1, 2.1), tom(metal, 0.8));
	forma(ctx, oval(ctx, x, y, 1.1, 1.1), tom(metal, 1.15), 0.6);
	traco(ctx, x - 0.7, y - 0.7, x + 0.7, y + 0.7, tom(metal, 0.6), 0.5);
}

function argolas(ctx: C) {
	for (const x of [-R - 0.1, R + 0.1]) {
		ctx.beginPath();
		ctx.arc(x, CY + 4.8, 1.35, 0, PI2);
		contornar(ctx, 1.45);
		contornar(ctx, 0.75, DOURADO);
	}
}

function chifres(ctx: C) {
	for (const s of [-1, 1]) {
		ctx.save();
		ctx.translate(s < 0 ? -4.8 : 5.6, -50.8);
		ctx.rotate(s * 0.22);
		ctx.scale(s, 1);
		pintar(ctx, () => {
			ctx.moveTo(-1.5, 0.6);
			curvas(ctx, [-0.8, -3.8, 2.4, -6.6, 1.0, -3.0, 1.6, 0.6]);
			ctx.closePath();
		}, '#f2e6c8', s > 0 ? () => sombra(ctx, 0.4) : undefined, 0.9);
		traco(ctx, -0.9, -1.6, 1.2, -1.8, '#cdbf9c', 0.5);
		ctx.restore();
	}
}

function antenas(ctx: C, q: Quadro) {
	const bola = extraOu(q, '#ff6f9a');
	const base = temDetalhe(q, 'cabecaRobo') ? -50.2 : -49.4;
	for (const [i, s] of [
		[0, -1],
		[1, 1]
	] as const) {
		const bx = 0.4 + s * 3.8;
		const balanca = Math.sin(q.t * 2.6 + i * 1.7) * 0.9 + (q.andando ? Math.sin(q.fase + i) * 0.6 : 0);
		const tx = bx + s * 2.4 + balanca;
		const ty = -58.0;
		ctx.beginPath();
		ctx.moveTo(bx, base);
		ctx.quadraticCurveTo(bx + s * 0.4, (base + ty) / 2, tx, ty);
		contornar(ctx, 1.7);
		contornar(ctx, 0.75, '#d7dde6');
		forma(ctx, oval(ctx, bx, base + 0.2, 1.2, 0.7), '#8d99a8', 0.6);
		forma(ctx, oval(ctx, tx, ty, 1.5, 1.5), bola, 0.8);
		ponto(ctx, tx - 0.5, ty - 0.5, 0.45, 'rgba(255,255,255,0.7)');
	}
}

function sardas(ctx: C, pele: string) {
	const c = tom(pele, 0.66);
	for (const [x, y] of [
		[-6.2, -37.6],
		[-5.0, -38.1],
		[-4.4, -37.1],
		[5.4, -37.8],
		[6.6, -38.2],
		[7.2, -37.2],
		[0.0, -38.9],
		[2.0, -38.9]
	] as const)
		ponto(ctx, x, y, 0.38, c);
}

/** Onde os caninos penduram, conforme a boca da expressão. */
function caninos(ctx: C, q: Quadro) {
	const tipo = EXPRESSOES[q.a.rosto]?.boca ?? 'sorriso';
	const pontos: readonly (readonly [number, number])[] =
		tipo === 'meia'
			? [
					[0.6, -34.9],
					[2.8, -35.6]
				]
			: tipo === 'sorriso'
				? [
						[-0.6, -35.6],
						[2.6, -35.6]
					]
				: [
						[0.0, -35.0],
						[2.2, -35.0]
					];
	for (const [x, y] of pontos)
		pintar(ctx, () => {
			ctx.moveTo(x - 0.55, y);
			ctx.lineTo(x + 0.55, y);
			ctx.lineTo(x + 0.05, y + 1.45);
			ctx.closePath();
		}, '#ffffff', undefined, 0.45);
}

function presas(ctx: C) {
	for (const x of [-1.2, 3.2]) {
		pintar(ctx, () => {
			ctx.moveTo(x - 0.8, -33.4);
			curvas(ctx, [x - 0.7, -35.4, x + 0.1, -36.8, x + 0.6, -35.0, x + 0.8, -33.4]);
			ctx.closePath();
		}, '#f4ecd2', undefined, 0.55);
	}
}

/** Máscara de herói tipo dominó, com furo nos olhos; a sobrancelha volta por cima. */
function mascara(ctx: C, q: Quadro) {
	const cor = extraOu(q, '#ff6f00');
	const f = () => {
		ctx.moveTo(-9.4, -42.4);
		curvas(ctx, [-6.2, -44.2, -2.8, -43.6, -0.4, -43.4, 0.5, -42.4, 1.6, -43.4, 3.8, -43.6, 7.6, -44.2, 10.2, -42.6]);
		ctx.lineTo(9.4, -40.4);
		curvas(ctx, [7.8, -37.0, 3.8, -37.2, 1.8, -37.6, 0.5, -38.8, -0.8, -37.6, -2.8, -37.2, -7.4, -37.0, -8.8, -40.2]);
		ctx.closePath();
		for (const x of OLHOS.x) {
			ctx.moveTo(x + 2.0, -40.3);
			ctx.ellipse(x, -40.3, 2.0, 2.4, 0, 0, PI2);
		}
	};
	pintar(ctx, f, cor, () => {
		sombra(ctx, 5);
		traco(ctx, -7.6, -42.6, -5.4, -43.4, tom(cor, 1.4), 0.6);
	}, LW, 'evenodd');
	const ex = EXPRESSOES[q.a.rosto] ?? EXPRESSOES.sorriso;
	sobrancelhas(ctx, q, ex.sobrancelha);
}

/** Pano do nariz para baixo (cor da roupa). */
function mascaraNinja(ctx: C, q: Quadro) {
	const cor = q.roupa;
	const f = () => {
		ctx.moveTo(-9.9, -40.2);
		curvas(ctx, [-5.6, -37.6, -2.6, -37.8, -0.4, -38.0, 1.0, -38.9, 2.4, -38.0, 4.4, -37.8, 7.4, -37.6, 10.0, -40.6, 10.4, -33.0, 6.0, -30.6, 0.6, -28.6, -5.2, -30.6, -10.2, -33.0, -9.9, -40.2]);
		ctx.closePath();
	};
	const dobra = risco(cor);
	pintar(ctx, f, cor, () => {
		sombra(ctx, 4.6);
		linha(ctx, [-6.0, -34.6, -2.6, -35.0, 0.4, -36.6], dobra, 0.55);
		linha(ctx, [7.4, -34.4, 4.4, -34.8, 1.8, -36.6], dobra, 0.55);
	});
}

function costasDaMascaraNinja(ctx: C, q: Quadro) {
	const cor = q.roupa;
	pintar(ctx, () => {
		ctx.moveTo(-10.1, -41.0);
		ctx.quadraticCurveTo(0, -40.0, 10.1, -41.0);
		ctx.lineTo(10.0, -38.6);
		ctx.quadraticCurveTo(0, -37.6, -10.0, -38.6);
		ctx.closePath();
	}, cor, () => sombra(ctx, 5));
	const b = Math.sin(q.t * 3 + 1) * 0.4 + (q.andando ? Math.sin(q.fase * 2 + 1) * 0.6 : 0);
	pontasDoNo(ctx, cor, 0.2, -39.8, b, 5.2);
}

/** Argolinha dourada na asa do nariz (ref. 43). */
function piercing(ctx: C) {
	ctx.beginPath();
	ctx.arc(2.05, -37.4, 0.62, -0.2 * Math.PI, 1.2 * Math.PI);
	contornar(ctx, 1.0);
	contornar(ctx, 0.5, DOURADO);
}

const MASCARA = '#1f2a44';

/**
 * Máscara de tecido cobrindo a cabeça inteira (ref. 31, mas nossa): azul-marinho,
 * dois olhos grandes brancos em gota com contorno grosso na cor de destaque. Sem
 * boca, teia, aranha nem símbolo. É desenhada depois do cabelo, para cobri-lo; o
 * capuz vem por cima. Os olhos acompanham a expressão (sério: a borda de cima
 * desce para o nariz).
 */
function mascaraInteira(ctx: C, q: Quadro, deFrente: boolean) {
	const f = oval(ctx, deFrente ? 0.2 : 0, -41.2, 10.2, 10.6);
	pintar(ctx, f, MASCARA, () => sombra(ctx, 5.6, 'rgba(0,0,0,0.22)'));
	brilho(ctx, MASCARA, -51.0, -2.0, 6.6);
	if (!deFrente) {
		// A costura de trás
		linha(ctx, [0, -51.4, 0.3, -42.0, 0, -31.4], tom(MASCARA, 1.3), 0.5);
		return;
	}
	const borda = extraOu(q, '#e0a020');
	const ex = EXPRESSOES[q.a.rosto] ?? EXPRESSOES.sorriso;
	const franze = ex.sobrancelha === 'reta' || ex.sobrancelha === 'brava';
	OLHOS.x.forEach((xo, i) => {
		const o = i === 0 ? -1 : 1;
		const cx = xo + o * 0.4;
		const cy = -40.6;
		const fechado = ex.olhos === 'fechados' || (ex.olhos === 'piscada' && i === 1);
		if (fechado) {
			ctx.beginPath();
			ctx.moveTo(cx - 2.4, cy + 0.2);
			ctx.quadraticCurveTo(cx, cy - 2.2, cx + 2.4, cy + 0.2);
			contornar(ctx, 2.6);
			contornar(ctx, 1.3, borda);
			return;
		}
		// Gota: larga e alta do lado de fora, afinando para o nariz
		const topoDentro = franze ? cy - 1.3 : cy - 2.6;
		const g = () => {
			ctx.moveTo(cx - o * 2.6, cy - 0.2);
			curvas(ctx, [cx - o * 2.0, topoDentro, cx + o * 0.8, cy - 2.9, cx + o * 3.4, cy - 3.8, cx + o * 3.3, cy - 0.4, cx + o * 3.0, cy + 2.6, cx - o * 0.2, cy + 2.3, cx - o * 2.8, cy + 1.8, cx - o * 2.6, cy - 0.2]);
			ctx.closePath();
		};
		ctx.beginPath();
		g();
		ctx.fillStyle = '#f7f8fb';
		ctx.fill();
		contornar(ctx, 2.7);
		contornar(ctx, 1.35, borda);
		// O reflexo da lente
		ctx.beginPath();
		ctx.moveTo(cx - o * 0.6, cy - 1.0);
		ctx.quadraticCurveTo(cx + o * 0.6, cy - 1.8, cx + o * 1.6, cy - 1.4);
		contornar(ctx, 0.6, 'rgba(120, 140, 180, 0.55)');
	});
}

// ================================================================== bichos de roupa

// A cabeça, as mãos e os pés são de bicho; o corpo é de gente vestido (refs. 28
// a 30, 33 a 35, 54 e 55). As cores vêm de q.bicho (pelo, claro, escuro, mão);
// bichos da mesma forma dividem o desenho e só mudam as cores e as marcas. O
// olho fica no mesmo lugar do olho de gente, então óculos e chapéus servem.

type Bicho = NonNullable<Quadro['bicho']>;
type FormaBicho = NonNullable<Bicho['forma']>;

/** Onde fica a base de cada orelha em pé (a da direita, um pouco mais para fora: rosto em 3/4) e o giro. */
const ORELHA_EM_PE: Partial<Record<FormaBicho, { x: number; y: number; giro: number }>> = {
	urso: { x: 6.4, y: -48.4, giro: 0.42 },
	felino: { x: 5.6, y: -47.6, giro: 0.36 },
	lobo: { x: 5.2, y: -47.4, giro: 0.28 },
	guaxinim: { x: 6.0, y: -47.8, giro: 0.42 },
	coelho: { x: 3.6, y: -48.0, giro: 0.12 }
};

/**
 * Uma orelha em pé, com a base em (0, 0) e a ponta para cima. `dentro`: de
 * frente aparece o miolo claro (de costas, só o pelo). A sombra chapada só na
 * da direita (a luz vem da esquerda).
 */
function orelhaEmPe(ctx: C, b: Bicho, dentro: boolean, direita: boolean) {
	const sombreia = direita ? () => sombra(ctx, 0.6) : undefined;
	switch (b.forma) {
		case 'urso': {
			const panda = b.id === 'panda';
			pintar(ctx, oval(ctx, 0, -1.8, 3.3, 3.1), panda ? b.escuro : b.pelo, sombreia);
			if (dentro) forma(ctx, oval(ctx, 0.1, -1.5, 1.8, 1.6), panda ? tom(b.escuro, 1.35) : b.claro, 0.6);
			return;
		}
		case 'felino': {
			const gato = b.id !== 'tigre';
			const alto = gato ? 6.8 : 6.2;
			pintar(ctx, () => {
				ctx.moveTo(-3.1, 0.6);
				if (gato) curvas(ctx, [-2.2, -3.0, 0.2, -alto, 2.6, -3.0, 3.1, 0.6]);
				else curvas(ctx, [-3.2, -4.2, 0, -alto, 3.2, -4.2, 3.1, 0.6]);
				ctx.closePath();
			}, b.pelo, sombreia);
			if (dentro)
				pintar(ctx, () => {
					ctx.moveTo(-1.7, 0.2);
					curvas(ctx, [-1.4, -2.4, 0.1, -alto + 2.0, 1.6, -2.4, 1.7, 0.2]);
					ctx.closePath();
				}, gato ? '#f2b3c2' : b.claro, undefined, 0.55);
			return;
		}
		case 'lobo':
			pintar(ctx, () => {
				ctx.moveTo(-3.4, 0.8);
				curvas(ctx, [-3.0, -4.8, 0.3, -9.2, 3.4, -4.8, 3.4, 0.8]);
				ctx.closePath();
			}, b.pelo, sombreia);
			if (dentro)
				pintar(ctx, () => {
					ctx.moveTo(-1.9, 0.2);
					curvas(ctx, [-1.7, -3.6, 0.2, -6.6, 1.9, -3.6, 1.9, 0.2]);
					ctx.closePath();
				}, b.claro, undefined, 0.55);
			return;
		case 'guaxinim':
			// Pontuda e arredondada, de borda clara (por trás, só o pelo)
			pintar(ctx, () => {
				ctx.moveTo(-3.3, 0.6);
				curvas(ctx, [-3.4, -4.4, 0.2, -6.6, 3.6, -4.4, 3.3, 0.6]);
				ctx.closePath();
			}, dentro ? b.claro : b.pelo, sombreia);
			if (dentro)
				pintar(ctx, () => {
					ctx.moveTo(-2.0, 0.4);
					curvas(ctx, [-2.0, -3.2, 0.2, -4.8, 2.2, -3.2, 2.0, 0.4]);
					ctx.closePath();
				}, tom(b.pelo, 0.7), undefined, 0.5);
			return;
		case 'coelho':
			pintar(ctx, () => {
				ctx.moveTo(-2.3, 0.6);
				curvas(ctx, [-3.2, -6.6, -0.2, -12.4, 2.9, -6.6, 2.3, 0.6]);
				ctx.closePath();
			}, b.pelo, sombreia);
			if (dentro)
				pintar(ctx, () => {
					ctx.moveTo(-1.0, -0.6);
					curvas(ctx, [-1.7, -6.0, -0.1, -10.2, 1.5, -6.0, 1.0, -0.6]);
					ctx.closePath();
				}, tom(b.escuro, 1.3), undefined, 0.5);
			return;
	}
}

/**
 * As orelhas em pé. Atrás da cabeça (gancho orelhas) ou, com chapéu que cobre a
 * cabeça, saindo pelos lados por baixo da aba (antes do chapéu, no gancho chapeu).
 * A orelha comprida da coelha sai sempre por cima.
 */
function orelhasEmPe(ctx: C, q: Quadro, b: Bicho, pelosLados: boolean) {
	const pos = b.forma ? ORELHA_EM_PE[b.forma] : undefined;
	if (!pos) return;
	const coelho = b.forma === 'coelho';
	for (const s of [-1, 1]) {
		ctx.save();
		if (pelosLados) {
			ctx.translate(s * 9.4 + (q.deFrente ? 0.4 : 0), -49.4);
			ctx.rotate(s * 0.95);
		} else {
			ctx.translate(s * pos.x + (q.deFrente && s > 0 ? 0.6 : 0), pos.y);
			// A orelha comprida balança de leve
			ctx.rotate(s * pos.giro + (coelho ? Math.sin(q.t * 1.7 + s) * 0.035 : 0));
		}
		orelhaEmPe(ctx, b, q.deFrente, s > 0);
		ctx.restore();
	}
}

/** As orelhas saem pelos lados do chapéu? (o capuz esconde; a da coelha sai por cima de tudo) */
const orelhaPelosLados = (q: Quadro, b: Bicho) => coberto(q) && b.forma !== 'coelho' && b.forma !== 'macaco' && b.forma !== 'cachorro';

/**
 * Orelhas caídas de cachorro, por cima da cabeça: de frente (sobreORosto) e de
 * costas (costas). A da dálmata é mais fina e tem pinta.
 */
function orelhasCaidas(ctx: C, q: Quadro, b: Bicho) {
	const dalmata = b.id === 'dalmata';
	const cor = dalmata ? b.pelo : tom(b.pelo, 0.88);
	const fina = dalmata ? 0.82 : 1;
	const balanca = q.andando ? Math.sin(q.fase) * 0.06 : Math.sin(q.t * 1.4) * 0.015;
	for (const s of [-1, 1]) {
		ctx.save();
		ctx.translate(q.deFrente ? (s < 0 ? -5.4 : 6.2) : s * 5.8, -48.6);
		ctx.rotate(s * balanca);
		// Desenhada como a da direita; a da esquerda é o espelho
		ctx.scale(s * fina, 1);
		const f = () => {
			ctx.moveTo(-0.6, 0);
			ctx.bezierCurveTo(4.0, -1.0, 6.6, 4.4, 6.4, 10.6);
			curvas(ctx, [6.2, 14.6, 3.8, 15.0, 2.0, 15.0, 1.8, 11.0]);
			ctx.bezierCurveTo(1.6, 6.4, 0.4, 3.6, -0.6, 0);
			ctx.closePath();
		};
		pintar(ctx, f, cor, s > 0 ? () => sombra(ctx, 3.6) : undefined);
		if (dalmata) {
			forma(ctx, oval(ctx, 3.8, 7.6, 1.1, 1.5, 0.3), b.escuro, 0);
			forma(ctx, oval(ctx, 2.8, 12.4, 0.8, 0.7), b.escuro, 0);
		} else linha(ctx, [2.6, 3.2, 4.6, 7.0, 4.0, 11.6], tom(cor, 0.78), 0.5);
		ctx.restore();
	}
}

/** Tufo de pelo na bochecha (tigre, gato, lobo, guaxinim), atrás da cabeça. */
function tufo(ctx: C, s: number, cor: string) {
	const x = (v: number) => s * v + (s > 0 ? 0.3 : 0);
	pintar(ctx, () => {
		ctx.moveTo(x(7.4), -40.2);
		ctx.lineTo(x(11.4), -39.2);
		ctx.lineTo(x(9.8), -37.8);
		ctx.lineTo(x(12.0), -36.2);
		ctx.lineTo(x(9.6), -35.4);
		ctx.lineTo(x(10.8), -33.4);
		ctx.lineTo(x(7.2), -33.8);
		ctx.closePath();
	}, cor, s > 0 ? () => sombra(ctx, x(9.4)) : undefined, 0.85);
}

/** Cunha (listra de tigre): base de largura w em (x0, y0), ponta em (x1, y1). */
function cunha(ctx: C, x0: number, y0: number, x1: number, y1: number, w: number, cor: string) {
	const a = Math.atan2(y1 - y0, x1 - x0);
	const nx = (-Math.sin(a) * w) / 2;
	const ny = (Math.cos(a) * w) / 2;
	ctx.beginPath();
	ctx.moveTo(x0 + nx, y0 + ny);
	ctx.quadraticCurveTo((x0 + x1) / 2 + nx * 0.7, (y0 + y1) / 2 + ny * 0.7, x1, y1);
	ctx.quadraticCurveTo((x0 + x1) / 2 - nx * 0.7, (y0 + y1) / 2 - ny * 0.7, x0 - nx, y0 - ny);
	ctx.closePath();
	ctx.fillStyle = cor;
	ctx.fill();
}

/** As marcas do pelo na cabeça (dentro do recorte dela): listras do tigre, pintas da dálmata, risca do guaxinim. */
function marcasDoPelo(ctx: C, q: Quadro, b: Bicho) {
	const e = b.escuro;
	if (b.id === 'tigre') {
		if (q.deFrente) {
			cunha(ctx, 0.6, -50.6, 0.6, -46.4, 1.5, e);
			cunha(ctx, -2.8, -50.4, -2.0, -47.2, 1.1, e);
			cunha(ctx, 4.0, -50.4, 3.2, -47.2, 1.1, e);
			cunha(ctx, -10.0, -42.8, -6.8, -42.0, 1.3, e);
			cunha(ctx, -10.0, -39.2, -7.2, -38.8, 1.2, e);
			cunha(ctx, 10.2, -43.0, 7.6, -42.2, 1.3, e);
			cunha(ctx, 10.2, -39.4, 8.0, -39.0, 1.2, e);
		} else {
			cunha(ctx, 0, -51.0, 0, -46.0, 1.6, e);
			for (const y of [-47.4, -43.4, -39.4, -35.4]) {
				cunha(ctx, -10.2, y, -4.8, y + 0.8, 1.4, e);
				cunha(ctx, 10.2, y, 4.8, y + 0.8, 1.4, e);
			}
		}
	} else if (b.id === 'dalmata') {
		const pintas: readonly (readonly number[])[] = q.deFrente
			? [
					[-5.8, -47.6, 1.5, 1.1, 0.4],
					[5.4, -48.6, 1.0, 0.8, -0.3],
					[-8.4, -41.0, 0.9, 1.2, 0.2],
					[0.4, -45.9, 0.65, 0.5, 0],
					[6.9, -45.3, 0.65, 0.5, 0],
					[-6.6, -34.4, 0.85, 0.65, 0.3],
					[7.8, -35.2, 0.7, 0.55, 0]
				]
			: [
					[-4.0, -46.0, 1.6, 1.2, 0.3],
					[3.6, -48.6, 1.1, 0.9, -0.2],
					[5.4, -41.0, 1.4, 1.1, 0.5],
					[-6.0, -38.4, 1.0, 0.8, 0],
					[0.6, -35.4, 1.2, 0.9, 0.2]
				];
		for (const [x, y, rx, ry, g] of pintas) forma(ctx, oval(ctx, x, y, rx, ry, g), e, 0);
	} else if (b.forma === 'guaxinim' && q.deFrente) {
		// A risca escura do alto da cabeça até entre os olhos
		cunha(ctx, 0.6, -51.0, 0.6, -43.0, 2.4, tom(b.pelo, 0.62));
	}
}

/** A cabeça de bicho (de frente e de costas), com o pelo, os tufos e as marcas. */
function cabecaDeBicho(ctx: C, q: Quadro, b: Bicho) {
	const forma_ = b.forma;
	// Tufos nas bochechas, atrás da cabeça
	if (forma_ === 'felino' || forma_ === 'lobo' || forma_ === 'guaxinim') {
		const cor = forma_ === 'lobo' || b.id === 'gato' ? b.pelo : b.claro;
		for (const s of [-1, 1]) tufo(ctx, s, cor);
	}
	// O urso tem a cabeça um pouco mais larga nas bochechas
	const f = forma_ === 'urso' ? oval(ctx, 0, -40.4, 10.0, 9.7) : oval(ctx, 0, CY, R, R);
	pintar(ctx, f, b.pelo, () => {
		marcasDoPelo(ctx, q, b);
		sombra(ctx, 5.4);
	});
	if (forma_ === 'macaco') {
		// O topete de pelo arrepiado no alto
		const dx = q.deFrente ? 0.4 : 0;
		// Fios em pé, desiguais e puxados para a direita (ref. 55)
		pintar(ctx, () => {
			ctx.moveTo(dx - 3.0, -49.6);
			curvas(ctx, [dx - 3.8, -52.0, dx - 2.0, -53.4, dx - 1.8, -52.0, dx - 0.7, -51.6, dx - 0.4, -53.8, dx + 2.4, -54.4]);
			curvas(ctx, [dx + 1.4, -53.0, dx + 1.7, -52.0, dx + 3.2, -53.0, dx + 4.8, -52.6, dx + 3.6, -51.2, dx + 3.2, -49.6]);
			ctx.closePath();
		}, b.pelo, () => sombra(ctx, dx + 1.8), 0.9);
		linha(ctx, [dx - 1.0, -50.0, dx + 0.0, -52.2, dx + 1.6, -53.4], tom(b.pelo, 1.35), 0.55);
	}
}

/** Boca de bicho, embaixo do nariz (mx, my = onde o risco do nariz encontra a boca). */
function bocaDeBicho(ctx: C, tipo: Boca, mx: number, my: number, w: number, narizY: number) {
	// O risquinho do nariz até a boca
	traco(ctx, mx, narizY, mx, my, CONTORNO, 0.75);
	ctx.beginPath();
	switch (tipo) {
		case 'sorriso':
		case 'doce': {
			const k = tipo === 'doce' ? 0.75 : 1;
			const f = () => {
				ctx.moveTo(mx - w * 1.15 * k, my);
				ctx.quadraticCurveTo(mx, my + 3.6 * k, mx + w * 1.15 * k, my);
				ctx.closePath();
			};
			ctx.save();
			f();
			ctx.fillStyle = '#7a2530';
			ctx.fill();
			ctx.clip();
			ponto(ctx, mx, my + 2.4 * k, w * 0.62 * k, '#e8707a');
			ctx.restore();
			ctx.beginPath();
			f();
			contornar(ctx, 0.75);
			return;
		}
		case 'meia':
			// O "w" com o canto da direita subindo (de lado, confiante)
			ctx.moveTo(mx - w * 0.9, my + 0.1);
			curvas(ctx, [mx - w * 0.45, my + 1.1, mx, my, mx + w * 0.6, my + 1.1, mx + w * 1.25, my - 0.7]);
			contornar(ctx, 0.8);
			return;
		case 'reta':
			ctx.moveTo(mx - w * 0.8, my + 0.5);
			ctx.lineTo(mx + w * 0.8, my + 0.4);
			contornar(ctx, 0.85);
			return;
		case 'dentes':
			pintar(ctx, caixa(ctx, mx - w, my + 0.2, w * 2, 2.2, 0.8), '#ffffff', () => traco(ctx, mx, my, mx, my + 2.6, '#a7afbd', 0.45), 0.7);
			return;
		default:
			// 'fechada': o "w" de bicho sorrindo de boca fechada
			ctx.moveTo(mx - w, my - 0.2);
			curvas(ctx, [mx - w * 0.5, my + 1.2, mx, my, mx + w * 0.5, my + 1.2, mx + w, my - 0.2]);
			contornar(ctx, 0.8);
	}
}

/** Nariz de bicho: oval escuro com brilho (urso, cachorro, lobo, guaxinim). */
function narizEscuro(ctx: C, x: number, y: number, rx: number, ry: number, cor: string) {
	forma(ctx, oval(ctx, x, y, rx, ry), cor, 0.7);
	ponto(ctx, x - rx * 0.35, y - ry * 0.35, Math.min(rx, ry) * 0.38, 'rgba(255,255,255,0.6)');
}

/** Nariz rosado em triângulo (felino, coelho). */
function narizRosado(ctx: C, x: number, y: number, w: number, cor: string) {
	pintar(ctx, () => {
		ctx.moveTo(x - w / 2, y - 0.5);
		ctx.quadraticCurveTo(x, y - 0.9, x + w / 2, y - 0.5);
		ctx.quadraticCurveTo(x + w * 0.2, y + 0.6, x, y + 0.8);
		ctx.quadraticCurveTo(x - w * 0.2, y + 0.6, x - w / 2, y - 0.5);
		ctx.closePath();
	}, cor, undefined, 0.6);
}

/** Área clara recortada na cabeça (máscara clara do lobo, a cara do guaxinim, o focinho do tigre). */
function areaClara(ctx: C, f: () => void, cor: string) {
	ctx.save();
	ctx.beginPath();
	oval(ctx, 0, CY, R - 0.4, R - 0.4)();
	ctx.clip();
	forma(ctx, f, cor, 0.6);
	ctx.restore();
}

/**
 * O rosto de bicho (de frente): marcas do rosto, focinho, bochecha, sobrancelha,
 * olhos (com cílios nela), nariz e boca na expressão escolhida.
 */
function rostoDeBicho(ctx: C, q: Quadro, b: Bicho) {
	const ex = EXPRESSOES[q.a.rosto] ?? EXPRESSOES.sorriso;
	const fem = q.feminino;
	const claroDemais = luzDe(b.pelo) > 200;
	let corSobrancelha = claroDemais ? tom(b.escuro, 1.3) : tom(b.pelo, 0.55);
	let aro: string | undefined;
	// 1) As marcas do rosto e o focinho (sem o nariz)
	switch (b.forma) {
		case 'urso':
			if (b.id === 'panda') {
				// Manchas escuras em gota em volta dos olhos
				forma(ctx, oval(ctx, -3.0, -39.8, 2.5, 3.1, 0.45), b.escuro, 0);
				forma(ctx, oval(ctx, 4.0, -39.8, 2.5, 3.1, -0.45), b.escuro, 0);
				aro = tom(b.escuro, 1.6);
			}
			forma(ctx, oval(ctx, 1.2, -35.4, 4.4, 3.2), b.claro, 0.7);
			break;
		case 'cachorro':
			forma(ctx, oval(ctx, 1.6, -35.0, 4.8, 3.6), b.claro, 0.7);
			break;
		case 'felino':
			if (b.id === 'tigre') areaClara(ctx, oval(ctx, 1.4, -33.8, 5.4, 4.4), b.claro);
			break;
		case 'lobo':
			// A máscara clara do focinho ao pescoço
			areaClara(ctx, oval(ctx, 0.4, -31.6, 8.4, 4.4), b.claro);
			break;
		case 'guaxinim': {
			// A cara clara embaixo, a faixa clara em cima e a máscara escura nos olhos
			areaClara(ctx, oval(ctx, 0.8, -34.0, 7.2, 4.4), b.claro);
			const mascara = (dy: number) => () => {
				ctx.moveTo(-9.6, -42.2 + dy);
				curvas(ctx, [-6.0, -44.4 + dy, -2.6, -43.6 + dy, -0.6, -42.8 + dy, 0.6, -41.4 + dy, 1.8, -42.8 + dy, 3.8, -43.6 + dy, 7.6, -44.4 + dy, 9.8, -42.4 + dy]);
				curvas(ctx, [9.4, -38.4, 6.8, -37.4, 4.4, -37.2, 2.6, -38.2, 1.6, -39.2, 0.6, -39.4, -0.4, -39.2, -1.4, -38.2, -4.4, -37.0, -6.6, -37.4, -9.2, -38.4, -9.6, -42.2 + dy]);
				ctx.closePath();
			};
			areaClara(ctx, mascara(-1.6), b.claro);
			ctx.save();
			ctx.beginPath();
			oval(ctx, 0, CY, R - 0.4, R - 0.4)();
			ctx.clip();
			forma(ctx, mascara(0), b.escuro, 0);
			ctx.restore();
			aro = tom(b.claro, 0.92);
			corSobrancelha = tom(b.claro, 0.6);
			break;
		}
		case 'macaco': {
			// A cara clara em forma de coração, dos olhos ao queixo
			const cara = bolas(ctx, [
				[-2.4, -41.4, 3.4],
				[3.6, -41.4, 3.4],
				[0.7, -35.4, 5.6, 4.6]
			]);
			ctx.beginPath();
			cara();
			contornar(ctx, 1.4);
			ctx.beginPath();
			cara();
			ctx.fillStyle = b.claro;
			ctx.fill();
			corSobrancelha = tom(b.pelo, 0.9);
			break;
		}
	}
	// 2) Bochechas coradas
	const k = ex.corada ? 0.18 : 0;
	for (const x of [-5.5, 6.4]) {
		ctx.beginPath();
		ctx.ellipse(x, -36.4, fem ? 2.0 : 1.8, fem ? 1.2 : 1.1, 0, 0, PI2);
		ctx.fillStyle = `rgba(236, 104, 116, ${(fem ? 0.5 : 0.38) + k})`;
		ctx.fill();
	}
	// 3) Sobrancelhas e olhos
	sobrancelhas(ctx, q, ex.sobrancelha, corSobrancelha);
	OLHOS.x.forEach((x, i) => {
		const fechado = ex.olhos === 'fechados' || (ex.olhos === 'piscada' && i === 1);
		if (fechado) olhoFechado(ctx, x, fem);
		else olhoAberto(ctx, x, fem, aro);
	});
	// 4) Nariz e boca, conforme a forma
	switch (b.forma) {
		case 'urso':
			narizEscuro(ctx, 1.3, -37.5, 1.8, 1.2, b.escuro);
			bocaDeBicho(ctx, ex.boca, 1.3, -35.5, 1.8, -36.4);
			break;
		case 'cachorro':
			narizEscuro(ctx, 2.0, -37.4, 2.2, 1.5, b.escuro);
			bocaDeBicho(ctx, ex.boca, 2.0, -35.2, 2.0, -36.0);
			break;
		case 'felino': {
			// Almofadinhas do focinho, nariz rosado e os bigodinhos
			for (const x of [0.4, 2.9]) forma(ctx, oval(ctx, x, -35.4, 1.7, 1.35), b.claro, 0.6);
			narizRosado(ctx, 1.65, -37.2, 2.4, b.id === 'tigre' ? '#d9737f' : '#e48fa4');
			bocaDeBicho(ctx, ex.boca, 1.65, -35.6, 1.3, -36.4);
			const fio = b.id === 'tigre' ? 'rgba(31,26,23,0.5)' : tom(b.escuro, 1.1);
			for (const [y0, y1] of [
				[-35.9, -36.9],
				[-35.3, -35.2],
				[-34.7, -33.6]
			] as const) {
				traco(ctx, -1.2, y0, -6.0, y1, fio, 0.4);
				traco(ctx, 4.5, y0, 9.0, y1, fio, 0.4);
			}
			break;
		}
		case 'lobo':
			// Focinho comprido e fino, apontando para a frente (+x)
			forma(ctx, oval(ctx, 3.4, -35.4, 5.8, 2.9, -0.06), b.claro, 0.75);
			narizEscuro(ctx, 7.6, -36.8, 1.7, 1.25, b.escuro);
			bocaDeBicho(ctx, ex.boca, 5.6, -34.6, 2.0, -35.6);
			break;
		case 'guaxinim':
			forma(ctx, oval(ctx, 1.6, -35.4, 2.8, 2.0), b.claro, 0.65);
			narizEscuro(ctx, 1.7, -36.9, 1.4, 1.0, b.escuro);
			bocaDeBicho(ctx, ex.boca, 1.7, -35.0, 1.4, -35.9);
			break;
		case 'macaco':
			for (const x of [0.3, 1.9]) ponto(ctx, x, -37.6, 0.45, b.escuro);
			boca(ctx, q, ex.boca);
			break;
		case 'coelho':
			for (const x of [0.5, 2.8]) forma(ctx, oval(ctx, x, -35.4, 1.6, 1.3), b.claro, 0.5);
			narizRosado(ctx, 1.65, -37.2, 1.8, tom(b.escuro, 0.9));
			bocaDeBicho(ctx, ex.boca, 1.65, -35.8, 1.2, -36.4);
			// Os dois dentinhos
			if (ex.boca !== 'dentes')
				for (const x of [0.75, 1.7]) pintar(ctx, caixa(ctx, x, -35.6, 0.95, 1.5, [0, 0, 0.35, 0.35]), '#ffffff', undefined, 0.45);
			break;
	}
}

// ================================================================== ganchos

/**
 * De frente, ANTES do braço de trás e do tronco: o que fica atrás da cabeça e
 * do corpo (a parte de trás dos cabelos novos compridos ou volumosos, as pontas
 * da faixa). Bicho não tem cabelo (o topete do macaco é da cabeça de bicho).
 */
export function cabecaAtras(ctx: C, q: Quadro): void {
	if (!q.bicho) PENTEADOS[q.a.cabelo]?.atras?.(ctx, q, q.cabelo);
	if (q.a.chapeu === 'bandana') pontasDaBandana(ctx, q);
}

/**
 * As orelhas (de frente e de costas), logo depois do pescoço. true = desenhei;
 * avatar.ts não desenha as orelhas redondas nem o brinco de bolinha dela. Para:
 * orelha pontuda, brincos de argola, os parafusos da cabeça de robô, a máscara
 * inteira (pescoço e orelhas de tecido) e as orelhas de bicho (as em pé ficam
 * atrás da cabeça; a do cachorro cai por cima, em sobreORosto).
 */
export function orelhas(ctx: C, q: Quadro): boolean {
	if (temDetalhe(q, 'mascaraInteira')) {
		const w = q.feminino ? 3.4 : 4.2;
		forma(ctx, caixa(ctx, -w / 2 + (q.feminino ? 0.1 : 0), -32.4, w, 2.6, 1), tom(MASCARA, 0.9), 0.8);
		for (const s of [-1, 1]) forma(ctx, oval(ctx, s * (R - 0.3), CY + 0.8, 2, 2.6), MASCARA);
		return true;
	}
	const b = q.bicho;
	if (b) {
		// Lobo e tigre têm o pescoço claro (a máscara do focinho desce até ele)
		if (b.forma === 'lobo' || b.id === 'tigre') {
			const w = q.feminino ? 3.4 : 4.2;
			forma(ctx, caixa(ctx, -w / 2 + (q.feminino ? 0.1 : 0), -32.4, w, 2.6, 1), tom(b.claro, 0.92), 0.8);
		}
		if (b.forma === 'macaco') {
			// Orelhas grandes e redondas dos lados, na altura dos olhos
			for (const s of [-1, 1]) {
				const x = s * 10.4 + (s > 0 ? 0.4 : 0);
				pintar(ctx, oval(ctx, x, -40.2, 2.9, 3.1), b.pelo, s > 0 ? () => sombra(ctx, x + 0.6) : undefined);
				if (q.deFrente) forma(ctx, oval(ctx, x + s * 0.3, -40.0, 1.7, 2.0), b.mao, 0.6);
			}
		} else if (q.a.chapeu !== 'capuz' && !orelhaPelosLados(q, b)) orelhasEmPe(ctx, q, b, false);
		return true;
	}
	const robo = temDetalhe(q, 'cabecaRobo');
	const pontuda = temDetalhe(q, 'orelhaPontuda');
	if (!robo && !pontuda && !temDetalhe(q, 'argolas')) return false;
	for (const s of [-1, 1]) {
		if (robo) parafuso(ctx, s * 10.2, CY + 0.2, q.pele);
		else if (pontuda) orelhaPontuda(ctx, s, q.pele);
		// Com argola: a orelha de sempre, sem a bolinha (a argola sai por cima do cabelo, em chapeu())
		else forma(ctx, oval(ctx, s * (R - 0.3), CY + 0.8, 2, 2.6), q.pele);
	}
	return true;
}

/**
 * A forma da cabeça (de frente e de costas). true = desenhei (com contorno e
 * sombra); avatar.ts não desenha a cabeça redonda. Para: cabeça de robô e
 * cabeça de bicho (com os tufos, as listras e as pintas).
 */
export function formaDaCabeca(ctx: C, q: Quadro): boolean {
	if (q.bicho) {
		cabecaDeBicho(ctx, q, q.bicho);
		return true;
	}
	if (!temDetalhe(q, 'cabecaRobo')) return false;
	const metal = q.pele;
	pintar(ctx, caixa(ctx, -9.8, -50.6, 19.6, 19.8, [5.2, 5.2, 4.2, 4.2]), metal, () => {
		sombra(ctx, 5.4);
		traco(ctx, -9.8, -46.8, 9.8, -46.8, tom(metal, 0.82), 0.5);
	});
	for (const [x, y] of [
		[-7.6, -48.8],
		[7.6, -48.8],
		[-7.6, -33.0],
		[7.6, -33.0]
	] as const)
		ponto(ctx, x, y, 0.55, tom(metal, 0.66));
	return true;
}

/**
 * De frente: o rosto (bochecha, sobrancelha, olhos, nariz, boca). true =
 * desenhei; avatar.ts não desenha o sorriso padrão. Para: as expressões que não
 * são 'sorriso', o visor da cabeça de robô, os olhos brilhando, o rosto de
 * bicho (em todas as expressões) e a máscara inteira (sem rosto: ela cobre tudo).
 */
export function rosto(ctx: C, q: Quadro): boolean {
	if (temDetalhe(q, 'mascaraInteira')) return true;
	if (temDetalhe(q, 'cabecaRobo')) {
		rostoRobo(ctx, q);
		return true;
	}
	if (q.bicho) {
		rostoDeBicho(ctx, q, q.bicho);
		return true;
	}
	const ex = EXPRESSOES[q.a.rosto];
	const brilhando = temDetalhe(q, 'olhosBrilhando');
	if (!ex || (q.a.rosto === 'sorriso' && !brilhando)) return false;
	expressao(ctx, q, ex, brilhando);
	return true;
}

/**
 * De frente, por cima do rosto e antes do cabelo: barba e bigode, sardas,
 * piercing, caninos, presas, máscara de herói, máscara ninja (a parte do rosto)
 * e as orelhas caídas de cachorro. Com a máscara inteira, nada (ela cobre).
 */
export function sobreORosto(ctx: C, q: Quadro): void {
	if (temDetalhe(q, 'mascaraInteira')) return;
	if (q.bicho) {
		if (q.bicho.forma === 'cachorro') orelhasCaidas(ctx, q, q.bicho);
	} else {
		if (temDetalhe(q, 'sardas')) sardas(ctx, q.pele);
		barba(ctx, q);
		if (temDetalhe(q, 'piercing')) piercing(ctx);
	}
	if (temDetalhe(q, 'caninos')) caninos(ctx, q);
	if (temDetalhe(q, 'presas')) presas(ctx);
	if (temDetalhe(q, 'mascara')) mascara(ctx, q);
	if (temDetalhe(q, 'mascaraNinja')) mascaraNinja(ctx, q);
}

/**
 * De frente: o topo e a franja dos cabelos NOVOS (os originais saem em
 * avatar.ts, antes). A máscara inteira entra aqui, por cima de qualquer cabelo.
 */
export function cabeloFrente(ctx: C, q: Quadro): void {
	if (temDetalhe(q, 'mascaraInteira')) return mascaraInteira(ctx, q, true);
	if (!q.bicho) PENTEADOS[q.a.cabelo]?.frente?.(ctx, q, q.cabelo);
}

/** De frente: os óculos NOVOS (os originais saem em avatar.ts). */
export function oculos(ctx: C, q: Quadro): void {
	desenharOculos(ctx, q);
}

/**
 * De frente, por último na cabeça: chapéus e enfeites (inclui fone, laço,
 * tiara, auréola, lenço) e os detalhes que saem do alto da cabeça (chifres,
 * antenas). Com chapéu que cobre a cabeça, a orelha em pé de bicho sai pelos
 * lados, por baixo da aba.
 */
export function chapeu(ctx: C, q: Quadro): void {
	if (q.bicho && q.a.chapeu !== 'capuz' && orelhaPelosLados(q, q.bicho)) orelhasEmPe(ctx, q, q.bicho, true);
	if (temDetalhe(q, 'chifres')) chifres(ctx);
	if (temDetalhe(q, 'antenas')) antenas(ctx, q);
	desenharChapeu(ctx, q, true);
	if (temDetalhe(q, 'argolas')) argolas(ctx);
}

/**
 * De costas (depois dos cabelos originais vistos por trás): os cabelos novos,
 * a máscara inteira, as orelhas caídas de cachorro, os chapéus, chifres e
 * antenas vistos por trás e o nó da máscara ninja.
 */
export function costas(ctx: C, q: Quadro): void {
	if (temDetalhe(q, 'cabecaRobo')) {
		// A tampa de trás da cabeça de robô
		const metal = q.pele;
		pintar(ctx, caixa(ctx, -5.2, -46.4, 10.4, 8.4, 1.6), tom(metal, 0.9), undefined, 0.7);
		for (const y of [-44.2, -42.2, -40.2]) traco(ctx, -3.4, y, 3.4, y, tom(metal, 0.62), 0.6);
	}
	if (q.bicho) {
		if (q.bicho.forma === 'cachorro') orelhasCaidas(ctx, q, q.bicho);
	} else PENTEADOS[q.a.cabelo]?.costas?.(ctx, q, q.cabelo);
	if (temDetalhe(q, 'mascaraInteira')) mascaraInteira(ctx, q, false);
	if (temDetalhe(q, 'mascaraNinja')) costasDaMascaraNinja(ctx, q);
	if (q.bicho && q.a.chapeu !== 'capuz' && orelhaPelosLados(q, q.bicho)) orelhasEmPe(ctx, q, q.bicho, true);
	if (temDetalhe(q, 'chifres')) chifres(ctx);
	if (temDetalhe(q, 'antenas')) antenas(ctx, q);
	desenharChapeu(ctx, q, false);
	if (temDetalhe(q, 'argolas')) argolas(ctx);
}
