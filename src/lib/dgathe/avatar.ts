// O bonequinho do DGathe, montado a partir da aparência escolhida no perfil.
//
// Desenhado em px de tela do zoom 1 (uns 52 px de altura), com os pés na
// origem. Olha para o lado em que anda: de frente quando desce na tela, de
// costas quando sobe, espelhado quando vai para a esquerda. A mesma função
// desenha no jogo e na prévia do editor (Meu Perfil), só que maior.
//
// Ordem das camadas: pernas e sapatos → saia → cabelo que fica atrás do corpo
// → braço de trás → tronco e roupa → cabeça e rosto → cabelo da frente (ou o
// de costas, que cobre a cabeça) → óculos → braço da frente.

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

const FORMAIS_COM_CINTO = new Set(['terno', 'blazer', 'social']);
const MANGA_CURTA = new Set(['camiseta', 'polo']);
const GRAVATA = '#ff6f00';
const DENIM = '#4a6fa5';
const JEANS = '#3d5a80';

function capsula(ctx: C, x: number, y0: number, y1: number, largura: number, cor: string) {
	const r = largura / 2;
	ctx.beginPath();
	ctx.moveTo(x - r, y0 + r);
	ctx.arc(x, y0 + r, r, Math.PI, 0);
	ctx.lineTo(x + r, y1 - r);
	ctx.arc(x, y1 - r, r, 0, Math.PI);
	ctx.closePath();
	ctx.fillStyle = cor;
	ctx.fill();
}

function elipse(ctx: C, x: number, y: number, rx: number, ry: number, cor: string, rot = 0, a0 = 0, a1 = Math.PI * 2) {
	ctx.beginPath();
	ctx.ellipse(x, y, rx, ry, rot, a0, a1);
	ctx.fillStyle = cor;
	ctx.fill();
}

function retangulo(ctx: C, x: number, y: number, w: number, h: number, r: number, cor: string) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
	ctx.fillStyle = cor;
	ctx.fill();
}

function poligono(ctx: C, pts: [number, number][], cor: string) {
	ctx.beginPath();
	ctx.moveTo(pts[0][0], pts[0][1]);
	for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
	ctx.closePath();
	ctx.fillStyle = cor;
	ctx.fill();
}

function linha(ctx: C, x0: number, y0: number, x1: number, y1: number, cor: string, lw = 0.8) {
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.strokeStyle = cor;
	ctx.lineWidth = lw;
	ctx.lineCap = 'round';
	ctx.stroke();
}

