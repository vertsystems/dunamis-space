// O que os três arquivos do desenho do boneco dividem: as primitivas (forma
// com contorno, sombra chapada, cápsula, oval...), as cores fixas, as medidas
// do corpo e os tipos que os ganchos recebem.
//
// Por que existe (pedido do Bruno, 10/11/2026: personagens prontos): o desenho
// foi dividido para dois pintores trabalharem ao mesmo tempo sem tocar no
// mesmo arquivo. avatar.ts monta o boneco e chama, na ordem certa, as peças
// novas de avatar-cabeca.ts (cabelos, barbas, chapéus, óculos, rostos) e de
// avatar-corpo.ts (portes, roupas, partes de baixo, sapatos, itens na mão).
// Os dois importam daqui, nunca de avatar.ts (senão viraria import circular).
//
// Convenções completas em docs/dgathe/personagens.md.

import { tom } from './iso';
import type { Aparencia, OpcaoBicho } from './aparencia';

export { tom };

export type C = CanvasRenderingContext2D;

// ------------------------------------------------------------------ medidas

/** Cor do contorno de tudo (traço escuro do estilo cartoon). */
export const CONTORNO = '#232a3a';
/** Espessura padrão do contorno, em px do zoom 1. */
export const LW = 1.05;
/** Sombra chapada do lado direito (a luz do jogo vem da esquerda). */
export const SOMBRA = 'rgba(16, 20, 32, 0.16)';
/** Sombra da pele no rosto (mais quente que a da roupa). */
export const SOMBRA_PELE = 'rgba(120, 60, 30, 0.12)';

/** Centro da cabeça (y) e raio. Os pés ficam em y = 0; o alto da cabeça em ~ -50. */
export const CY = -40.5;
export const R = 9.6;
/** Altura dos olhos e do centro da boca, para o pintor da cabeça. */
export const OLHOS = { y: -40.3, x: [-2.7, 3.7] as const };
export const BOCA = { y: -34.6, x: 1 };

/**
 * Sentado no sofá: o quadril fica na altura da almofada (~13 px, quase a do
 * quadril em pé, porque a perna do boneco é curta), o corpo recua para dentro
 * do sofá, as coxas vão para a frente até o joelho e a canela desce até o chão.
 */
export const ABAIXA_SENTADO = 1.5;
export const RECUO_SENTADO = 4.5;

// ------------------------------------------------------------------- cores

export const GRAVATA = '#ff6f00';
export const DENIM = '#4a6fa5';
export const JEANS = '#3d5a80';
export const SAIA_ESCURA = '#2b3240';
export const SAIA_CLARA = '#e6dccb';
export const PRETO_FOSCO = '#2a2d35';
export const DOURADO = '#f0c050';

// ------------------------------------------------------------------ primitivas

/** Preenche o caminho desenhado por `f` e passa o contorno escuro. */
export function forma(ctx: C, f: () => void, cor: string | CanvasGradient, lw = LW) {
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
export function sombraDireita(ctx: C, f: () => void, xDe: number, cor = SOMBRA) {
	ctx.save();
	ctx.beginPath();
	f();
	ctx.clip();
	ctx.fillStyle = cor;
	ctx.fillRect(xDe, -70, 40, 80);
	ctx.restore();
}

/** Cápsula vertical (perna, braço) de y0 a y1, centrada em x. */
export const capsula = (ctx: C, x: number, y0: number, y1: number, largura: number) => () => {
	const r = largura / 2;
	ctx.moveTo(x - r, y0 + r);
	ctx.arc(x, y0 + r, r, Math.PI, 0);
	ctx.lineTo(x + r, y1 - r);
	ctx.arc(x, y1 - r, r, 0, Math.PI);
	ctx.closePath();
};

export const oval = (ctx: C, x: number, y: number, rx: number, ry: number, rot = 0) => () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);

export const caixa = (ctx: C, x: number, y: number, w: number, h: number, r: number | number[]) => () => ctx.roundRect(x, y, w, h, r);

export function poligono(ctx: C, pts: [number, number][]) {
	return () => {
		ctx.moveTo(pts[0][0], pts[0][1]);
		for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
		ctx.closePath();
	};
}

/** Linha solta (costura, dobra, risco). */
export function traco(ctx: C, x0: number, y0: number, x1: number, y1: number, cor = CONTORNO, lw = 0.8) {
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.strokeStyle = cor;
	ctx.lineWidth = lw;
	ctx.lineCap = 'round';
	ctx.stroke();
}

/** Bolinha sem contorno (botão, brilho, pinta). */
export function ponto(ctx: C, x: number, y: number, r: number, cor: string) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fillStyle = cor;
	ctx.fill();
}

/** Luminância de uma cor #rrggbb (0–255). */
export function luzDe(cor: string) {
	return parseInt(cor.slice(1, 3), 16) * 0.3 + parseInt(cor.slice(3, 5), 16) * 0.59 + parseInt(cor.slice(5, 7), 16) * 0.11;
}

