// O bonequinho do DGathe, montado a partir da aparência escolhida no perfil.
//
// Estilo cartoon (pedido do Bruno, 09/11/2026): cabeça grande e redonda, olhos
// grandes com brilho, bochecha rosada, sorriso aberto, contorno escuro em tudo
// e sombra chapada do lado direito (a luz do jogo vem da esquerda).
//
// Desenhado em px de tela do zoom 1 (uns 54 px de altura), com os pés na
// origem. Olha para o lado em que anda: de frente quando desce na tela, de
// costas quando sobe, espelhado quando vai para a esquerda. A mesma função
// desenha no jogo e na prévia do editor (Meu Perfil), só que maior.
//
// Camadas: pernas e sapatos → saia → cabelo de trás → braço de trás → tronco
// e roupa → orelhas, cabeça e rosto → cabelo da frente (ou o de costas) →
// óculos → braço da frente.

import { paraTela, tom } from './iso';
import { APARENCIA_PADRAO, CORES_CABELO, PELES, corDe, type Aparencia } from './aparencia';

type C = CanvasRenderingContext2D;

export type Pose = {
	x: number;
	y: number;
	/** Direção do último passo, em coordenadas de mundo. */
	dirX: number;
	dirY: number;
	andando: boolean;
	/** Fase da passada (cresce enquanto anda). */
	fase: number;
	/** Relógio, para a respiração parado. */
	t: number;
};

const CONTORNO = '#232a3a';
const LW = 1.05;
const SOMBRA = 'rgba(16, 20, 32, 0.16)';
const FORMAIS_COM_CINTO = new Set(['terno', 'blazer', 'social']);
const MANGA_CURTA = new Set(['camiseta', 'polo']);
const GRAVATA = '#ff6f00';
const DENIM = '#4a6fa5';
const JEANS = '#3d5a80';

// Cabeça
const CY = -40.5;
const R = 9.6;

// ------------------------------------------------------------------ primitivas

/** Preenche o caminho desenhado por `f` e passa o contorno escuro. */
function forma(ctx: C, f: () => void, cor: string | CanvasGradient, lw = LW) {
	ctx.beginPath();
	f();
	ctx.fillStyle = cor;
	ctx.fill();
	if (lw > 0) {
		ctx.strokeStyle = CONTORNO;
		ctx.lineWidth = lw;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.stroke();
	}
}

/** Sombra chapada no lado direito de um caminho (a luz vem da esquerda). */
function sombraDireita(ctx: C, f: () => void, xDe: number, cor = SOMBRA) {
	ctx.save();
	ctx.beginPath();
	f();
	ctx.clip();
	ctx.fillStyle = cor;
	ctx.fillRect(xDe, -70, 40, 80);
	ctx.restore();
}

const capsula = (ctx: C, x: number, y0: number, y1: number, largura: number) => () => {
	const r = largura / 2;
	ctx.moveTo(x - r, y0 + r);
	ctx.arc(x, y0 + r, r, Math.PI, 0);
	ctx.lineTo(x + r, y1 - r);
	ctx.arc(x, y1 - r, r, 0, Math.PI);
	ctx.closePath();
};

const oval = (ctx: C, x: number, y: number, rx: number, ry: number, rot = 0) => () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);

const caixa = (ctx: C, x: number, y: number, w: number, h: number, r: number | number[]) => () => ctx.roundRect(x, y, w, h, r);

function poligono(ctx: C, pts: [number, number][]) {
	return () => {
		ctx.moveTo(pts[0][0], pts[0][1]);
		for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
		ctx.closePath();
	};
}

function traco(ctx: C, x0: number, y0: number, x1: number, y1: number, cor = CONTORNO, lw = 0.8) {
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.strokeStyle = cor;
	ctx.lineWidth = lw;
	ctx.lineCap = 'round';
	ctx.stroke();
}

function ponto(ctx: C, x: number, y: number, r: number, cor: string) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fillStyle = cor;
	ctx.fill();
}