/** Contorno do tronco: reto no masculino; ombro mais estreito e cintura marcada no feminino. */
function caminhoTronco(ctx: C, feminino: boolean) {
	ctx.beginPath();
	if (feminino) {
		ctx.moveTo(-4.6, -33.5);
		ctx.lineTo(4.6, -33.5);
		ctx.quadraticCurveTo(7.3, -33.5, 7.3, -30.6);
		ctx.lineTo(5.7, -21.5);
		ctx.quadraticCurveTo(6.9, -16, 6.9, -12.5);
		ctx.lineTo(-6.9, -12.5);
		ctx.quadraticCurveTo(-6.9, -16, -5.7, -21.5);
		ctx.lineTo(-7.3, -30.6);
		ctx.quadraticCurveTo(-7.3, -33.5, -4.6, -33.5);
		ctx.closePath();
	} else {
		ctx.roundRect(-8.2, -33.5, 16.4, 21, 5.5);
	}
}

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
	const calca = vestido ? null : a.roupa === 'terno' ? tom(roupa, 0.9) : FORMAIS_COM_CINTO.has(a.roupa) ? '#2b3240' : JEANS;

	const passo = p.andando ? Math.sin(p.fase) : 0;
	const sobe = p.andando ? Math.abs(Math.sin(p.fase)) * 1.6 : Math.sin(p.t * 2) * 0.45;

	// Sombra no chão
	elipse(ctx, 0, 0, 11, 5, 'rgba(16, 24, 40, 0.25)');

	ctx.save();
	if (esquerda) ctx.scale(-1, 1);
	ctx.lineJoin = 'round';

	// Pernas e sapatos
	const pernas: [number, number][] = [
		[-3.3 + passo * 2.6, Math.max(0, passo) * 1.6],
		[3.3 - passo * 2.6, Math.max(0, -passo) * 1.6]
	];
	for (const [px, ergue] of pernas) {
		if (calca) capsula(ctx, px, -15 - sobe, -ergue, 5.2, calca);
		else capsula(ctx, px, -9 - sobe, -ergue, 4.2, pele);
		desenharSapato(ctx, a.sapato, px, ergue);
	}

	ctx.translate(0, -sobe);

	// Saia do vestido, por cima do alto das pernas
	if (vestido) {
		poligono(ctx, [[-6.6, -14], [6.6, -14], [8.8, -6], [-8.8, -6]], roupa);
		linha(ctx, -8.6, -6.6, 8.6, -6.6, tom(roupa, 0.75), 1);
	}

	// Cabelo que fica atrás do corpo (visto de frente)
	if (deFrente) cabeloAtras(ctx, a.cabelo, cabelo);

	// Braço de trás
	const balanco = passo * 0.55;
	const manga = a.roupa === 'jeans' ? DENIM : roupa;
	const braco = (lado: number, angulo: number) => {
		ctx.save();
		ctx.translate(lado * (feminino ? 7.6 : 8.6), -30.5);
		ctx.rotate(angulo);
		if (vestido) capsula(ctx, 0, 0, 14, 4, pele);
		else if (MANGA_CURTA.has(a.roupa)) {
			capsula(ctx, 0, 0, 14, 4.4, pele);
			capsula(ctx, 0, 0, 6.5, 4.8, manga);
		} else capsula(ctx, 0, 0, 14, 4.6, manga);
		elipse(ctx, 0, 14.2, 2.3, 2.3, pele);
		ctx.restore();
	};
	braco(-1, balanco);

	// Tronco e roupa
	caminhoTronco(ctx, feminino);
	ctx.fillStyle = a.roupa === 'jeans' ? DENIM : roupa;
	ctx.fill();
	ctx.save();
	caminhoTronco(ctx, feminino);
	ctx.clip();
	desenharRoupa(ctx, a.roupa, roupa, clara, pele, deFrente);
	// Luz da esquerda, igual ao resto do mapa
	ctx.fillStyle = 'rgba(255,255,255,0.08)';
	ctx.fillRect(-8.2, -33.5, 5, 21);
	ctx.restore();

	// Pescoço, orelha e cabeça
	ctx.fillStyle = pele;
	ctx.fillRect(-2.1, -37, 4.2, 4.5);
	if (deFrente) elipse(ctx, -7.1, -42, 1.6, 2, tom(pele, 0.9));
	else {
		elipse(ctx, -7.3, -42.4, 1.5, 1.9, tom(pele, 0.9));
		elipse(ctx, 7.3, -42.4, 1.5, 1.9, tom(pele, 0.9));
	}
	elipse(ctx, 0, -42.5, 7.6, 7.6, pele);

	if (deFrente) {
		// Olhos e boca, virados para o lado em que anda
		for (const ox of [-1.2, 3.6]) {
			elipse(ctx, ox, -42, 1.05, 1.05, '#1b1f27');
			if (feminino) linha(ctx, ox - 0.4, -43.2, ox - 1.5, -43.9, '#1b1f27', 0.6);
		}
		ctx.beginPath();
		ctx.arc(1.4, -39.2, 2, 0.15 * Math.PI, 0.85 * Math.PI);
		ctx.strokeStyle = feminino ? '#c0505a' : tom(pele, 0.55);
		ctx.lineWidth = feminino ? 1.2 : 1;
		ctx.stroke();
		cabeloFrente(ctx, a.cabelo, cabelo);
		desenharOculos(ctx, a.oculos);
	} else {
		cabeloCostas(ctx, a.cabelo, cabelo);
	}

	braco(1, -balanco);
	ctx.restore();
}

function desenharSapato(ctx: C, tipo: string, px: number, ergue: number) {
	const y = -ergue;
	switch (tipo) {
		case 'bota':
			capsula(ctx, px + 0.2, y - 6.5, y + 0.4, 5.8, '#4a3324');
			elipse(ctx, px + 1.2, y - 0.6, 3.6, 2, '#3a2719');
			break;
		case 'salto':
			elipse(ctx, px + 1.1, y - 1.4, 3, 1.6, '#1c1f26');
			linha(ctx, px - 1.1, y - 1.2, px - 1.4, y + 0.3, '#1c1f26', 1.1);
			break;
		case 'tenis':
			elipse(ctx, px + 1, y - 0.8, 3.7, 2.1, '#f4f4f2');
			elipse(ctx, px + 1, y - 0.1, 3.7, 1, '#c9ced6', 0, 0, Math.PI);
			break;
		case 'tenisPreto':
			elipse(ctx, px + 1, y - 0.8, 3.7, 2.1, '#22252b');
			elipse(ctx, px + 1, y - 0.1, 3.7, 1, '#f2f2f2', 0, 0, Math.PI);
			break;
		case 'marrom':
			elipse(ctx, px + 1, y - 0.6, 3.4, 1.9, '#5a3a22');
			break;
		default:
			elipse(ctx, px + 1, y - 0.6, 3.4, 1.9, '#141820');
	}
}

