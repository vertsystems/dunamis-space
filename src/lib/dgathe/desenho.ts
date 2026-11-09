// Como cada coisa do DGathe é desenhada: chão, paredes, móveis e o lado de fora.
//
// Tudo é feito de caixas e polígonos chapados (estilo flat), em coordenadas de
// tela do zoom 1. O motor (jogo.ts) aplica câmera e zoom no contexto antes.
// Luz vinda da esquerda: topo claro, face +y média, face +x mais escura.

import { paraTela, tom, sorteio, type Ponto, type Caixa } from './iso';
import {
	pisoDaCelula,
	zonaDaCelula,
	SALA_POR_ID,
	DECORACOES,
	type Item,
	type Segmento,
	type Tapete,
	type Decoracao
} from './mapa';

type C = CanvasRenderingContext2D;
const P = paraTela;

/** Espessura de 1 px na tela; o motor atualiza a cada quadro conforme o zoom. */
export const estilo = { lw: 1 };

const LINHA = 'rgba(24, 31, 44, 0.32)';
const SOMBRA = 'rgba(16, 24, 40, 0.13)';

// ------------------------------------------------------------------ primitivas

export function poli(ctx: C, pts: Ponto[], fill?: string | CanvasGradient, stroke?: string, lw = estilo.lw) {
	ctx.beginPath();
	ctx.moveTo(pts[0].x, pts[0].y);
	for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
	ctx.closePath();
	if (fill) {
		ctx.fillStyle = fill;
		ctx.fill();
	}
	if (stroke) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = lw;
		ctx.lineJoin = 'round';
		ctx.stroke();
	}
}

function segmento(ctx: C, a: Ponto, b: Ponto, cor: string, lw = estilo.lw) {
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);
	ctx.strokeStyle = cor;
	ctx.lineWidth = lw;
	ctx.lineCap = 'round';
	ctx.stroke();
}

type OpcoesCaixa = { topo?: string; faceY?: string; faceX?: string; linha?: string | false };

/** Caixa sólida com as três faces visíveis e o contorno das arestas da frente. */
export function caixa(
	ctx: C,
	x0: number,
	y0: number,
	z0: number,
	x1: number,
	y1: number,
	z1: number,
	cor: string,
	o: OpcoesCaixa = {}
) {
	const linha = o.linha === undefined ? LINHA : o.linha;
	poli(ctx, [P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)], o.faceX ?? tom(cor, 0.74));
	poli(ctx, [P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], o.faceY ?? tom(cor, 0.87));
	poli(ctx, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], o.topo ?? cor);
	if (linha) {
		poli(ctx, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), P(x0, y1, z1)], undefined, linha);
		ctx.beginPath();
		const a = P(x0, y1, z1);
		const b = P(x1, y1, z1);
		const c = P(x1, y0, z1);
		const d = P(x1, y1, z0);
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.lineTo(c.x, c.y);
		ctx.moveTo(b.x, b.y);
		ctx.lineTo(d.x, d.y);
		ctx.strokeStyle = linha;
		ctx.lineWidth = estilo.lw;
		ctx.stroke();
	}
}

/** Retângulo deitado no chão (ou num tampo) na altura z. */
export function quadZ(ctx: C, z: number, x0: number, y0: number, x1: number, y1: number, fill?: string, stroke?: string) {
	poli(ctx, [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], fill, stroke);
}

/** Raios da elipse na tela de um círculo de raio r deitado no chão. */
const RX = 32 * Math.SQRT2;
const RY = 16 * Math.SQRT2;

export function elipseChao(ctx: C, cx: number, cy: number, z: number, r: number, fill?: string | CanvasGradient, stroke?: string) {
	const c = P(cx, cy, z);
	ctx.beginPath();
	ctx.ellipse(c.x, c.y, RX * r, RY * r, 0, 0, Math.PI * 2);
	if (fill) {
		ctx.fillStyle = fill;
		ctx.fill();
	}
	if (stroke) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = estilo.lw;
		ctx.stroke();
	}
}

/** Cilindro em pé (vaso, base, garrafa). */
export function cilindro(ctx: C, cx: number, cy: number, r: number, z0: number, z1: number, cor: string, linha: string | false = LINHA) {
	const b = P(cx, cy, z0);
	const t = P(cx, cy, z1);
	const rx = RX * r;
	const ry = RY * r;
	const g = ctx.createLinearGradient(t.x - rx, 0, t.x + rx, 0);
	g.addColorStop(0, tom(cor, 0.95));
	g.addColorStop(1, tom(cor, 0.68));
	ctx.beginPath();
	ctx.ellipse(b.x, b.y, rx, ry, 0, 0, Math.PI);
	ctx.lineTo(t.x - rx, t.y);
	ctx.ellipse(t.x, t.y, rx, ry, 0, Math.PI, 0);
	ctx.closePath();
	ctx.fillStyle = g;
	ctx.fill();
	if (linha) {
		ctx.strokeStyle = linha;
		ctx.lineWidth = estilo.lw;
		ctx.stroke();
	}
	elipseChao(ctx, cx, cy, z1, r, cor, linha || undefined);
}

function bolha(ctx: C, x: number, y: number, r: number, cor: string | CanvasGradient) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fillStyle = cor;
	ctx.fill();
}

/** Sombra de contato no chão, embaixo do móvel. */
function sombra(ctx: C, it: { x: number; y: number; w: number; d: number }, folga = 0.06) {
	quadZ(ctx, 0, it.x - folga, it.y - folga, it.x + it.w + folga * 2, it.y + it.d + folga * 2, SOMBRA);
}

/**
 * Uma face vertical visível, com coordenadas próprias: u corre da esquerda para
 * a direita de quem olha, z de baixo para cima. Serve para tela de monitor,
 * janela, livro na estante, letreiro.
 */
export class Face {
	constructor(
		/** 'y': a face +y (plano y fixo). 'x': a face +x (plano x fixo). */
		private readonly orient: 'x' | 'y',
		private readonly fixo: number,
		private readonly inicio: number,
		readonly largura: number
	) {}

	p(u: number, z: number): Ponto {
		return this.orient === 'y'
			? P(this.inicio + u, this.fixo, z)
			: P(this.fixo, this.inicio + this.largura - u, z);
	}

	ret(ctx: C, u0: number, u1: number, z0: number, z1: number, fill?: string | CanvasGradient, stroke?: string) {
		poli(ctx, [this.p(u0, z1), this.p(u1, z1), this.p(u1, z0), this.p(u0, z0)], fill, stroke);
	}

	elipse(ctx: C, u: number, z: number, ru: number, rz: number, fill?: string, stroke?: string) {
		const pts: Ponto[] = [];
		for (let i = 0; i < 18; i++) {
			const a = (i / 18) * Math.PI * 2;
			pts.push(this.p(u + Math.cos(a) * ru, z + Math.sin(a) * rz));
		}
		poli(ctx, pts, fill, stroke);
	}

	linha(ctx: C, u0: number, z0: number, u1: number, z1: number, cor: string, lw = estilo.lw) {
		segmento(ctx, this.p(u0, z0), this.p(u1, z1), cor, lw);
	}

	texto(ctx: C, txt: string, u: number, z: number, px: number, cor: string, peso = 700, brilho?: string) {
		const o = this.p(u, z);
		ctx.save();
		ctx.translate(o.x, o.y);
		ctx.transform(1, this.orient === 'y' ? 0.5 : -0.5, 0, 1, 0, 0);
		ctx.font = `${peso} ${px}px Inter, system-ui, sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		if (brilho) {
			ctx.shadowColor = brilho;
			ctx.shadowBlur = 8;
		}
		ctx.fillStyle = cor;
		ctx.fillText(txt, 0, 0);
		ctx.restore();
	}
}

function faceFrente(it: Item): Face | null {
	if (it.frente === 'y') return new Face('y', it.y + it.d, it.x, it.w);
	if (it.frente === 'x') return new Face('x', it.x + it.w, it.y, it.d);
	return null;
}

/** Texto deitado no chão (tapete, capacho). */
function textoNoChao(ctx: C, txt: string, x: number, y: number, px: number, cor: string, peso = 800) {
	const o = P(x, y, 0.01);
	ctx.save();
	ctx.translate(o.x, o.y);
	ctx.transform(1, 0.5, -1, 0.5, 0, 0);
	ctx.font = `${peso} ${px}px Inter, system-ui, sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = cor;
	ctx.fillText(txt, 0, 0);
	ctx.restore();
}

// ----------------------------------------------------------------------- chão

const GRAMA = ['#7aaf58', '#80b85e', '#76aa54', '#7db45b'];

export function desenharLadrilho(ctx: C, x: number, y: number) {
	const tipo = pisoDaCelula(x, y);
	const losango = [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)];
	const v = sorteio(x, y);