/** Contorno do tronco: reto no masculino; ombro mais estreito e cintura marcada no feminino. */
function tronco(ctx: C, feminino: boolean) {
	return () => {
		if (feminino) {
			ctx.moveTo(-3.6, -30.5);
			ctx.lineTo(3.6, -30.5);
			ctx.quadraticCurveTo(6.6, -30.5, 6.6, -27.4);
			ctx.lineTo(5.2, -21.6);
			ctx.quadraticCurveTo(6.4, -17.6, 6.4, -14);
			ctx.lineTo(-6.4, -14);
			ctx.quadraticCurveTo(-6.4, -17.6, -5.2, -21.6);
			ctx.lineTo(-6.6, -27.4);
			ctx.quadraticCurveTo(-6.6, -30.5, -3.6, -30.5);
			ctx.closePath();
		} else ctx.roundRect(-7.2, -30.5, 14.4, 16.5, [4.6, 4.6, 2.4, 2.4]);
	};
}

// ------------------------------------------------------------------- boneco

/** Corpo, roupa e acessórios com os pés na origem (sem translação de mundo). */
export function desenharBoneco(
	ctx: C,
	p: { dirX: number; dirY: number; andando: boolean; fase: number; t: number },
	a: Aparencia = APARENCIA_PADRAO
) {
	const telaX = p.dirX - p.dirY;
	const telaY = p.dirX + p.dirY;
	const esquerda = telaX < -0.05;
	const deFrente = telaY >= -0.05;
	const feminino = a.corpo === 'feminino';

	const pele = corDe(PELES, a.pele);
	const cabelo = corDe(CORES_CABELO, a.corCabelo);
	const roupa = a.corRoupa;
	const clara = parseInt(roupa.slice(1, 3), 16) * 0.3 + parseInt(roupa.slice(3, 5), 16) * 0.59 + parseInt(roupa.slice(5, 7), 16) * 0.11 > 150;
	const vestido = a.roupa === 'vestido';
	const calca = vestido ? null : a.roupa === 'terno' ? tom(roupa, 0.88) : FORMAIS_COM_CINTO.has(a.roupa) ? '#2b3240' : JEANS;

	const passo = p.andando ? Math.sin(p.fase) : 0;
	const sobe = p.andando ? Math.abs(Math.sin(p.fase)) * 1.4 : Math.sin(p.t * 2) * 0.4;

	// Sombra no chão
	ctx.beginPath();
	ctx.ellipse(0, -0.4, 10.5, 4.4, 0, 0, Math.PI * 2);
	ctx.fillStyle = 'rgba(16, 24, 40, 0.24)';
	ctx.fill();

	ctx.save();
	if (esquerda) ctx.scale(-1, 1);

	// Pernas e sapatos
	const pernas: [number, number][] = [
		[-3 + passo * 2.4, Math.max(0, passo) * 1.5],
		[3 - passo * 2.4, Math.max(0, -passo) * 1.5]
	];
	for (const [px, ergue] of pernas) {
		if (calca) {
			const perna = capsula(ctx, px, -16 - sobe, -2.4 - ergue, 5.2);
			forma(ctx, perna, calca);
			sombraDireita(ctx, perna, px + 0.9);
		} else forma(ctx, capsula(ctx, px, -9 - sobe, -2.4 - ergue, 4.2), pele);
		desenharSapato(ctx, a.sapato, px, -ergue);
	}

	ctx.translate(0, -sobe);

	// Saia do vestido, por cima do alto das pernas
	if (vestido) {
		const saia = poligono(ctx, [[-5.8, -15.6], [5.8, -15.6], [8.2, -7.4], [-8.2, -7.4]]);
		forma(ctx, saia, roupa);
		sombraDireita(ctx, saia, 2.6);
		traco(ctx, -7.6, -8.6, 7.6, -8.6, tom(roupa, 0.72), 0.9);
	}

	if (deFrente) cabeloAtras(ctx, a.cabelo, cabelo);

	// Braços
	const balanco = passo * 0.5;
	const manga = a.roupa === 'jeans' ? DENIM : roupa;
	const ombro = feminino ? 6.4 : 7.2;
	const braco = (lado: number, angulo: number) => {
		ctx.save();
		ctx.translate(lado * ombro, -28.6);
		ctx.rotate(angulo);
		if (vestido) forma(ctx, capsula(ctx, 0, 0, 12.4, 3.9), pele);
		else if (MANGA_CURTA.has(a.roupa)) {
			forma(ctx, capsula(ctx, 0, 0, 12.4, 3.9), pele);
			forma(ctx, capsula(ctx, 0, -0.2, 5.6, 4.6), manga);
		} else {
			const b = capsula(ctx, 0, 0, 12.4, 4.4);
			forma(ctx, b, manga);
			sombraDireita(ctx, b, 0.8);
		}
		forma(ctx, oval(ctx, 0, 12.6, 2.5, 2.5), pele);
		ctx.restore();
	};
	braco(-1, balanco);

	// Tronco e roupa
	const corpo = tronco(ctx, feminino);
	ctx.beginPath();
	corpo();
	ctx.fillStyle = a.roupa === 'jeans' ? DENIM : roupa;
	ctx.fill();
	ctx.save();
	ctx.beginPath();
	corpo();
	ctx.clip();
	desenharRoupa(ctx, a.roupa, roupa, clara, pele, deFrente);
	ctx.fillStyle = SOMBRA;
	ctx.fillRect(3.4, -32, 6, 20);
	ctx.restore();
	ctx.beginPath();
	corpo();
	ctx.strokeStyle = CONTORNO;
	ctx.lineWidth = LW;
	ctx.stroke();

	// Pescoço, orelhas e cabeça
	forma(ctx, caixa(ctx, -2.1, -32.4, 4.2, 2.6, 1), tom(pele, 0.9), 0.8);
	forma(ctx, oval(ctx, -R + 0.3, CY + 0.8, 2, 2.6), pele);
	forma(ctx, oval(ctx, R - 0.3, CY + 0.8, 2, 2.6), pele);
	const cabeca = oval(ctx, 0, CY, R, R);
	forma(ctx, cabeca, pele);
	sombraDireita(ctx, cabeca, 5.4, 'rgba(120, 60, 30, 0.12)');
	ctx.beginPath();
	cabeca();
	ctx.strokeStyle = CONTORNO;
	ctx.lineWidth = LW;
	ctx.stroke();

	if (deFrente) {
		desenharRosto(ctx, feminino, pele, cabelo);
		cabeloFrente(ctx, a.cabelo, cabelo);
		desenharOculos(ctx, a.oculos);
	} else cabeloCostas(ctx, a.cabelo, cabelo);

	braco(1, -balanco);
	ctx.restore();
}