function desenharRoupa(ctx: C, tipo: string, cor: string, clara: boolean, pele: string, deFrente: boolean) {
	const escura = tom(cor, 0.78);
	if (!deFrente) {
		// Costas: costura no meio; o moletom mostra o capuz; o xadrez continua xadrez.
		if (tipo === 'moletom') elipse(ctx, 0, -31.5, 6.5, 3.6, escura);
		else if (tipo === 'xadrez') xadrez(ctx, cor);
		else if (tipo === 'jeans') {
			linha(ctx, -7, -24, 7, -24, '#7f9ccc', 0.7);
			linha(ctx, 0, -33, 0, -13, 'rgba(0,0,0,0.18)', 0.8);
		} else linha(ctx, 0, -31, 0, -15, 'rgba(0,0,0,0.18)', 0.8);
		if (FORMAIS_COM_CINTO.has(tipo)) retangulo(ctx, -8.2, -14.2, 16.4, 2, 1, '#141820');
		return;
	}
	switch (tipo) {
		case 'terno':
			poligono(ctx, [[-3.6, -33.4], [3.6, -33.4], [0.4, -25.5]], '#ffffff');
			poligono(ctx, [[0.4, -31.8], [1.9, -29], [0.4, -21.5], [-1.1, -29]], GRAVATA);
			poligono(ctx, [[-3.6, -33.4], [-1.2, -27.5], [-4.2, -28.5]], escura);
			poligono(ctx, [[3.6, -33.4], [2.2, -27.5], [5, -28.5]], escura);
			elipse(ctx, 0.6, -19.5, 0.7, 0.7, escura);
			break;
		case 'blazer':
			poligono(ctx, [[-4.4, -33.4], [4.4, -33.4], [0.4, -23.5]], '#f4f1eb');
			poligono(ctx, [[-1.6, -33.4], [1.6, -33.4], [0.4, -31.2]], pele);
			poligono(ctx, [[-4.4, -33.4], [-1.2, -26], [-5, -27]], escura);
			poligono(ctx, [[4.4, -33.4], [2.2, -26], [5.6, -27]], escura);
			elipse(ctx, 0.6, -19.5, 0.7, 0.7, escura);
			break;
		case 'social':
			poligono(ctx, [[-3.4, -33.4], [0.4, -30.8], [-2.2, -29.6]], tom(cor, 1.25));
			poligono(ctx, [[4.2, -33.4], [0.4, -30.8], [3, -29.6]], tom(cor, 1.25));
			poligono(ctx, [[0.4, -31], [1.6, -28.8], [0.4, -22], [-0.8, -28.8]], clara ? '#1c2534' : GRAVATA);
			for (const y of [-20, -17]) elipse(ctx, 0.4, y, 0.5, 0.5, tom(cor, 0.7));
			break;
		case 'vestido':
			elipse(ctx, 0.4, -33.5, 3.6, 2.6, pele, 0, 0, Math.PI);
			retangulo(ctx, -8, -22, 16, 1.4, 0.7, escura);
			break;
		case 'camiseta':
			elipse(ctx, 0.4, -33.5, 3, 1.8, pele, 0, 0, Math.PI);
			break;
		case 'polo':
			elipse(ctx, 0.4, -33.5, 2.6, 1.5, pele, 0, 0, Math.PI);
			poligono(ctx, [[-3.4, -33.4], [0.4, -31.6], [-2.4, -30.4]], tom(cor, 1.2));
			poligono(ctx, [[4.2, -33.4], [0.4, -31.6], [3.2, -30.4]], tom(cor, 1.2));
			linha(ctx, 0.4, -31.4, 0.4, -27.5, escura, 0.8);
			for (const y of [-30, -28.3]) elipse(ctx, 0.4, y, 0.45, 0.45, '#ffffff');
			break;
		case 'xadrez':
			xadrez(ctx, cor);
			poligono(ctx, [[-3.4, -33.4], [0.4, -30.8], [-2.2, -29.6]], tom(cor, 1.2));
			poligono(ctx, [[4.2, -33.4], [0.4, -30.8], [3, -29.6]], tom(cor, 1.2));
			linha(ctx, 0.4, -30.8, 0.4, -13, 'rgba(0,0,0,0.25)', 0.6);
			break;
		case 'jaqueta':
			retangulo(ctx, -2.2, -33.5, 5.2, 21, 0, '#e9e9ec');
			elipse(ctx, 0.4, -33.5, 2.6, 1.5, pele, 0, 0, Math.PI);
			linha(ctx, -2.2, -33, -2.2, -13, escura, 1);
			linha(ctx, 3, -33, 3, -13, escura, 1);
			retangulo(ctx, -8.2, -14.4, 16.4, 1.9, 0.8, escura);
			break;
		case 'jeans':
			retangulo(ctx, -2.2, -33.5, 5.2, 21, 0, cor);
			elipse(ctx, 0.4, -33.5, 2.6, 1.5, pele, 0, 0, Math.PI);
			linha(ctx, -2.2, -33, -2.2, -13, '#7f9ccc', 0.7);
			linha(ctx, 3, -33, 3, -13, '#7f9ccc', 0.7);
			retangulo(ctx, -6.6, -28.5, 3.4, 2.6, 0.6, tom(DENIM, 0.85));
			retangulo(ctx, 3.8, -28.5, 3.4, 2.6, 0.6, tom(DENIM, 0.85));
			break;
		case 'moletom':
			elipse(ctx, 0.4, -33.2, 5.2, 2.6, escura);
			elipse(ctx, 0.4, -33.5, 2.8, 1.6, pele, 0, 0, Math.PI);
			linha(ctx, -1.2, -31.5, -1.4, -27.5, '#f4f4f2', 0.6);
			linha(ctx, 2, -31.5, 2.2, -27.5, '#f4f4f2', 0.6);
			retangulo(ctx, -4.6, -19.5, 10, 5, 2, tom(cor, 0.88));
			break;
	}
	if (FORMAIS_COM_CINTO.has(tipo)) retangulo(ctx, -8.2, -14.2, 16.4, 2, 1, '#141820');
}