	if (tipo === 'grama') {
		poli(ctx, losango, GRAMA[Math.floor(v * GRAMA.length)]);
		const tufo = sorteio(x, y, 3);
		if (tufo < 0.22) {
			const c = P(x + 0.3 + tufo, y + 0.6 - tufo);
			for (const dx of [-3, 0, 3]) segmento(ctx, { x: c.x + dx, y: c.y }, { x: c.x + dx * 1.4, y: c.y - 5 }, '#5e9442', 1.2);
		}
		if (sorteio(x, y, 5) < 0.06) {
			const c = P(x + 0.5, y + 0.5);
			const cores = ['#ffffff', '#ffd166', '#f78fb3'];
			for (let i = 0; i < 3; i++) bolha(ctx, c.x + (i - 1) * 5, c.y + (i % 2) * 3, 1.8, cores[(i + Math.floor(v * 9)) % 3]);
		}
		return;
	}
	if (tipo === 'calcada') {
		poli(ctx, losango, v < 0.5 ? '#d9cebb' : '#d4c8b3', '#c3b59c');
		return;
	}
	if (tipo === 'asfalto') {
		poli(ctx, losango, v < 0.5 ? '#5d6470' : '#59606c');
		return;
	}

	const sala = SALA_POR_ID.get(zonaDaCelula(x, y) ?? '');
	const base = sala?.corPiso ?? '#e6dfd2';
	switch (tipo) {
		case 'madeira': {
			poli(ctx, losango, (x + y) % 2 ? base : tom(base, 0.97));
			for (const k of [0.25, 0.5, 0.75]) segmento(ctx, P(x, y + k), P(x + 1, y + k), tom(base, 0.88), 0.8);
			const corte = 0.2 + sorteio(x, y, 2) * 0.6;
			segmento(ctx, P(x + corte, y), P(x + corte, y + 0.25), tom(base, 0.88), 0.8);
			break;
		}
		case 'carpete':
			poli(ctx, losango, tom(base, 0.985 + v * 0.03));
			break;
		case 'piso':
			poli(ctx, losango, (x + y) % 2 ? base : tom(base, 0.965), tom(base, 0.9));
			break;
		case 'tech': {
			poli(ctx, losango, base, 'rgba(34, 184, 207, 0.22)');
			if (v < 0.08) bolha(ctx, P(x + 0.5, y + 0.5).x, P(x + 0.5, y + 0.5).y, 1.6, 'rgba(34,184,207,0.7)');
			break;
		}
		case 'estudio':
			poli(ctx, losango, base, 'rgba(255,255,255,0.05)');
			break;
		case 'marmore':
			poli(ctx, losango, ((x >> 1) + (y >> 1)) % 2 ? base : tom(base, 0.97), tom(base, 0.92));
			break;
		case 'cozinha':
			poli(ctx, losango, (x + y) % 2 ? base : tom(base, 0.93), tom(base, 0.88));
			break;
		default:
			poli(ctx, losango, base, tom(base, 0.93));
	}
}

export function desenharTapete(ctx: C, t: Tapete) {
	const { x0, y0, x1, y1, cor } = t;
	const z = 0.01;
	switch (t.variante) {
		case 'faixa':
			quadZ(ctx, z, x0, y0, x1, y1, cor);
			return;
		case 'capacho':
			quadZ(ctx, z, x0, y0, x1, y1, cor, tom(cor, 0.7));
			textoNoChao(ctx, 'BEM-VINDO', (x0 + x1) / 2, (y0 + y1) / 2, 9, '#e9dcc8');
			return;
		case 'logo': {
			const cx = (x0 + x1) / 2;
			const cy = (y0 + y1) / 2;
			const r = (x1 - x0) / 2;
			elipseChao(ctx, cx, cy, z, r, tom(cor, 0.9));
			elipseChao(ctx, cx, cy, z, r * 0.9, cor);
			elipseChao(ctx, cx, cy, z, r * 0.72, undefined, 'rgba(255,255,255,0.55)');
			textoNoChao(ctx, 'D', cx, cy - 0.12, 40, '#ffffff', 900);
			textoNoChao(ctx, 'DUNAMIS', cx + 0.02, cy + 0.62, 10, '#ffffff', 800);
			return;
		}
		case 'redondo': {
			const cx = (x0 + x1) / 2;
			const cy = (y0 + y1) / 2;
			const r = (x1 - x0) / 2;
			elipseChao(ctx, cx, cy, z, r, cor);
			elipseChao(ctx, cx, cy, z, r * 0.7, tom(cor, 1.25));
			elipseChao(ctx, cx, cy, z, r * 0.4, tom(cor, 0.9));
			return;
		}
		case 'listras': {
			quadZ(ctx, z, x0, y0, x1, y1, cor);
			const n = 6;
			for (let i = 0; i < n; i += 2) {
				const a = y0 + ((y1 - y0) * i) / n;
				quadZ(ctx, z, x0 + 0.12, a + 0.12, x1 - 0.12, a + (y1 - y0) / n, tom(cor, 1.25));
			}
			quadZ(ctx, z, x0, y0, x1, y1, undefined, tom(cor, 0.75));
			return;
		}
		default:
			quadZ(ctx, z, x0, y0, x1, y1, cor);
			quadZ(ctx, z, x0 + 0.18, y0 + 0.18, x1 - 0.18, y1 - 0.18, undefined, tom(cor, 1.3));
	}
}

// -------------------------------------------------------------------- paredes

const PAREDE = '#e9e2d5';
const PAREDE_TOPO = '#fbf8f2';
const ESPESSURA = 0.14;

export function caixaDoSegmento(s: Segmento): Caixa {
	const e = ESPESSURA / 2;
	const h = s.alta ? 2.1 : 0.62;
	return s.orient === 'x'
		? { x0: s.x - e, y0: s.y - e, z0: 0, x1: s.x + 1 + e, y1: s.y + e, z1: h }
		: { x0: s.x - e, y0: s.y - e, z0: 0, x1: s.x + e, y1: s.y + 1 + e, z1: h };
}

export function desenharSegmento(ctx: C, s: Segmento) {
	const c = caixaDoSegmento(s);
	caixa(ctx, c.x0, c.y0, c.z0, c.x1, c.y1, c.z1, PAREDE, {
		topo: PAREDE_TOPO,
		faceY: s.alta ? '#efe8dc' : '#e2d9c9',
		faceX: s.alta ? '#e3dacb' : '#cdc2ae'
	});
	if (s.alta) {
		// Rodapé
		const e = ESPESSURA / 2;
		const face = s.orient === 'x' ? new Face('y', s.y + e, s.x - e, 1 + 2 * e) : new Face('x', s.x + e, s.y - e, 1 + 2 * e);
		face.ret(ctx, 0, face.largura, 0, 0.1, '#cbbda6');
	}
}

/** Janela, TV, quadros e letreiro das paredes altas do fundo. */
export function desenharDecoracoes(ctx: C, t: number) {
	const e = ESPESSURA / 2;
	for (const d of DECORACOES) desenharDecoracao(ctx, d, e, t);
}