function desenharRosto(ctx: C, feminino: boolean, pele: string, cabelo: string) {
	const olhos = [-2.7, 3.7];
	// Bochechas
	for (const x of [-5.5, 6.4]) {
		ctx.beginPath();
		ctx.ellipse(x, -36.4, 1.9, 1.15, 0, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(236, 104, 116, 0.42)';
		ctx.fill();
	}
	// Sobrancelhas
	for (const x of olhos) {
		ctx.beginPath();
		ctx.moveTo(x - 1.6, -43.5);
		ctx.quadraticCurveTo(x, -44.6, x + 1.5, -43.7);
		ctx.strokeStyle = tom(cabelo, 0.7);
		ctx.lineWidth = 0.95;
		ctx.lineCap = 'round';
		ctx.stroke();
	}
	// Olhos grandes com brilho
	for (const x of olhos) {
		ctx.beginPath();
		ctx.ellipse(x, -40.3, 1.45, 1.95, 0, 0, Math.PI * 2);
		ctx.fillStyle = '#1f2230';
		ctx.fill();
		ponto(ctx, x + 0.45, -41.1, 0.6, '#ffffff');
		if (feminino) {
			traco(ctx, x - 1.2, -41.6, x - 2.3, -42.5, '#1f2230', 0.7);
			traco(ctx, x - 0.4, -42.1, x - 0.9, -43.2, '#1f2230', 0.6);
		}
	}
	// Nariz
	ctx.beginPath();
	ctx.arc(1, -38.2, 0.95, 0.05 * Math.PI, 0.95 * Math.PI);
	ctx.strokeStyle = tom(pele, 0.62);
	ctx.lineWidth = 0.75;
	ctx.stroke();
	// Sorriso aberto, com dentes e língua
	const boca = () => {
		ctx.moveTo(-1.7, -35.7);
		ctx.quadraticCurveTo(1, -31.6, 3.7, -35.7);
		ctx.closePath();
	};
	ctx.save();
	ctx.beginPath();
	boca();
	ctx.fillStyle = feminino ? '#8f2a40' : '#7a2530';
	ctx.fill();
	ctx.clip();
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(-2, -35.9, 6, 0.95);
	ctx.beginPath();
	ctx.ellipse(1, -33.2, 1.3, 0.75, 0, 0, Math.PI * 2);
	ctx.fillStyle = '#e8707a';
	ctx.fill();
	ctx.restore();
	ctx.beginPath();
	boca();
	ctx.strokeStyle = CONTORNO;
	ctx.lineWidth = 0.75;
	ctx.stroke();
}

function desenharSapato(ctx: C, tipo: string, px: number, y: number) {
	const sola = (cor: string) => traco(ctx, px - 2.4, y - 0.6, px + 3.8, y - 0.6, cor, 1);
	switch (tipo) {
		case 'bota':
			forma(ctx, caixa(ctx, px - 2.9, y - 7.4, 7.2, 7.2, [2.2, 2.8, 1, 1]), '#5a3d26');
			sola('#2e1f14');
			traco(ctx, px - 2.4, y - 5.2, px + 1.2, y - 5.2, '#7a5536', 0.7);
			break;
		case 'salto':
			forma(ctx, caixa(ctx, px - 1.8, y - 2.9, 5.6, 2.4, [1.2, 2, 0.8, 0.8]), '#1c1f26');
			forma(ctx, caixa(ctx, px - 1.9, y - 1.2, 1.2, 1.4, 0.3), '#1c1f26', 0.6);
			break;
		case 'tenis':
			forma(ctx, caixa(ctx, px - 2.8, y - 3.5, 7.2, 3.5, [1.8, 2.6, 1, 1]), '#f5f5f2');
			sola('#c4cad3');
			traco(ctx, px - 0.6, y - 2.6, px + 1.4, y - 2.6, '#9aa3b2', 0.6);
			break;
		case 'tenisPreto':
			forma(ctx, caixa(ctx, px - 2.8, y - 3.5, 7.2, 3.5, [1.8, 2.6, 1, 1]), '#2a2d35');
			sola('#f2f2f2');
			break;
		case 'marrom':
			forma(ctx, caixa(ctx, px - 2.6, y - 3.2, 6.8, 3.2, [1.6, 2.4, 1, 1]), '#6b4426');
			ponto(ctx, px + 1.6, y - 2.3, 0.5, 'rgba(255,255,255,0.35)');
			break;
		default:
			forma(ctx, caixa(ctx, px - 2.6, y - 3.2, 6.8, 3.2, [1.6, 2.4, 1, 1]), '#1c1f26');
			ponto(ctx, px + 1.6, y - 2.3, 0.5, 'rgba(255,255,255,0.35)');
	}
}

function desenharRoupa(ctx: C, tipo: string, cor: string, clara: boolean, pele: string, deFrente: boolean) {
	const escura = tom(cor, 0.76);
	const cinto = () => {
		forma(ctx, caixa(ctx, -8, -16, 16, 2, 0.6), '#1c1f26', 0.6);
		forma(ctx, caixa(ctx, -0.6, -16.2, 2.4, 2.4, 0.5), '#c9a24a', 0.5);
	};
	if (!deFrente) {
		// Costas: costura no meio; o moletom mostra o capuz; o xadrez continua xadrez.
		if (tipo === 'moletom') forma(ctx, oval(ctx, 0, -28.6, 6, 3.6), escura, 0.8);
		else if (tipo === 'xadrez') xadrez(ctx, cor);
		else if (tipo === 'jeans') traco(ctx, -7, -22, 7, -22, '#8aa6d2', 0.7);
		traco(ctx, 0, -29, 0, -16, 'rgba(0,0,0,0.2)', 0.8);
		if (FORMAIS_COM_CINTO.has(tipo)) forma(ctx, caixa(ctx, -8, -16, 16, 2, 0.6), '#1c1f26', 0.6);
		return;
	}
	const golaV = (abertura: number, fundo: number, cor2: string) =>
		forma(ctx, poligono(ctx, [[-abertura, -30.6], [abertura + 0.6, -30.6], [0.3, fundo]]), cor2, 0.7);
	switch (tipo) {
		case 'terno':
			golaV(3, -23.6, '#ffffff');
			forma(ctx, poligono(ctx, [[0.3, -29.6], [1.6, -27.4], [0.3, -20.4], [-1, -27.4]]), GRAVATA, 0.6);
			forma(ctx, poligono(ctx, [[-3, -30.6], [-0.9, -25], [-4, -26]]), escura, 0.6);
			forma(ctx, poligono(ctx, [[3.6, -30.6], [1.8, -25], [4.8, -26]]), escura, 0.6);
			ponto(ctx, 0.6, -18.6, 0.6, escura);
			forma(ctx, caixa(ctx, -6, -24.4, 3, 0.9, 0.3), escura, 0);
			break;
		case 'blazer':
			golaV(3.8, -21.6, '#f4f1eb');
			forma(ctx, poligono(ctx, [[-1.6, -30.6], [2.2, -30.6], [0.3, -28.4]]), pele, 0);
			forma(ctx, poligono(ctx, [[-3.8, -30.6], [-0.9, -23.4], [-4.6, -24.6]]), escura, 0.6);
			forma(ctx, poligono(ctx, [[4.4, -30.6], [1.8, -23.4], [5.4, -24.6]]), escura, 0.6);
			ponto(ctx, 0.6, -18.6, 0.6, escura);
			break;
		case 'social':
			forma(ctx, poligono(ctx, [[-3.2, -30.6], [0.3, -28], [-2.2, -26.6]]), tom(cor, 1.3), 0.6);
			forma(ctx, poligono(ctx, [[3.8, -30.6], [0.3, -28], [2.8, -26.6]]), tom(cor, 1.3), 0.6);
			forma(ctx, poligono(ctx, [[0.3, -28.4], [1.5, -26.2], [0.3, -19.6], [-0.9, -26.2]]), clara ? '#1c2534' : GRAVATA, 0.6);
			for (const y of [-21, -18]) ponto(ctx, 0.3, y, 0.45, tom(cor, 0.6));
			forma(ctx, caixa(ctx, -5.6, -25.8, 2.8, 2.6, 0.4), tom(cor, 0.92), 0.5);
			break;
		case 'vestido':
			forma(ctx, oval(ctx, 0.3, -30.6, 3.4, 2.4), pele, 0.7);
			forma(ctx, caixa(ctx, -7, -21.4, 14, 1.6, 0.6), escura, 0.6);
			break;
		case 'camiseta':
			forma(ctx, oval(ctx, 0.3, -30.6, 2.8, 1.8), pele, 0.7);
			forma(ctx, oval(ctx, -2.8, -23, 1.8, 1.8), tom(cor, 1.25), 0.5);
			break;
		case 'polo':
			forma(ctx, oval(ctx, 0.3, -30.6, 2.4, 1.6), pele, 0.7);
			forma(ctx, poligono(ctx, [[-3.2, -30.6], [0.3, -28.8], [-2.4, -27.4]]), tom(cor, 1.25), 0.6);
			forma(ctx, poligono(ctx, [[3.8, -30.6], [0.3, -28.8], [3, -27.4]]), tom(cor, 1.25), 0.6);
			traco(ctx, 0.3, -28.6, 0.3, -25, escura, 0.8);
			for (const y of [-27.4, -25.8]) ponto(ctx, 0.3, y, 0.45, '#ffffff');
			break;
		case 'xadrez':
			xadrez(ctx, cor);
			forma(ctx, poligono(ctx, [[-3.2, -30.6], [0.3, -28], [-2.2, -26.6]]), tom(cor, 1.25), 0.6);
			forma(ctx, poligono(ctx, [[3.8, -30.6], [0.3, -28], [2.8, -26.6]]), tom(cor, 1.25), 0.6);
			traco(ctx, 0.3, -28, 0.3, -14.4, 'rgba(0,0,0,0.3)', 0.6);
			for (const y of [-24, -20.5, -17]) ponto(ctx, 0.3, y, 0.42, '#f4f1eb');
			break;
		case 'jaqueta':
			forma(ctx, caixa(ctx, -2, -30.6, 4.6, 17, 0), '#ecebf0', 0.6);
			forma(ctx, oval(ctx, 0.3, -30.6, 2.4, 1.5), pele, 0.6);
			forma(ctx, caixa(ctx, -7, -20, 3.4, 2.6, 0.5), escura, 0.5);
			forma(ctx, caixa(ctx, 4, -20, 3.2, 2.6, 0.5), escura, 0.5);
			forma(ctx, caixa(ctx, -7.4, -15.6, 14.8, 1.8, 0.7), escura, 0.6);
			break;
		case 'jeans':
			forma(ctx, caixa(ctx, -2, -30.6, 4.6, 17, 0), cor, 0.6);
			forma(ctx, oval(ctx, 0.3, -30.6, 2.4, 1.5), pele, 0.6);
			forma(ctx, caixa(ctx, -6.4, -27, 3.4, 3, 0.5), tom(DENIM, 0.86), 0.5);
			forma(ctx, caixa(ctx, 3.6, -27, 3.2, 3, 0.5), tom(DENIM, 0.86), 0.5);
			traco(ctx, -6.8, -17, 6.8, -17, '#8aa6d2', 0.6);
			break;
		case 'moletom':
			forma(ctx, oval(ctx, 0.3, -30.2, 5.2, 2.6), escura, 0.7);
			forma(ctx, oval(ctx, 0.3, -30.6, 2.6, 1.6), pele, 0.6);
			traco(ctx, -1.2, -28.8, -1.4, -24.8, '#f4f4f2', 0.6);
			traco(ctx, 1.8, -28.8, 2, -24.8, '#f4f4f2', 0.6);
			forma(ctx, caixa(ctx, -4.2, -20, 9, 4.8, 1.8), tom(cor, 0.9), 0.6);
			break;
	}
	if (FORMAIS_COM_CINTO.has(tipo)) cinto();
}

function xadrez(ctx: C, cor: string) {
	const risco = tom(cor, 0.66);
	ctx.globalAlpha = 0.55;
	for (let y = -29; y < -14; y += 3.6) traco(ctx, -9, y, 9, y, risco, 1.1);
	for (let x = -6.6; x < 9; x += 3.6) traco(ctx, x, -32, x, -14, risco, 1.1);
	ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ cabelo

/** Brilho do cabelo: um arco claro no alto, do lado da luz. */
function brilho(ctx: C, cor: string, y = -48.6, cx = -1.5, raio = 7.2) {
	ctx.beginPath();
	ctx.arc(cx, y + raio, raio, Math.PI * 1.18, Math.PI * 1.42);
	ctx.strokeStyle = tom(cor, 1.45);
	ctx.lineWidth = 1.1;
	ctx.lineCap = 'round';
	ctx.stroke();
}

/** Cabelo que fica atrás do corpo e da cabeça, quando o boneco está de frente. */
function cabeloAtras(ctx: C, estilo: string, cor: string) {
	switch (estilo) {
		case 'longo':
			forma(ctx, caixa(ctx, -11.2, -52, 22.4, 26.5, [10, 10, 4, 4]), cor);
			sombraDireita(ctx, caixa(ctx, -11.2, -52, 22.4, 26.5, [10, 10, 4, 4]), 4);
			break;
		case 'black':
			forma(ctx, oval(ctx, 0, -43.4, 13.6, 13), cor);
			sombraDireita(ctx, oval(ctx, 0, -43.4, 13.6, 13), 5);
			break;
		case 'chanel':
			forma(ctx, caixa(ctx, -11.4, -52.4, 22.8, 19.6, [10, 10, 3, 3]), cor);
			break;
		case 'coque':
			forma(ctx, oval(ctx, 0, -53.4, 4.6, 4.2), cor);
			brilho(ctx, cor, -56.2, -0.4, 2.8);
			break;
		case 'rabo':
			forma(ctx, oval(ctx, -11.2, -37.6, 3, 6.6, 0.3), cor);
			break;
	}
}

/** Topo e franja, por cima da cabeça, de frente. */
function cabeloFrente(ctx: C, estilo: string, cor: string) {
	const capaLisa = () => {
		ctx.moveTo(-9.9, -39.6);
		ctx.quadraticCurveTo(-10.6, -52.2, 0, -52.4);
		ctx.quadraticCurveTo(10.6, -52.2, 9.9, -40.6);
		ctx.quadraticCurveTo(3, -47.8, -9.9, -39.6);
		ctx.closePath();
	};
	switch (estilo) {
		case 'curto':
			forma(ctx, () => {
				ctx.moveTo(-10.1, -38.6);
				ctx.quadraticCurveTo(-10.8, -52, 0, -52.2);
				ctx.quadraticCurveTo(10.8, -52, 10.1, -40.2);
				ctx.lineTo(7.6, -44.6);
				ctx.lineTo(4.6, -42.6);
				ctx.lineTo(1.6, -45.4);
				ctx.lineTo(-1.6, -43.2);
				ctx.lineTo(-4.6, -45.6);
				ctx.lineTo(-7.4, -42.4);
				ctx.closePath();
			}, cor);
			brilho(ctx, cor);
			break;
		case 'social':
			forma(ctx, () => {
				ctx.moveTo(-10.1, -38.6);
				ctx.quadraticCurveTo(-11, -52.6, 1, -52.8);
				ctx.quadraticCurveTo(11, -52.2, 10.1, -40.8);
				ctx.quadraticCurveTo(6.4, -47.6, -2, -45.6);
				ctx.quadraticCurveTo(-6.8, -44.6, -8.8, -40.6);
				ctx.closePath();
			}, cor);
			traco(ctx, -3.4, -51.4, -1.2, -47.2, tom(cor, 1.5), 0.9);
			break;
		case 'raspado':
			ctx.globalAlpha = 0.88;
			forma(ctx, () => {
				ctx.moveTo(-9.7, -41.4);
				ctx.quadraticCurveTo(-9.6, -50.8, 0, -51);
				ctx.quadraticCurveTo(9.6, -50.8, 9.7, -41.8);
				ctx.quadraticCurveTo(0, -46.4, -9.7, -41.4);
				ctx.closePath();
			}, cor);
			ctx.globalAlpha = 1;
			break;
		case 'cacheado': {
			const cachos: [number, number, number][] = [
				[-8.8, -41.4, 3.4],
				[8.9, -42.4, 3.3],
				[-7.6, -47, 3.8],
				[7.2, -47.6, 3.7],
				[-3.6, -50.4, 3.9],
				[3, -50.6, 3.9],
				[-0.2, -52, 3.6]
			];
			for (const [x, y, r] of cachos) forma(ctx, oval(ctx, x, y, r, r), cor);
			for (const [x, y] of [[-4.6, -52.6], [1.6, -53.6], [-8.6, -48.6]] as const) ponto(ctx, x, y, 0.9, tom(cor, 1.5));
			break;
		}
		case 'black':
			forma(ctx, () => {
				ctx.moveTo(-9.8, -41);
				ctx.quadraticCurveTo(-10, -50.6, 0, -50.8);
				ctx.quadraticCurveTo(10, -50.6, 9.8, -41.6);
				ctx.quadraticCurveTo(0, -46.2, -9.8, -41);
				ctx.closePath();
			}, cor, 0);
			for (const [x, y] of [[-6, -51], [-1, -54.4], [4.6, -52.4], [-9.4, -46], [9, -47.4]] as const) ponto(ctx, x, y, 0.8, tom(cor, 1.45));
			break;
		case 'chanel':
			forma(ctx, () => {
				ctx.moveTo(-10, -41);
				ctx.quadraticCurveTo(-10.6, -52.6, 0, -52.6);
				ctx.quadraticCurveTo(10.6, -52.6, 10, -41);
				ctx.lineTo(9.4, -45.2);
				ctx.quadraticCurveTo(5, -46.2, 0, -47);
				ctx.quadraticCurveTo(-5, -46.2, -9.4, -45.2);
				ctx.closePath();
			}, cor);
			forma(ctx, caixa(ctx, -11.4, -46.2, 3.6, 13.4, [1.6, 1.6, 3, 3]), cor);
			forma(ctx, caixa(ctx, 8, -46.2, 3.4, 12.8, [1.6, 1.6, 3, 3]), cor);
			brilho(ctx, cor, -49.4);
			break;
		case 'longo':
			forma(ctx, () => {
				ctx.moveTo(-10.2, -38.8);
				ctx.quadraticCurveTo(-11, -52.6, 0.6, -52.8);
				ctx.quadraticCurveTo(11, -52.4, 10.2, -40.4);
				ctx.quadraticCurveTo(5, -48.4, -3, -45.4);
				ctx.quadraticCurveTo(-7, -44, -10.2, -38.8);
				ctx.closePath();
			}, cor);
			forma(ctx, caixa(ctx, -11.4, -44, 3.8, 16.6, [1.6, 1.6, 3.4, 3.4]), cor);
			forma(ctx, caixa(ctx, 8, -44, 3.4, 15.4, [1.6, 1.6, 3.2, 3.2]), cor);
			brilho(ctx, cor, -49.6);
			break;
		case 'rabo':
		case 'coque':
			forma(ctx, capaLisa, cor);
			brilho(ctx, cor, -49.4);
			break;
		case 'careca':
			ctx.globalAlpha = 0.3;
			ponto(ctx, -3, -47.4, 1.6, '#ffffff');
			ctx.globalAlpha = 1;
			break;
	}
}

/** De costas, o cabelo cobre a cabeça (e o longo cai pelas costas). */
function cabeloCostas(ctx: C, estilo: string, cor: string) {
	const cobre = (alpha = 1) => {
		ctx.globalAlpha = alpha;
		forma(ctx, oval(ctx, 0, -41.4, 10.1, 10.4), cor);
		ctx.globalAlpha = 1;
		brilho(ctx, cor, -49.8);
	};
	switch (estilo) {
		case 'curto':
		case 'social':
			cobre();
			break;
		case 'raspado':
			cobre(0.88);
			break;
		case 'cacheado':
			cobre();
			for (const [x, y] of [[-6.6, -47], [-2.4, -50.6], [2.6, -50.6], [6.8, -47], [-8.6, -41], [8.6, -41], [0, -45.6], [-4.4, -36.8], [4.4, -36.8]] as const)
				forma(ctx, oval(ctx, x, y, 3, 3), cor, 0.7);
			break;
		case 'black':
			forma(ctx, oval(ctx, 0, -43.4, 13.6, 13), cor);
			brilho(ctx, cor, -53);
			break;
		case 'chanel':
			forma(ctx, caixa(ctx, -11.4, -52.4, 22.8, 19.6, [10, 10, 3, 3]), cor);
			brilho(ctx, cor);
			break;
		case 'longo':
			forma(ctx, caixa(ctx, -11.2, -52.4, 22.4, 26.5, [10, 10, 4, 4]), cor);
			brilho(ctx, cor);
			break;
		case 'rabo':
			cobre();
			forma(ctx, oval(ctx, 0, -28.6, 3.2, 7.4), cor);
			forma(ctx, caixa(ctx, -1.8, -36.4, 3.6, 1.8, 0.8), '#1c2534', 0.6);
			break;
		case 'coque':
			cobre();
			forma(ctx, oval(ctx, 0, -51.6, 4.8, 4.4), cor);
			brilho(ctx, cor, -54.6, -0.4, 2.9);
			forma(ctx, caixa(ctx, -2.4, -48, 4.8, 1.6, 0.7), '#1c2534', 0.6);
			break;
	}
}

function desenharOculos(ctx: C, tipo: string) {
	if (tipo === 'nenhum') return;
	const olhos = [-2.7, 3.7];
	if (tipo === 'sol') {
		for (const x of olhos) forma(ctx, caixa(ctx, x - 2.6, -42.6, 5.2, 3.8, [1, 1, 2, 2]), '#1a1d26', 0.8);
		traco(ctx, -0.1, -41.4, 1.1, -41.4, CONTORNO, 1);
		for (const x of olhos) traco(ctx, x - 1.6, -41.8, x - 0.8, -40.8, 'rgba(255,255,255,0.55)', 0.6);
		return;
	}
	ctx.strokeStyle = tipo === 'grosso' ? '#15171d' : '#3a404b';
	ctx.lineWidth = tipo === 'grosso' ? 1.35 : 0.8;
	for (const x of olhos) {
		ctx.beginPath();
		if (tipo === 'grosso') ctx.roundRect(x - 2.7, -42.8, 5.4, 4.6, 1.2);
		else ctx.arc(x, -40.4, 2.7, 0, Math.PI * 2);
		ctx.stroke();
	}
	traco(ctx, -0.1, -41, 1.1, -41, ctx.strokeStyle as string, ctx.lineWidth);
}

/** Boneco num ponto do mundo (o jogo). */
export function desenharAvatar(ctx: C, p: Pose, a: Aparencia = APARENCIA_PADRAO) {
	const base = paraTela(p.x, p.y, 0);
	ctx.save();
	ctx.translate(base.x, base.y);
	desenharBoneco(ctx, p, a);
	ctx.restore();
}

/** Retângulo do avatar na tela (zoom 1), para o clique. */
export function areaDoAvatar(x: number, y: number) {
	const b = paraTela(x, y, 0);
	return { x0: b.x - 12, y0: b.y - 56, x1: b.x + 12, y1: b.y + 3 };
}
