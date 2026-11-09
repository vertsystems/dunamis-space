// O avatar do DGathe: um personagem chapado, desenhado em px de tela do zoom 1,
// com os pés no ponto do chão onde ele está.
//
// Olha para o lado em que anda: de frente (rosto e gravata) quando desce na
// tela, de costas quando sobe, espelhado quando vai para a esquerda.

import { paraTela } from './iso';

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

export type Visual = { roupa: string; pele: string; cabelo: string; calca: string; gravata: string };

export const VISUAL_PADRAO: Visual = {
	roupa: '#1c2534',
	pele: '#e0b089',
	cabelo: '#2b1d16',
	calca: '#26303f',
	gravata: '#ff6f00'
};

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

function retArredondado(ctx: C, x: number, y: number, w: number, h: number, r: number, cor: string) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
	ctx.fillStyle = cor;
	ctx.fill();
}

export function desenharAvatar(ctx: C, p: Pose, v: Visual = VISUAL_PADRAO) {
	const base = paraTela(p.x, p.y, 0);
	const telaX = p.dirX - p.dirY;
	const telaY = p.dirX + p.dirY;
	const esquerda = telaX < -0.05;
	const deFrente = telaY >= -0.05;

	const passo = p.andando ? Math.sin(p.fase) : 0;
	const sobe = p.andando ? Math.abs(Math.sin(p.fase)) * 1.6 : Math.sin(p.t * 2) * 0.45;

	// Sombra no chão
	ctx.beginPath();
	ctx.ellipse(base.x, base.y, 11, 5, 0, 0, Math.PI * 2);
	ctx.fillStyle = 'rgba(16, 24, 40, 0.25)';
	ctx.fill();

	ctx.save();
	ctx.translate(base.x, base.y);
	if (esquerda) ctx.scale(-1, 1);
	ctx.lineJoin = 'round';

	// Pernas e sapatos
	const pernas: [number, number][] = [
		[-3.3 + passo * 2.6, Math.max(0, passo) * 1.6],
		[3.3 - passo * 2.6, Math.max(0, -passo) * 1.6]
	];
	for (const [px, ergue] of pernas) {
		capsula(ctx, px, -15 - sobe, -ergue, 5.2, v.calca);
		ctx.beginPath();
		ctx.ellipse(px + 1, -ergue - 0.6, 3.4, 1.9, 0, 0, Math.PI * 2);
		ctx.fillStyle = '#141820';
		ctx.fill();
	}

	ctx.translate(0, -sobe);

	// Braço de trás (fica atrás do tronco)
	const balanco = passo * 0.55;
	const braco = (lado: number, angulo: number) => {
		ctx.save();
		ctx.translate(lado * 8.6, -30.5);
		ctx.rotate(angulo);
		capsula(ctx, 0, 0, 14, 4.6, v.roupa);
		ctx.beginPath();
		ctx.arc(0, 14.2, 2.3, 0, Math.PI * 2);
		ctx.fillStyle = v.pele;
		ctx.fill();
		ctx.restore();
	};
	braco(-1, balanco);

	// Tronco (blazer) com camisa e gravata
	retArredondado(ctx, -8.2, -33.5, 16.4, 21, 5.5, v.roupa);
	ctx.fillStyle = 'rgba(255,255,255,0.08)';
	ctx.fillRect(-8.2, -33.5, 5, 21);
	retArredondado(ctx, -8.2, -14.2, 16.4, 2, 1, '#141820');
	if (deFrente) {
		ctx.beginPath();
		ctx.moveTo(-3.6, -33.4);
		ctx.lineTo(3.6, -33.4);
		ctx.lineTo(0.4, -25.5);
		ctx.closePath();
		ctx.fillStyle = '#ffffff';
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(0.4, -31.8);
		ctx.lineTo(1.9, -29);
		ctx.lineTo(0.4, -21.5);
		ctx.lineTo(-1.1, -29);
		ctx.closePath();
		ctx.fillStyle = v.gravata;
		ctx.fill();
	} else {
		ctx.strokeStyle = 'rgba(0,0,0,0.18)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, -31);
		ctx.lineTo(0, -15);
		ctx.stroke();
	}

	// Pescoço e cabeça
	ctx.fillStyle = v.pele;
	ctx.fillRect(-2.1, -37, 4.2, 4.5);
	ctx.beginPath();
	ctx.arc(0, -42.5, 7.6, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = v.cabelo;
	if (deFrente) {
		ctx.beginPath();
		ctx.ellipse(-0.6, -46.2, 8.1, 5.2, -0.08, Math.PI * 0.95, Math.PI * 2.05);
		ctx.fill();
		ctx.beginPath();
		ctx.ellipse(-6, -44, 2.4, 4, 0, 0, Math.PI * 2);
		ctx.fill();
		// Olhos e sorriso, virados para o lado em que anda
		ctx.fillStyle = '#1b1f27';
		for (const ox of [-1.2, 3.6]) {
			ctx.beginPath();
			ctx.arc(ox, -42, 1.05, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.strokeStyle = '#8a4b32';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(1.4, -39.2, 2, 0.15 * Math.PI, 0.85 * Math.PI);
		ctx.stroke();
	} else {
		ctx.beginPath();
		ctx.arc(0, -43.2, 7.9, Math.PI * 0.9, Math.PI * 2.1);
		ctx.fill();
		ctx.fillRect(-7.6, -44, 15.2, 4.5);
	}

	braco(1, -balanco);
	ctx.restore();
}

/** Retângulo do avatar na tela (zoom 1), para o clique. */
export function areaDoAvatar(x: number, y: number) {
	const b = paraTela(x, y, 0);
	return { x0: b.x - 12, y0: b.y - 52, x1: b.x + 12, y1: b.y + 4 };
}