function desenharDecoracao(ctx: C, d: Decoracao, e: number, t: number) {
	const f = d.linha === 'h' ? new Face('y', d.y + e, d.x, d.largura) : new Face('x', d.x + e, d.y, d.largura);
	const L = d.largura;
	switch (d.tipo) {
		case 'janela': {
			f.ret(ctx, 0.12, L - 0.12, 0.72, 1.82, '#ffffff', LINHA);
			const a = f.p(0, 1.78);
			const b = f.p(0, 0.76);
			const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
			g.addColorStop(0, '#cfeaf9');
			g.addColorStop(1, '#94cbea');
			f.ret(ctx, 0.18, L - 0.18, 0.78, 1.76, g);
			f.ret(ctx, 0.18, L - 0.18, 0.78, 1.05, 'rgba(98, 160, 92, 0.55)');
			f.linha(ctx, L / 2, 0.78, L / 2, 1.76, '#ffffff', 2);
			f.linha(ctx, 0.18, 1.3, L - 0.18, 1.3, '#ffffff', 2);
			f.linha(ctx, 0.28, 1.6, 0.42, 1.74, 'rgba(255,255,255,0.7)', 2);
			f.ret(ctx, 0.08, L - 0.08, 0.68, 0.74, '#f4efe6', LINHA);
			break;
		}
		case 'tv': {
			f.ret(ctx, 0.12, L - 0.12, 0.78, 1.72, '#141922', LINHA);
			f.ret(ctx, 0.18, L - 0.18, 0.84, 1.66, '#fbfbfd');
			f.ret(ctx, 0.18, L - 0.18, 1.5, 1.66, '#ff6f00');
			f.texto(ctx, 'Planejamento 2027', L / 2, 1.58, 6, '#ffffff', 700);
			for (let i = 0; i < 3; i++) f.ret(ctx, 0.32, 0.32 + 0.6 - i * 0.12, 1.36 - i * 0.12, 1.4 - i * 0.12, '#c4cad4');
			const barras = [0.18, 0.26, 0.34, 0.46];
			barras.forEach((h, i) => f.ret(ctx, 1.12 + i * 0.16, 1.22 + i * 0.16, 0.94, 0.94 + h, i === 3 ? '#ff6f00' : '#3b6ef6'));
			break;
		}
		case 'metas': {
			f.ret(ctx, 0.1, L - 0.1, 0.7, 1.76, '#cfd5de', LINHA);
			f.ret(ctx, 0.15, L - 0.15, 0.75, 1.71, '#ffffff');
			f.texto(ctx, 'METAS DO MÊS', L / 2, 1.6, 6.5, '#1c2534', 800);
			const alturas = [0.22, 0.3, 0.38, 0.5, 0.62];
			alturas.forEach((h, i) => f.ret(ctx, 0.35 + i * 0.27, 0.53 + i * 0.27, 0.86, 0.86 + h, i === 4 ? '#17b26a' : '#e0662a'));
			f.linha(ctx, 0.25, 1.38, L - 0.25, 1.38, '#f04438', 1.5);
			f.texto(ctx, '120%', L - 0.36, 1.45, 5, '#f04438', 800);
			break;
		}
		case 'mapa': {
			f.ret(ctx, 0.1, L - 0.1, 0.78, 1.72, '#1c2534', LINHA);
			const cores = ['#ff6f00', '#f5a524', '#3b6ef6', '#17b26a'];
			const letras = ['M', 'A', 'P', 'A'];
			const w = (L - 0.4) / 4;
			cores.forEach((c, i) => {
				f.ret(ctx, 0.2 + i * w + 0.03, 0.2 + (i + 1) * w - 0.03, 0.92, 1.42, c);
				f.texto(ctx, letras[i], 0.2 + i * w + w / 2, 1.17, 13, '#ffffff', 900);
			});
			f.texto(ctx, 'MÉTODO MAPA', L / 2, 1.58, 6, '#e9edf5', 800);
			break;
		}
		case 'neon': {
			f.ret(ctx, 0.1, L - 0.1, 0.85, 1.65, '#1a2232', LINHA);
			const pulso = 0.75 + 0.25 * Math.sin(t * 2.4);
			f.texto(ctx, '</> IA', L / 2, 1.25, 17, `rgba(103, 232, 249, ${pulso})`, 900, '#22d3ee');
			break;
		}
		case 'quadro': {
			f.ret(ctx, 0.2, L - 0.2, 0.95, 1.65, '#8b6243', LINHA);
			f.ret(ctx, 0.26, L - 0.26, 1.01, 1.59, '#f6efe1');
			f.elipse(ctx, L / 2 - 0.08, 1.32, 0.13, 0.14, '#e0662a');
			f.ret(ctx, L / 2, L / 2 + 0.18, 1.08, 1.26, '#3b6ef6');
			break;
		}
		case 'calendario': {
			f.ret(ctx, 0.1, L - 0.1, 0.72, 1.78, '#cfd5de', LINHA);
			f.ret(ctx, 0.15, L - 0.15, 0.77, 1.73, '#ffffff');
			f.texto(ctx, 'CALENDÁRIO EDITORIAL', L / 2, 1.64, 5.5, '#1c2534', 800);
			const cores = ['#f6a6b6', '#ffd166', '#9ad0ec', '#b9e4c9', '#d6c4f2'];
			for (let linha = 0; linha < 4; linha++) {
				for (let col = 0; col < 7; col++) {
					const u0 = 0.25 + col * 0.215;
					const z0 = 1.42 - linha * 0.17;
					const n = sorteio(col, linha, 11);
					f.ret(ctx, u0, u0 + 0.18, z0, z0 + 0.13, n < 0.55 ? cores[Math.floor(n * 9) % 5] : '#eef1f5');
				}
			}
			break;
		}
	}
}

// ---------------------------------------------------------------- conteúdo de tela

function conteudoTela(ctx: C, f: Face, u0: number, u1: number, z0: number, z1: number, tipo: string | undefined, t: number) {
	const w = u1 - u0;
	const h = z1 - z0;
	const escuro = tipo === 'codigo' || tipo === 'dashboard';
	f.ret(ctx, u0, u1, z0, z1, escuro ? '#0f1724' : '#f6f8fb');
	const U = (k: number) => u0 + w * k;
	const Z = (k: number) => z0 + h * k;
	switch (tipo) {
		case 'codigo': {
			const cores = ['#67e8f9', '#f472b6', '#fde68a', '#a5b4fc', '#e2e8f0'];
			for (let i = 0; i < 6; i++) {
				const recuo = [0, 0.1, 0.2, 0.2, 0.1, 0][i];
				const tam = 0.25 + sorteio(i, Math.floor(u0 * 10), 4) * 0.45;
				f.ret(ctx, U(0.08 + recuo), U(Math.min(0.92, 0.08 + recuo + tam)), Z(0.84 - i * 0.14), Z(0.9 - i * 0.14), cores[i % cores.length]);
			}
			if (Math.sin(t * 6) > 0) f.ret(ctx, U(0.5), U(0.56), Z(0.04), Z(0.12), '#ffffff');
			break;
		}
		case 'planilha': {
			f.ret(ctx, u0, u1, Z(0.82), z1, '#17b26a');
			for (let i = 1; i < 4; i++) f.linha(ctx, U(i / 4), z0, U(i / 4), Z(0.82), '#cfd6e0', 0.8);
			for (let i = 1; i < 5; i++) f.linha(ctx, u0, Z(i * 0.16), u1, Z(i * 0.16), '#cfd6e0', 0.8);
			break;
		}
		case 'grafico':
		case 'crm':
			if (tipo === 'crm') {
				for (let col = 0; col < 3; col++) {
					f.ret(ctx, U(0.06 + col * 0.31), U(0.31 + col * 0.31), Z(0.08), Z(0.92), '#e6ebf2');
					for (let k = 0; k < 3 - col; k++) {
						f.ret(ctx, U(0.09 + col * 0.31), U(0.28 + col * 0.31), Z(0.72 - k * 0.24), Z(0.86 - k * 0.24), ['#3b6ef6', '#f5a524', '#17b26a'][col]);
					}
				}
			} else {
				[0.35, 0.55, 0.45, 0.8].forEach((a, i) => f.ret(ctx, U(0.1 + i * 0.21), U(0.24 + i * 0.21), Z(0.08), Z(0.08 + a * 0.8), i === 3 ? '#e0662a' : '#3b6ef6'));
				f.linha(ctx, U(0.1), Z(0.4), U(0.9), Z(0.9), '#17b26a', 1.2);
			}
			break;
		case 'texto':
			f.ret(ctx, U(0.1), U(0.7), Z(0.78), Z(0.88), '#1c2534');
			for (let i = 0; i < 4; i++) f.ret(ctx, U(0.1), U(0.9 - (i % 2) * 0.2), Z(0.58 - i * 0.15), Z(0.64 - i * 0.15), '#c4cad4');
			break;
		case 'social':
			['#f6a6b6', '#ffd166', '#9ad0ec', '#b9e4c9'].forEach((c, i) => {
				const col = i % 2;
				const lin = Math.floor(i / 2);
				f.ret(ctx, U(0.1 + col * 0.42), U(0.46 + col * 0.42), Z(0.52 - lin * 0.44), Z(0.88 - lin * 0.44), c);
			});
			break;
		case 'design':
			f.elipse(ctx, U(0.32), Z(0.55), w * 0.18, h * 0.28, '#7c5cd6');
			f.ret(ctx, U(0.55), U(0.85), Z(0.3), Z(0.7), '#f5a524');
			['#e0662a', '#3b6ef6', '#17b26a', '#f6a6b6'].forEach((c, i) => f.ret(ctx, U(0.1 + i * 0.2), U(0.26 + i * 0.2), Z(0.06), Z(0.16), c));
			break;
		case 'dashboard': {
			f.ret(ctx, U(0.06), U(0.94), Z(0.86), Z(0.95), '#1f2a3d');
			['#17b26a', '#f5a524', '#3b6ef6'].forEach((c, i) => {
				f.ret(ctx, U(0.06 + i * 0.3), U(0.32 + i * 0.3), Z(0.62), Z(0.8), '#18233a');
				f.ret(ctx, U(0.09 + i * 0.3), U(0.2 + i * 0.3), Z(0.68), Z(0.72), c);
			});
			const pts: Ponto[] = [];
			for (let i = 0; i <= 10; i++) {
				const k = i / 10;
				const onda = 0.18 + k * 0.28 + Math.sin(k * 9 + t * 1.2) * 0.04;
				pts.push(f.p(U(0.06 + k * 0.88), Z(0.08 + onda)));
			}
			ctx.beginPath();
			pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
			ctx.strokeStyle = '#67e8f9';
			ctx.lineWidth = 1.6;
			ctx.stroke();
			break;
		}
	}
}