function xadrez(ctx: C, cor: string) {
	const risco = tom(cor, 0.68);
	ctx.globalAlpha = 0.55;
	for (let y = -32; y < -12; y += 4) linha(ctx, -9, y, 9, y, risco, 1.1);
	for (let x = -7; x < 9; x += 4) linha(ctx, x, -34, x, -12, risco, 1.1);
	ctx.globalAlpha = 1;
}

/** Cabelo que fica atrás do corpo e da cabeça, quando o boneco está de frente. */
function cabeloAtras(ctx: C, estilo: string, cor: string) {
	switch (estilo) {
		case 'longo':
			retangulo(ctx, -8.8, -50.5, 17.6, 22, 7, cor);
			break;
		case 'black':
			elipse(ctx, 0, -45, 11.5, 11, cor);
			break;
		case 'chanel':
			retangulo(ctx, -9.2, -51, 18.4, 15.2, 7, cor);
			break;
		case 'coque':
			elipse(ctx, -0.6, -51.2, 3.8, 3.6, cor);
			break;
		case 'rabo':
			elipse(ctx, -8.6, -40, 2.4, 5.4, cor, 0.25);
			break;
	}
}

/** Topo e franja, por cima da cabeça, de frente. */
function cabeloFrente(ctx: C, estilo: string, cor: string) {
	const luz = tom(cor, 1.3);
	const capa = (ry = 5.2, alpha = 1) => {
		ctx.globalAlpha = alpha;
		elipse(ctx, -0.6, -46.2, 8.1, ry, cor, -0.08, Math.PI * 0.95, Math.PI * 2.05);
		ctx.globalAlpha = 1;
	};
	switch (estilo) {
		case 'curto':
			capa();
			elipse(ctx, -6, -44, 2.4, 4, cor);
			break;
		case 'social':
			capa(5.6);
			elipse(ctx, 1.8, -47.4, 6.4, 3.2, cor, -0.3);
			linha(ctx, -2.6, -50, -0.8, -46.6, luz, 0.8);
			elipse(ctx, -6, -44, 2.2, 3.6, cor);
			break;
		case 'raspado':
			capa(4.4, 0.85);
			break;
		case 'cacheado':
			for (const [x, y, r] of [
				[-6.8, -44.5, 2.6],
				[-5.6, -48.6, 3],
				[-1.8, -50.8, 3.1],
				[2.4, -50.6, 3],
				[5.8, -48.2, 2.8],
				[7, -44.8, 2.2]
			] as const)
				elipse(ctx, x, y, r, r, cor);
			for (const [x, y] of [[-4.2, -50], [1, -52], [4.6, -50.4]] as const) elipse(ctx, x, y, 1, 1, luz);
			break;
		case 'black':
			elipse(ctx, 0, -47.2, 8.8, 4.8, cor, 0, Math.PI, Math.PI * 2);
			break;
		case 'chanel':
			elipse(ctx, 0.2, -47, 8.3, 4.6, cor, 0, Math.PI, Math.PI * 2);
			retangulo(ctx, -7.6, -48.6, 15.2, 3.4, 1.4, cor);
			retangulo(ctx, -9, -46, 3.4, 9.6, 1.6, cor);
			retangulo(ctx, 6.2, -46, 2.8, 9, 1.4, cor);
			break;
		case 'longo':
			capa(5.4);
			retangulo(ctx, -9, -46.5, 3.4, 13.5, 1.6, cor);
			retangulo(ctx, 6.2, -46.5, 2.8, 12, 1.4, cor);
			linha(ctx, -2, -49.8, 0.6, -47, luz, 0.8);
			break;
		case 'rabo':
		case 'coque':
			capa(5);
			linha(ctx, -3, -49.6, 1.2, -47.6, luz, 0.7);
			break;
		case 'careca':
			ctx.globalAlpha = 0.25;
			elipse(ctx, -2.4, -47.4, 2.6, 1.4, '#ffffff', -0.4);
			ctx.globalAlpha = 1;
			break;
	}
}