/** Brilho do cabelo: um arco claro no alto, do lado da luz. */
export function brilho(ctx: C, cor: string, y = -48.6, cx = -1.5, raio = 7.2) {
	ctx.beginPath();
	ctx.arc(cx, y + raio, raio, Math.PI * 1.18, Math.PI * 1.42);
	ctx.strokeStyle = tom(cor, 1.45);
	ctx.lineWidth = 1.1;
	ctx.lineCap = 'round';
	ctx.stroke();
}

// ------------------------------------------------------------- tipos dos ganchos

/**
 * O jeito de andar num instante (avatar.ts, passada()). Os pintores leem para
 * acompanhar o movimento (barra do sobretudo que balança, capa que esvoaça).
 */
export type Passada = {
	/** -1 a 1: quanto cada perna avança (a da esquerda com +, a da direita com -). */
	passo: number;
	/** Quanto o pé que avança sobe do chão (px). */
	pe: number;
	/** Quanto o corpo (do quadril para cima) sobe (px; negativo = agachado). */
	sobe: number;
	/** Balanço dos braços (rad): o de trás gira +balanco, o da frente -balanco. */
	balanco: number;
	/** Inclinação do corpo (rad), girando no quadril; positivo pende para o lado em que olha. */
	inclina: number;
	/** Altura do boneco inteiro acima do chão (px); a sombra encolhe. */
	flutua: number;
};

/**
 * Medidas do corpo que mudam com o porte. avatar.ts usa para pôr os braços e a
 * cabeça; o pintor do corpo devolve outras em medidas() (avatar-corpo.ts).
 */
export type Medidas = {
	/** Distância do ombro (articulação do braço) ao meio do corpo. */
	ombroX: number;
	/** Altura do ombro. */
	ombroY: number;
	/** Do ombro ao centro da mão. */
	braco: number;
	/** Quanto a cabeça (com pescoço, cabelo e chapéu) sobe em relação ao padrão (px; negativo desce). */
	ergue: number;
	/** Giro extra do braço da frente para segurar o item na mão (rad; 0 = solto ao lado do corpo). */
	anguloMao: number;
	/** Onde começa (x) a sombra chapada do tronco; num tronco mais largo, mais para a direita. */
	sombraX: number;
};

export const MEDIDAS_MASCULINO: Readonly<Medidas> = { ombroX: 7.2, ombroY: -28.6, braco: 12.6, ergue: 0, anguloMao: 0, sombraX: 3.4 };
export const MEDIDAS_FEMININO: Readonly<Medidas> = { ombroX: 5.4, ombroY: -28.4, braco: 12.2, ergue: 0, anguloMao: 0, sombraX: 2.9 };

/**
 * Tudo o que um gancho sabe do boneco no momento de desenhar. Criado uma vez
 * por quadro em desenharBoneco; os ganchos só leem.
 */
export type Quadro = {
	a: Aparencia;
	feminino: boolean;
	/** De frente (descendo na tela) ou de costas (subindo). */
	deFrente: boolean;
	sentado: boolean;
	andando: boolean;
	/** Fase da passada (cresce enquanto anda) e relógio (s). */
	fase: number;
	t: number;
	passada: Passada;
	m: Medidas;
	/**
	 * Bicho de roupa (segunda rodada), com as cores: `forma` diz o desenho da
	 * cabeça e `pelo`, `claro`, `escuro`, `mao` as cores. null = gente.
	 */
	bicho: OpcaoBicho | null;
	/** Cores já resolvidas (#rrggbb). Num bicho, `pele` é a cor do pelo. */
	pele: string;
	cabelo: string;
	/** Cor da peça de cima. */
	roupa: string;
	/** Peça de cima clara (luminância > 150): pede detalhe escuro. */
	clara: boolean;
	/** Cor da parte de baixo: a escolhida (corBaixo) ou a que o padrão usaria. */
	corBaixo: string;
	/** Cor de destaque (capa, faixa, chapéu, bolsa); '' quando a aparência não escolheu. */
	extra: string;
	/** Desenha um pé com o sapato escolhido (o novo do pintor, ou o padrão). y = chão do pé (0, ou negativo erguendo). */
	sapato: (px: number, y: number) => void;
};

/** A cor de destaque, ou `padrao` quando a aparência não escolheu. */
export const extraOu = (q: Quadro, padrao: string) => q.extra || padrao;

/** Tem o detalhe (chifres, capa, sardas...)? */
export const temDetalhe = (q: Quadro, id: string) => q.a.detalhes.includes(id);

/** É bicho de roupa desta forma de cabeça ('urso', 'felino'...)? Sem forma: é qualquer bicho? */
export const ehBicho = (q: Quadro, forma?: NonNullable<OpcaoBicho['forma']>) => !!q.bicho && (!forma || q.bicho.forma === forma);