// ---------------------------------------------------------------------- móveis

const LIVROS = ['#c0392b', '#2e86c1', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22', '#ecf0f1', '#34495e'];
const FOLHAS = { sombra: '#2f7a3d', meio: '#43974a', luz: '#62b35a', brilho: '#86c96b' };

function folhagem(ctx: C, c: Ponto, bolhas: [number, number, number][], cores = FOLHAS) {
	for (const [dx, dy, r] of bolhas) bolha(ctx, c.x + dx + 1.5, c.y + dy + 2, r, cores.sombra);
	for (const [dx, dy, r] of bolhas) bolha(ctx, c.x + dx, c.y + dy, r * 0.94, cores.meio);
	for (const [dx, dy, r] of bolhas) bolha(ctx, c.x + dx - r * 0.25, c.y + dy - r * 0.3, r * 0.5, cores.luz);
	const [bx, by, br] = bolhas[0];
	bolha(ctx, c.x + bx - br * 0.35, c.y + by - br * 0.45, br * 0.22, cores.brilho);
}

function mesa(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	const cor = it.cor ?? '#f3f0ea';
	const zt = h - 0.06;
	sombra(ctx, it);
	if (it.variante === 'executiva') {
		caixa(ctx, x + 0.06, y + 0.08, 0, x + w - 0.06, y + d - 0.04, zt, tom(cor, 0.9));
	} else {
		const perna = cor === '#f3f0ea' ? '#9aa3b2' : tom(cor, 0.6);
		const l = 0.07;
		for (const [px, py] of [
			[x + 0.04, y + 0.04],
			[x + w - 0.04 - l, y + 0.04],
			[x + 0.04, y + d - 0.04 - l],
			[x + w - 0.04 - l, y + d - 0.04 - l]
		]) {
			caixa(ctx, px, py, 0, px + l, py + l, zt, perna, { linha: false });
		}
	}
	caixa(ctx, x, y, zt, x + w, y + d, h, cor, { topo: tom(cor, 1.05) });
	// Caneca e papéis em cima, para a mesa não parecer de vitrine.
	if (it.variante !== 'executiva') {
		cilindro(ctx, x + w - 0.22, y + 0.25, 0.06, h, h + 0.11, '#ffffff');
		quadZ(ctx, h + 0.002, x + 0.15, y + 0.2, x + 0.42, y + 0.5, '#ffffff', 'rgba(0,0,0,0.12)');
	} else {
		quadZ(ctx, h + 0.002, x + 0.3, y + 0.2, x + 0.75, y + 0.6, '#f6f1e6', 'rgba(0,0,0,0.15)');
		cilindro(ctx, x + w - 0.35, y + 0.35, 0.07, h, h + 0.12, '#1c2534');
	}
}

function monitor(ctx: C, it: Item, t: number) {
	const { x, y, w, d, h, z } = it;
	const cx = x + w / 2;
	// Teclado na frente da tela.
	if (it.frente === 'y') quadZ(ctx, z + 0.005, x + w * 0.15, y + d + 0.1, x + w * 0.85, y + d + 0.28, '#2a303b');
	caixa(ctx, cx - 0.05, y, z, cx + 0.05, y + d, z + 0.14, '#3a404b', { linha: false });
	caixa(ctx, x, y, z + 0.12, x + w, y + d, z + h, '#1d2330');
	const f = faceFrente(it);
	if (f) conteudoTela(ctx, f, 0.04, f.largura - 0.04, z + 0.16, z + h - 0.04, it.variante, t);
	else {
		// De costas: só a carcaça e um ponto de logo.
		const c = P(cx, y + d, z + h * 0.6);
		bolha(ctx, c.x, c.y, 1.6, '#55606f');
	}
}

function cadeira(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	const cor = it.cor ?? '#2f3a4f';
	const cx = x + w / 2;
	const cy = y + d / 2;
	elipseChao(ctx, cx, cy, 0, w * 0.55, SOMBRA);
	if (it.variante === 'diretor') {
		for (const [px, py] of [[x, y], [x + w - 0.05, y], [x, y + d - 0.05], [x + w - 0.05, y + d - 0.05]]) {
			caixa(ctx, px, py, 0, px + 0.05, py + 0.05, 0.5, '#8a6a4a', { linha: false });
		}
		caixa(ctx, x, y, 0.45, x + w, y + d, 0.52, cor);
		caixa(ctx, x + w - 0.06, y, 0.52, x + w, y + d, h, cor);
		return;
	}
	quadZ(ctx, 0.02, cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, '#1b1f27');
	caixa(ctx, cx - 0.035, cy - 0.035, 0.02, cx + 0.035, cy + 0.035, 0.38, '#4a505b', { linha: false });
	const zs = it.variante === 'executiva' ? 0.42 : 0.38;
	const zt = zs + 0.09;
	const e = 0.09;
	const encostoAtras = it.frente === 'y' || it.frente === 'x';
	const encosto = () => {
		if (it.frente === 'y') caixa(ctx, x + 0.03, y, zt, x + w - 0.03, y + e, h, cor);
		else if (it.frente === '-y') caixa(ctx, x + 0.03, y + d - e, zt, x + w - 0.03, y + d, h, cor);
		else if (it.frente === 'x') caixa(ctx, x, y + 0.03, zt, x + e, y + d - 0.03, h, cor);
		else caixa(ctx, x + w - e, y + 0.03, zt, x + w, y + d - 0.03, h, cor);
	};
	if (encostoAtras) encosto();
	caixa(ctx, x, y, zs, x + w, y + d, zt, cor, { topo: tom(cor, 1.12) });
	if (!encostoAtras) encosto();
}

function planta(ctx: C, it: Item) {
	const grande = it.variante === 'grande';
	const { x, y, w, d } = it;
	const hv = grande ? 0.45 : 0.32;
	sombra(ctx, it, 0.04);
	caixa(ctx, x, y, 0, x + w, y + d, hv, grande ? '#efebe3' : '#c8734d');
	quadZ(ctx, hv + 0.001, x + 0.04, y + 0.04, x + w - 0.04, y + d - 0.04, '#5a4030');
	const c = P(x + w / 2, y + d / 2, hv + (grande ? 0.62 : 0.38));
	folhagem(
		ctx,
		c,
		grande
			? [[0, -12, 13], [-10, -2, 11], [10, -2, 11], [0, 6, 10], [-5, -22, 9], [6, -20, 8]]
			: [[0, -4, 9], [-7, 2, 7], [7, 2, 7], [0, -11, 6]]
	);
}

function estante(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	const madeira = '#8b6243';
	sombra(ctx, it);
	caixa(ctx, x, y, 0, x + w, y + d, h, madeira);
	const f = faceFrente(it);
	if (!f) return;
	f.ret(ctx, 0.06, f.largura - 0.06, 0.06, h - 0.06, '#5b3f2a');
	const prateleiras = 4;
	const passo = (h - 0.12) / prateleiras;
	for (let p = 0; p < prateleiras; p++) {
		const zb = 0.06 + p * passo;
		f.ret(ctx, 0.06, f.largura - 0.06, zb, zb + 0.04, madeira);
		let u = 0.1;
		let k = 0;
		while (u < f.largura - 0.12) {
			const s = sorteio(p, k, it.id.length + 3);
			const largura = 0.06 + s * 0.07;
			if (s > 0.9) {
				u += 0.18;
				k++;
				continue;
			}
			const alto = passo * (0.55 + s * 0.3);
			f.ret(ctx, u, Math.min(u + largura, f.largura - 0.08), zb + 0.04, zb + 0.04 + alto, LIVROS[Math.floor(s * LIVROS.length)]);
			u += largura + 0.01;
			k++;
		}
	}
}

function arquivo(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	sombra(ctx, it);
	caixa(ctx, x, y, 0, x + w, y + d, h, '#c5ccd6');
	const f = faceFrente(it);
	if (!f) return;
	for (let i = 0; i < 3; i++) {
		const z0 = 0.06 + (i * (h - 0.1)) / 3;
		const z1 = z0 + (h - 0.1) / 3 - 0.04;
		f.ret(ctx, 0.05, f.largura - 0.05, z0, z1, '#d6dce4', LINHA);
		f.ret(ctx, f.largura / 2 - 0.12, f.largura / 2 + 0.12, z1 - 0.1, z1 - 0.06, '#5b6576');
	}
}

function cofre(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	sombra(ctx, it);
	caixa(ctx, x, y, 0, x + w, y + d, h, '#4a5160');
	const f = faceFrente(it);
	if (!f) return;
	f.ret(ctx, 0.06, f.largura - 0.06, 0.06, h - 0.06, '#545c6c', 'rgba(0,0,0,0.35)');
	f.elipse(ctx, f.largura * 0.42, h * 0.55, 0.12, 0.13, '#c9cfd8', 'rgba(0,0,0,0.4)');
	f.elipse(ctx, f.largura * 0.42, h * 0.55, 0.04, 0.045, '#3a404b');
	f.ret(ctx, f.largura * 0.7, f.largura * 0.76, h * 0.35, h * 0.75, '#c9cfd8');
}

function sofa(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	const cor = it.cor ?? '#3f4d63';
	const base = tom(cor, 0.88);
	const zb = 0.26;
	const za = 0.38;
	const braco = 0.55;
	const e = 0.2;
	const b = 0.15;
	sombra(ctx, it);
	caixa(ctx, x, y, 0, x + w, y + d, zb, base);
	const longoEmY = it.frente === 'x' || it.frente === '-x';
	const almofadas = () => {
		if (longoEmY) {
			const ix0 = it.frente === 'x' ? x + e : x;
			const ix1 = it.frente === 'x' ? x + w : x + w - e;
			const meio = y + d / 2;
			caixa(ctx, ix0, y + b, zb, ix1, meio - 0.01, za, cor, { topo: tom(cor, 1.1) });
			caixa(ctx, ix0, meio + 0.01, zb, ix1, y + d - b, za, cor, { topo: tom(cor, 1.1) });
		} else {
			const iy0 = it.frente === 'y' ? y + e : y;
			const iy1 = it.frente === 'y' ? y + d : y + d - e;
			const meio = x + w / 2;
			caixa(ctx, x + b, iy0, zb, meio - 0.01, iy1, za, cor, { topo: tom(cor, 1.1) });
			caixa(ctx, meio + 0.01, iy0, zb, x + w - b, iy1, za, cor, { topo: tom(cor, 1.1) });
		}
	};
	if (longoEmY) {
		if (it.frente === 'x') caixa(ctx, x, y + b, zb, x + e, y + d - b, h, cor);
		caixa(ctx, x, y, zb, x + w, y + b, braco, cor);
		almofadas();
		caixa(ctx, x, y + d - b, zb, x + w, y + d, braco, cor);
		if (it.frente === '-x') caixa(ctx, x + w - e, y + b, zb, x + w, y + d - b, h, cor);
	} else {
		if (it.frente === 'y') caixa(ctx, x + b, y, zb, x + w - b, y + e, h, cor);
		caixa(ctx, x, y, zb, x + b, y + d, braco, cor);
		almofadas();
		caixa(ctx, x + w - b, y, zb, x + w, y + d, braco, cor);
		if (it.frente === '-y') caixa(ctx, x + b, y + d - e, zb, x + w - b, y + d, h, cor);
	}
}

function mesaCentro(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	const cor = it.cor ?? '#5d3f2a';
	if (it.variante === 'redonda') {
		const cx = x + w / 2;
		const cy = y + d / 2;
		elipseChao(ctx, cx, cy, 0, w * 0.42, SOMBRA);
		cilindro(ctx, cx, cy, 0.06, 0, h - 0.05, '#4a505b', false);
		cilindro(ctx, cx, cy, w / 2, h - 0.05, h, cor);
		cilindro(ctx, cx - 0.15, cy + 0.05, 0.06, h, h + 0.1, '#ffffff');
		cilindro(ctx, cx + 0.18, cy - 0.12, 0.06, h, h + 0.1, '#e0662a');
		return;
	}
	sombra(ctx, it);
	caixa(ctx, x + 0.08, y + 0.08, 0, x + w - 0.08, y + d - 0.08, h - 0.05, tom(cor, 0.8));
	caixa(ctx, x, y, h - 0.05, x + w, y + d, h, cor);
	quadZ(ctx, h + 0.002, x + 0.2, y + 0.25, x + 0.55, y + 0.6, '#f2b33d');
}

function mesaReuniao(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	const cor = it.cor ?? '#f4f1eb';
	sombra(ctx, it);
	for (const px of [x + 0.7, x + w - 1.1]) caixa(ctx, px, y + d / 2 - 0.22, 0, px + 0.4, y + d / 2 + 0.22, h - 0.06, '#3b4252');
	caixa(ctx, x, y, h - 0.06, x + w, y + d, h, cor, { topo: tom(cor, 1.03) });
	// Notebooks e copos.
	for (const [lx, ly] of [[x + 0.6, y + 0.45], [x + 2.4, y + 1.2]]) {
		quadZ(ctx, h + 0.003, lx, ly, lx + 0.5, ly + 0.34, '#c9ced6', LINHA);
		const f = new Face('y', ly + 0.04, lx, 0.5);
		f.ret(ctx, 0.02, 0.48, h + 0.01, h + 0.3, '#2b3240', LINHA);
		f.ret(ctx, 0.05, 0.45, h + 0.04, h + 0.27, '#9ad0ec');
	}
	cilindro(ctx, x + 1.6, y + 0.6, 0.06, h, h + 0.12, '#ffffff');
	cilindro(ctx, x + 3.3, y + 1.35, 0.06, h, h + 0.12, '#ffffff');
	cilindro(ctx, x + 2.0, y + 1.0, 0.12, h, h + 0.08, '#43974a');
}

function tvPainel(ctx: C, it: Item, t: number) {
	const { x, y, w, d, h } = it;
	sombra(ctx, it);
	for (const py of [y + 0.25, y + d - 0.35]) caixa(ctx, x, py, 0, x + w, py + 0.1, 0.06, '#2b303a', { linha: false });
	caixa(ctx, x + w / 2 - 0.03, y + d / 2 - 0.03, 0, x + w / 2 + 0.03, y + d / 2 + 0.03, 0.6, '#4a505b', { linha: false });
	caixa(ctx, x + w * 0.35, y, 0.5, x + w * 0.65, y + d, h, '#151a23');
	const f = new Face('x', x + w * 0.65, y, d);
	conteudoTela(ctx, f, 0.06, d - 0.06, 0.56, h - 0.06, it.variante, t);
}

function quadro(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	for (const py of [y + 0.05, y + d - 0.1]) caixa(ctx, x, py, 0, x + w, py + 0.05, 0.08, '#4a505b', { linha: false });
	for (const py of [y + 0.08, y + d - 0.13]) caixa(ctx, x + w / 2 - 0.025, py, 0, x + w / 2 + 0.025, py + 0.05, h - 0.05, '#7a8291', { linha: false });
	caixa(ctx, x + w / 2 - 0.06, y, 0.45, x + w / 2 + 0.06, y + d, h, '#d9dde3');
	const f = new Face('x', x + w / 2 + 0.06, y, d);
	f.ret(ctx, 0.05, d - 0.05, 0.5, h - 0.05, '#ffffff');
	if (it.variante === 'moodboard') {
		const cores = ['#f6a6b6', '#7c5cd6', '#ffd166', '#4fb6a8', '#e0662a', '#3b6ef6'];
		cores.forEach((c, i) => {
			const col = i % 3;
			const lin = Math.floor(i / 3);
			const u0 = 0.15 + col * ((d - 0.3) / 3);
			f.ret(ctx, u0, u0 + (d - 0.3) / 3 - 0.06, h - 0.2 - lin * 0.36 - 0.28, h - 0.2 - lin * 0.36, c);
		});
		['#1c2534', '#f5a524', '#e0662a', '#ffffff'].forEach((c, i) => f.elipse(ctx, 0.3 + i * 0.3, 0.66, 0.08, 0.06, c, LINHA));
	} else {
		f.texto(ctx, 'PAUTA', d / 2, h - 0.15, 7, '#1c2534', 800);
		for (let i = 0; i < 4; i++) {
			const z = h - 0.32 - i * 0.18;
			f.ret(ctx, 0.15, 0.25, z - 0.05, z + 0.05, i < 2 ? '#17b26a' : '#e6e9f1', LINHA);
			f.ret(ctx, 0.32, d - 0.25 - (i % 2) * 0.3, z - 0.02, z + 0.02, '#9aa3b2');
		}
	}
}

function rack(ctx: C, it: Item, t: number) {
	const { x, y, w, d, h } = it;
	sombra(ctx, it);
	caixa(ctx, x, y, 0, x + w, y + d, h, '#1f2633');
	const f = faceFrente(it);
	if (!f) return;
	const n = 9;
	for (let i = 0; i < n; i++) {
		const z0 = 0.12 + i * ((h - 0.24) / n);
		const z1 = z0 + (h - 0.24) / n - 0.03;
		f.ret(ctx, 0.07, f.largura - 0.07, z0, z1, '#2a3344');
		for (let k = 0; k < 3; k++) {
			const s = sorteio(i, k, it.id.length);
			const aceso = Math.sin(t * (2 + s * 6) + s * 20) > -0.2;
			const cor = k === 0 ? '#22c55e' : k === 1 ? '#22d3ee' : '#f5a524';
			f.ret(ctx, f.largura - 0.3 + k * 0.07, f.largura - 0.26 + k * 0.07, (z0 + z1) / 2 - 0.015, (z0 + z1) / 2 + 0.015, aceso ? cor : '#3a4558');
		}
		f.ret(ctx, 0.12, 0.35, (z0 + z1) / 2 - 0.01, (z0 + z1) / 2 + 0.01, '#3e4a5e');
	}
}

function nucleo(ctx: C, it: Item, t: number) {
	const cx = it.x + it.w / 2;
	const cy = it.y + it.d / 2;
	const r = it.w / 2;
	elipseChao(ctx, cx, cy, 0, r * 1.05, 'rgba(34, 211, 238, 0.12)');
	cilindro(ctx, cx, cy, r * 0.85, 0, 0.22, '#3a465c');
	elipseChao(ctx, cx, cy, 0.22, r * 0.6, undefined, 'rgba(103, 232, 249, 0.9)');
	const zOrbe = 1.15 + Math.sin(t * 1.6) * 0.06;
	const base = P(cx, cy, 0.22);
	const orbe = P(cx, cy, zOrbe);
	// Feixe de luz
	const g = ctx.createLinearGradient(0, base.y, 0, orbe.y);
	g.addColorStop(0, 'rgba(34, 211, 238, 0.35)');
	g.addColorStop(1, 'rgba(34, 211, 238, 0)');
	poli(ctx, [{ x: base.x - 16, y: base.y }, { x: base.x + 16, y: base.y }, { x: orbe.x + 5, y: orbe.y }, { x: orbe.x - 5, y: orbe.y }], g);
	// Anéis girando
	ctx.save();
	ctx.strokeStyle = 'rgba(103, 232, 249, 0.7)';
	ctx.lineWidth = 1.4;
	for (let i = 0; i < 2; i++) {
		ctx.beginPath();
		ctx.ellipse(orbe.x, orbe.y, 22 - i * 5, 7 + i * 3, t * (i ? -0.9 : 0.7), 0, Math.PI * 2);
		ctx.stroke();
	}
	const rg = ctx.createRadialGradient(orbe.x - 3, orbe.y - 3, 1, orbe.x, orbe.y, 13);
	rg.addColorStop(0, '#ffffff');
	rg.addColorStop(0.35, '#a5f3fc');
	rg.addColorStop(1, '#0891b2');
	ctx.shadowColor = '#22d3ee';
	ctx.shadowBlur = 18;
	bolha(ctx, orbe.x, orbe.y, 11 + Math.sin(t * 3) * 0.8, rg);
	ctx.restore();
}

function balcao(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	sombra(ctx, it);
	caixa(ctx, x, y, 0, x + w, y + d, h - 0.07, '#f4f1eb');
	caixa(ctx, x - 0.05, y - 0.05, h - 0.07, x + w + 0.05, y + d + 0.05, h, '#2b2f38');
	const f = faceFrente(it);
	if (!f) return;
	f.ret(ctx, 0, f.largura, 0.1, 0.2, '#ff6f00');
	f.texto(ctx, 'DUNAMIS', f.largura / 2, 0.58, 15, '#1c2534', 900);
	f.texto(ctx, 'COMPANY', f.largura / 2, 0.38, 6, '#ff6f00', 800);
	// Monitor da recepção, de costas para quem chega.
	caixa(ctx, x + 1.1, y + 0.15, h, x + 1.9, y + 0.23, h + 0.4, '#1d2330');
	cilindro(ctx, x + 2.5, y + 0.4, 0.09, h, h + 0.08, '#43974a');
}

function bancada(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	sombra(ctx, it);
	caixa(ctx, x, y, 0, x + w, y + d, h - 0.05, '#f4f1eb');
	caixa(ctx, x, y, h - 0.05, x + w, y + d, h, '#b9b2a6');
	quadZ(ctx, h + 0.002, x + w - 1.2, y + 0.15, x + w - 0.5, y + 0.6, '#8d96a3', LINHA);
	const f = faceFrente(it);
	if (!f) return;
	const portas = 4;
	for (let i = 0; i < portas; i++) {
		const u0 = 0.05 + (i * (f.largura - 0.1)) / portas;
		const u1 = u0 + (f.largura - 0.1) / portas - 0.04;
		f.ret(ctx, u0, u1, 0.08, h - 0.12, '#ebe6dc', LINHA);
		f.ret(ctx, u1 - 0.12, u1 - 0.08, h - 0.4, h - 0.2, '#7a8291');
	}
}

function cafeteira(ctx: C, it: Item) {
	const { x, y, w, d, h, z } = it;
	caixa(ctx, x, y, z, x + w, y + d, z + h, '#22262e');
	caixa(ctx, x + 0.06, y + d - 0.1, z + 0.08, x + w - 0.06, y + d, z + 0.16, '#9aa3b2', { linha: false });
	cilindro(ctx, x + w / 2, y + d + 0.08, 0.05, z, z + 0.09, '#ffffff');
	cilindro(ctx, x + w + 0.2, y + d / 2, 0.05, z, z + 0.09, '#e0662a');
}

function geladeira(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	sombra(ctx, it);
	caixa(ctx, x, y, 0, x + w, y + d, h, '#e7ebef');
	const f = faceFrente(it);
	if (!f) return;
	f.linha(ctx, 0.04, h * 0.62, f.largura - 0.04, h * 0.62, 'rgba(0,0,0,0.25)');
	f.ret(ctx, 0.1, 0.14, h * 0.68, h * 0.9, '#7a8291');
	f.ret(ctx, 0.1, 0.14, h * 0.3, h * 0.55, '#7a8291');
	f.ret(ctx, 0.4, 0.5, h * 0.78, h * 0.84, '#f6a6b6');
	f.ret(ctx, 0.55, 0.62, h * 0.72, h * 0.8, '#ffd166');
}

function pufe(ctx: C, it: Item) {
	const cx = it.x + it.w / 2;
	const cy = it.y + it.d / 2;
	const cor = it.cor ?? '#f2b33d';
	elipseChao(ctx, cx, cy, 0, it.w * 0.52, SOMBRA);
	const c = P(cx, cy, it.h * 0.42);
	const rx = RX * it.w * 0.5;
	ctx.beginPath();
	ctx.ellipse(c.x, c.y, rx, rx * 0.72, 0, 0, Math.PI * 2);
	ctx.fillStyle = tom(cor, 0.9);
	ctx.fill();
	ctx.strokeStyle = LINHA;
	ctx.lineWidth = estilo.lw;
	ctx.stroke();
	ctx.beginPath();
	ctx.ellipse(c.x - rx * 0.12, c.y - rx * 0.22, rx * 0.72, rx * 0.4, 0, 0, Math.PI * 2);
	ctx.fillStyle = tom(cor, 1.12);
	ctx.fill();
}

function pingPong(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	sombra(ctx, it);
	for (const [px, py] of [[x + 0.2, y + 0.15], [x + w - 0.3, y + 0.15], [x + 0.2, y + d - 0.25], [x + w - 0.3, y + d - 0.25]]) {
		caixa(ctx, px, py, 0, px + 0.08, py + 0.08, h - 0.05, '#2b303a', { linha: false });
	}
	caixa(ctx, x, y, h - 0.05, x + w, y + d, h, '#2f7d57', { topo: '#2f8a5b' });
	quadZ(ctx, h + 0.002, x + 0.05, y + 0.05, x + w - 0.05, y + d - 0.05, undefined, '#ffffff');
	segmento(ctx, P(x + 0.05, y + d / 2, h + 0.002), P(x + w - 0.05, y + d / 2, h + 0.002), '#ffffff', 1);
	caixa(ctx, x + w / 2 - 0.015, y - 0.05, h, x + w / 2 + 0.015, y + d + 0.05, h + 0.13, '#f4f4f4', { linha: 'rgba(0,0,0,0.25)' });
	const r1 = P(x + 0.5, y + 0.45, h + 0.01);
	const r2 = P(x + w - 0.45, y + d - 0.4, h + 0.01);
	bolha(ctx, r1.x, r1.y, 4, '#d63c3c');
	bolha(ctx, r2.x, r2.y, 4, '#22262e');
	const bola = P(x + w * 0.3, y + d * 0.6, h + 0.08);
	bolha(ctx, bola.x, bola.y, 1.8, '#ffffff');
}

function camera(ctx: C, it: Item, t: number) {
	const cx = it.x + it.w / 2;
	const cy = it.y + it.d / 2;
	const topo = P(cx, cy, 0.95);
	for (const [dx, dy] of [[-0.25, -0.15], [0.2, -0.2], [0.05, 0.27]]) segmento(ctx, topo, P(cx + dx, cy + dy, 0), '#2b303a', 1.6);
	caixa(ctx, cx - 0.16, cy - 0.12, 0.95, cx + 0.16, cy + 0.12, 1.2, '#22262e');
	// De costas para quem joga: aparece a telinha.
	const f = new Face('x', cx + 0.16, cy - 0.12, 0.24);
	f.ret(ctx, 0.03, 0.21, 0.99, 1.15, '#3b82c4');
	cilindro(ctx, cx - 0.22, cy, 0.07, 1.0, 1.14, '#151820', false);
	if (Math.sin(t * 4) > 0) {
		const rec = P(cx + 0.1, cy - 0.08, 1.22);
		bolha(ctx, rec.x, rec.y, 2, '#ef4444');
	}
}

function softbox(ctx: C, it: Item) {
	const cx = it.x + it.w / 2;
	const cy = it.y + it.d / 2;
	const topo = P(cx, cy, 1.2);
	for (const [dx, dy] of [[-0.22, -0.12], [0.18, -0.18], [0.04, 0.24]]) segmento(ctx, topo, P(cx + dx, cy + dy, 0), '#2b303a', 1.4);
	caixa(ctx, cx - 0.3, cy - 0.06, 1.2, cx + 0.3, cy + 0.12, 1.75, '#22262e');
	ctx.save();
	ctx.shadowColor = 'rgba(255, 246, 214, 0.9)';
	ctx.shadowBlur = 16;
	new Face('y', cy + 0.12, cx - 0.3, 0.6).ret(ctx, 0.04, 0.56, 1.24, 1.71, '#fffbea');
	ctx.restore();
}

function fundo(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	// Varredura do papel no chão
	const g = ctx.createLinearGradient(P(x + w, y + d / 2).x, P(x + w, y + d / 2).y, P(x + w + 1.4, y + d / 2).x, P(x + w + 1.4, y + d / 2).y);
	g.addColorStop(0, '#f1f1ef');
	g.addColorStop(1, '#dededb');
	poli(ctx, [P(x + w, y, 0.01), P(x + w + 1.35, y, 0.01), P(x + w + 1.35, y + d, 0.01), P(x + w, y + d, 0.01)], g);
	for (const py of [y - 0.08, y + d + 0.02]) caixa(ctx, x, py, 0, x + 0.06, py + 0.06, h + 0.08, '#3a404b', { linha: false });
	caixa(ctx, x, y, 0.02, x + w, y + d, h, '#f7f7f5', { faceX: '#f3f3f1' });
	caixa(ctx, x - 0.03, y - 0.1, h, x + w + 0.03, y + d + 0.1, h + 0.1, '#2f343d');
}

function prancheta(ctx: C, it: Item) {
	const { x, y, w, d } = it;
	sombra(ctx, it);
	for (const [px, py] of [[x + 0.05, y + 0.05], [x + w - 0.1, y + 0.05], [x + 0.05, y + d - 0.1], [x + w - 0.1, y + d - 0.1]]) {
		caixa(ctx, px, py, 0, px + 0.05, py + 0.05, 0.8, '#7a8291', { linha: false });
	}
	poli(ctx, [P(x, y, 0.78), P(x + w, y, 1.05), P(x + w, y + d, 1.05), P(x, y + d, 0.78)], '#f4f1eb', LINHA);
	poli(ctx, [P(x + 0.12, y + 0.15, 0.82), P(x + w - 0.12, y + 0.15, 1.01), P(x + w - 0.12, y + d - 0.15, 1.01), P(x + 0.12, y + d - 0.15, 0.82)], '#ffffff', 'rgba(0,0,0,0.12)');
	const a = P(x + 0.3, y + 0.35, 0.87);
	const b = P(x + 0.6, y + 0.75, 0.95);
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.quadraticCurveTo(a.x + 14, a.y - 12, b.x, b.y);
	ctx.strokeStyle = '#7c5cd6';
	ctx.lineWidth = 1.5;
	ctx.stroke();
}

function bebedouro(ctx: C, it: Item) {
	const { x, y, w, d } = it;
	sombra(ctx, it);
	caixa(ctx, x, y, 0, x + w, y + d, 0.85, '#eef1f5');
	cilindro(ctx, x + w / 2, y + d / 2, 0.18, 0.85, 1.25, '#8ccff0');
	const c = P(x + w / 2, y + d, 0.55);
	bolha(ctx, c.x, c.y, 2.2, '#3b6ef6');
}

function luzAnel(ctx: C, it: Item) {
	const cx = it.x + it.w / 2;
	const cy = it.y + it.d / 2;
	const topo = P(cx, cy, 1.25);
	for (const [dx, dy] of [[-0.22, -0.12], [0.18, -0.18], [0.04, 0.24]]) segmento(ctx, P(cx, cy, 0.5), P(cx + dx, cy + dy, 0), '#2b303a', 1.4);
	segmento(ctx, P(cx, cy, 0.5), topo, '#3a404b', 2);
	ctx.save();
	ctx.shadowColor = 'rgba(255, 250, 230, 0.9)';
	ctx.shadowBlur = 14;
	ctx.beginPath();
	ctx.ellipse(topo.x, topo.y - 8, 11, 13, 0, 0, Math.PI * 2);
	ctx.strokeStyle = '#fffdf2';
	ctx.lineWidth = 4;
	ctx.stroke();
	ctx.restore();
	ctx.fillStyle = '#1c2534';
	ctx.fillRect(topo.x - 3, topo.y - 15, 6, 11);
}

function arvore(ctx: C, it: Item) {
	const cx = it.x + it.w / 2;
	const cy = it.y + it.d / 2;
	const v = sorteio(Math.floor(cx), Math.floor(cy), 9);
	const escala = 0.85 + v * 0.35;
	elipseChao(ctx, cx + 0.25, cy + 0.1, 0, 0.75 * escala, 'rgba(20, 50, 20, 0.18)');
	caixa(ctx, cx - 0.07, cy - 0.07, 0, cx + 0.07, cy + 0.07, 0.95, '#7a5233', { linha: false });
	const c = P(cx, cy, 1.55 * escala);
	const k = escala;
	folhagem(
		ctx,
		c,
		[
			[0, -6 * k, 22 * k],
			[-15 * k, 6 * k, 16 * k],
			[15 * k, 6 * k, 16 * k],
			[0, 12 * k, 15 * k],
			[-8 * k, -20 * k, 14 * k],
			[10 * k, -18 * k, 13 * k]
		],
		v < 0.5 ? FOLHAS : { sombra: '#2c6b33', meio: '#3d8740', luz: '#5aa64f', brilho: '#7fc06a' }
	);
}

function pinheiro(ctx: C, it: Item) {
	const cx = it.x + it.w / 2;
	const cy = it.y + it.d / 2;
	elipseChao(ctx, cx + 0.2, cy + 0.08, 0, 0.55, 'rgba(20, 50, 20, 0.18)');
	caixa(ctx, cx - 0.06, cy - 0.06, 0, cx + 0.06, cy + 0.06, 0.6, '#6b4630', { linha: false });
	const base = P(cx, cy, 0.45);
	const camadas: [number, number, number][] = [
		[0, 30, 34],
		[22, 25, 30],
		[42, 18, 26]
	];
	for (const [sobe, meia, alto] of camadas) {
		const by = base.y - sobe;
		poli(ctx, [{ x: base.x, y: by - alto }, { x: base.x + meia, y: by }, { x: base.x - meia, y: by }], '#2e6b45');
		poli(ctx, [{ x: base.x, y: by - alto }, { x: base.x, y: by }, { x: base.x - meia, y: by }], '#3f8a57');
	}
}

function arbusto(ctx: C, it: Item) {
	const cx = it.x + it.w / 2;
	const cy = it.y + it.d / 2;
	elipseChao(ctx, cx, cy, 0, 0.4, SOMBRA);
	const c = P(cx, cy, 0.3);
	folhagem(ctx, c, [[0, -3, 10], [-9, 2, 8], [9, 2, 8]]);
	if (sorteio(Math.floor(cx), 1, 2) < 0.5) {
		for (const [dx, dy] of [[-6, -4], [4, -7], [7, 1]]) bolha(ctx, c.x + dx, c.y + dy, 1.8, '#f78fb3');
	}
}

function carro(ctx: C, it: Item) {
	const { x, y, w, d } = it;
	const cor = it.cor ?? '#3b6ef6';
	quadZ(ctx, 0, x - 0.05, y - 0.05, x + w + 0.1, y + d + 0.1, 'rgba(0,0,0,0.22)');
	for (const [px, py] of [[x - 0.02, y + 0.25], [x + w - 0.1, y + 0.25], [x - 0.02, y + d - 0.5], [x + w - 0.1, y + d - 0.5]]) {
		caixa(ctx, px, py, 0, px + 0.12, py + 0.3, 0.24, '#1b1f27', { linha: false });
	}
	caixa(ctx, x, y, 0.14, x + w, y + d, 0.46, cor);
	caixa(ctx, x + 0.08, y + 0.5, 0.46, x + w - 0.08, y + d - 0.45, 0.74, tom(cor, 1.08));
	const vidro = '#2b3a4f';
	new Face('y', y + d - 0.45, x + 0.08, w - 0.16).ret(ctx, 0.04, w - 0.2, 0.49, 0.71, vidro);
	const lado = new Face('x', x + w - 0.08, y + 0.5, d - 0.95);
	lado.ret(ctx, 0.05, (d - 0.95) / 2 - 0.03, 0.49, 0.71, vidro);
	lado.ret(ctx, (d - 0.95) / 2 + 0.03, d - 1.0, 0.49, 0.71, vidro);
	const frente = new Face('y', y + d, x, w);
	frente.ret(ctx, 0.06, 0.2, 0.3, 0.38, '#fff3b0');
	frente.ret(ctx, w - 0.2, w - 0.06, 0.3, 0.38, '#fff3b0');
}

function placa(ctx: C, it: Item) {
	const { x, y, w, d, h } = it;
	sombra(ctx, it, 0.1);
	caixa(ctx, x, y, 0, x + w, y + d, 0.24, '#9b9286');
	caixa(ctx, x + 0.12, y + 0.1, 0.24, x + w - 0.12, y + d - 0.1, h, '#1c2534');
	const f = new Face('y', y + d - 0.1, x + 0.12, w - 0.24);
	f.ret(ctx, 0.08, 0.16, 0.36, h - 0.1, '#ff6f00');
	f.texto(ctx, 'DUNAMIS', f.largura / 2 + 0.06, h - 0.38, 19, '#ffffff', 900);
	f.texto(ctx, 'COMPANY · SOROCABA', f.largura / 2 + 0.06, 0.48, 6.5, '#ff9a3d', 800);
}

function banco(ctx: C, it: Item) {
	const { x, y, w, d } = it;
	sombra(ctx, it);
	for (const px of [x + 0.1, x + w - 0.18]) caixa(ctx, px, y + 0.05, 0, px + 0.08, y + d - 0.05, 0.36, '#3a404b', { linha: false });
	caixa(ctx, x, y - 0.02, 0.62, x + w, y + 0.08, 0.82, '#a8733f');
	caixa(ctx, x, y, 0.36, x + w, y + d, 0.43, '#b98048');
}

function poste(ctx: C, it: Item) {
	const cx = it.x + it.w / 2;
	const cy = it.y + it.d / 2;
	caixa(ctx, cx - 0.1, cy - 0.1, 0, cx + 0.1, cy + 0.1, 0.12, '#2b303a', { linha: false });
	caixa(ctx, cx - 0.035, cy - 0.035, 0.12, cx + 0.035, cy + 0.035, it.h - 0.2, '#3a404b', { linha: false });
	caixa(ctx, cx - 0.12, cy - 0.12, it.h - 0.2, cx + 0.12, cy + 0.12, it.h - 0.05, '#2b303a');
	const luz = P(cx, cy, it.h - 0.22);
	const g = ctx.createRadialGradient(luz.x, luz.y, 0, luz.x, luz.y, 22);
	g.addColorStop(0, 'rgba(255, 236, 170, 0.75)');
	g.addColorStop(1, 'rgba(255, 236, 170, 0)');
	bolha(ctx, luz.x, luz.y, 22, g);
}

const DESENHOS: Record<Item['tipo'], (ctx: C, it: Item, t: number) => void> = {
	mesa,
	monitor,
	cadeira,
	planta,
	estante,
	arquivo,
	cofre,
	sofa,
	mesaCentro,
	mesaReuniao,
	tvPainel,
	quadro,
	rack,
	nucleo,
	balcao,
	bancada,
	cafeteira,
	geladeira,
	pufe,
	pingPong,
	camera,
	softbox,
	fundo,
	prancheta,
	bebedouro,
	luzAnel,
	arvore,
	pinheiro,
	arbusto,
	carro,
	placa,
	banco,
	poste
};

export function desenharItem(ctx: C, it: Item, t: number) {
	DESENHOS[it.tipo](ctx, it, t);
}

/** Caixa usada para ordenar e clicar. Folhagem e luz contam na altura. */
export function caixaDoItem(it: Item): Caixa {
	return { x0: it.x, y0: it.y, z0: it.z, x1: it.x + it.w, y1: it.y + it.d, z1: it.z + it.h };
}