/** De costas, o cabelo cobre a cabeça (e o longo cai pelas costas). */
function cabeloCostas(ctx: C, estilo: string, cor: string) {
	const cobre = (alpha = 1) => {
		ctx.globalAlpha = alpha;
		ctx.beginPath();
		ctx.arc(0, -43.2, 7.9, Math.PI * 0.9, Math.PI * 2.1);
		ctx.fillStyle = cor;
		ctx.fill();
		ctx.fillRect(-7.6, -44, 15.2, 4.5);
		ctx.globalAlpha = 1;
	};
	switch (estilo) {
		case 'curto':
		case 'social':
			cobre();
			break;
		case 'raspado':
			cobre(0.85);
			break;
		case 'cacheado':
			cobre();
			for (const [x, y] of [[-6, -46], [-2.6, -50], [2.6, -50], [6, -46], [-5, -41], [5, -41], [0, -45]] as const) elipse(ctx, x, y, 2.8, 2.8, cor);
			break;
		case 'black':
			elipse(ctx, 0, -45, 11.5, 11, cor);
			break;
		case 'chanel':
			retangulo(ctx, -9.2, -51, 18.4, 15.2, 7, cor);
			break;
		case 'longo':
			retangulo(ctx, -8.8, -51, 17.6, 23, 7, cor);
			break;
		case 'rabo':
			cobre();
			elipse(ctx, 0, -36.5, 2.6, 6.5, cor);
			retangulo(ctx, -1.6, -44.2, 3.2, 1.5, 0.7, '#1c2534');
			break;
		case 'coque':
			cobre();
			elipse(ctx, 0, -50.4, 4, 3.8, cor);
			retangulo(ctx, -2.2, -47.4, 4.4, 1.3, 0.6, '#1c2534');
			break;
	}
}

function desenharOculos(ctx: C, tipo: string) {
	if (tipo === 'nenhum') return;
	const olhos = [-1.2, 3.6];
	if (tipo === 'sol') {
		for (const x of olhos) retangulo(ctx, x - 2.3, -43.6, 4.6, 3.2, 1.2, 'rgba(20, 24, 32, 0.92)');
		linha(ctx, 1.1, -42.4, 1.3, -42.4, '#141820', 1);
		linha(ctx, -2.8, -43, -1.8, -42.2, 'rgba(255,255,255,0.5)', 0.6);
		return;
	}
	ctx.strokeStyle = tipo === 'grosso' ? '#141820' : '#3a404b';
	ctx.lineWidth = tipo === 'grosso' ? 1.3 : 0.75;
	for (const x of olhos) {
		ctx.beginPath();
		if (tipo === 'grosso') ctx.roundRect(x - 2.3, -43.7, 4.6, 3.4, 1);
		else ctx.arc(x, -42, 2.1, 0, Math.PI * 2);
		ctx.stroke();
	}
	linha(ctx, 0.9, -42.4, 1.5, -42.4, tipo === 'grosso' ? '#141820' : '#3a404b', ctx.lineWidth);
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
	return { x0: b.x - 12, y0: b.y - 52, x1: b.x + 12, y1: b.y + 4 };
}
