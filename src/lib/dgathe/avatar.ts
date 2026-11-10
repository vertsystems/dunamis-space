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
// Camadas (com os ganchos das peças novas entre colchetes):
//   sombra no chão → [corpo.atras: aura, asas, capa] → pernas e sapatos
//   [corpo.pernas, corpo.sapato] → saia [corpo.parteDeBaixo] → cabelo de trás
//   [cabeca.cabecaAtras] → braço de trás [corpo.braco] → tronco [corpo.tronco]
//   e roupa [corpo.roupa] → [corpo.acabamento] → colo sentado [corpo.colo] →
//   pescoço, orelhas [cabeca.orelhas] e cabeça [cabeca.formaDaCabeca] → rosto
//   [cabeca.rosto, cabeca.sobreORosto] → cabelo da frente [cabeca.cabeloFrente]
//   → óculos [cabeca.oculos] → [cabeca.chapeu] (ou, de costas, o cabelo visto
//   por trás e [cabeca.costas]) → [corpo.naMao 'atras'] → braço da frente →
//   [corpo.naMao 'frente'].
//
// Pedido do Bruno (10/11/2026): personagens prontos. As peças novas são
// desenhadas em avatar-cabeca.ts e avatar-corpo.ts (um pintor em cada); aqui
// ficam as peças originais e os ganchos. Gancho que não desenha nada deixa o
// boneco igual ao de antes. Convenções em docs/dgathe/personagens.md.
//
// Segunda rodada (10/11/2026): os bichos de roupa. Com `bicho`, a "pele" do
// boneco vira a cor do pelo (pescoço, mão, perna à mostra), o cabelo original
// não sai e a cabeça, as orelhas e o rosto de bicho entram pelos ganchos de
// sempre (cabeca.formaDaCabeca, cabeca.orelhas, cabeca.rosto); o Quadro leva
// as cores do bicho (q.bicho). Sem bicho, nada muda.
//
// A personagem feminina (pedido do Bruno, 09/11/2026: "está muito igual ao
// masculino") tem corpo próprio (ombro estreito, cintura, quadril, pernas e
// braços finos) e cada roupa do catálogo vira uma versão feminina: o terno é
// tailleur com saia lápis, a camisa social é blusa com laço e saia, a polo vai
// com saia jeans, a xadrez é aberta com nó, a jaqueta jeans vai sobre vestido.
// Sapatos, cílios, batom e brinco também são dela.

import { paraTela } from './iso';
import { APARENCIA_PADRAO, CORES_CABELO, PELES, bichoDe, corDe, type Aparencia } from './aparencia';
import {
	ABAIXA_SENTADO,
	CONTORNO,
	CY,
	DENIM,
	DOURADO,
	JEANS,
	GRAVATA,
	LW,
	MEDIDAS_FEMININO,
	MEDIDAS_MASCULINO,
	PRETO_FOSCO,
	R,
	RECUO_SENTADO,
	SAIA_CLARA,
	SAIA_ESCURA,
	SOMBRA,
	SOMBRA_PELE,
	brilho,
	caixa,
	capsula,
	forma,
	luzDe,
	oval,
	poligono,
	ponto,
	sombraDireita,
	tom,
	traco,
	type C,
	type Passada,
	type Quadro
} from './avatar-base';
import * as cabeca from './avatar-cabeca';
import * as corpo from './avatar-corpo';

// jogo.ts lê daqui
export { ABAIXA_SENTADO };
export type { Passada, Quadro };

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
	/** Sentado (no sofá da recepção, quando a pessoa está ausente). */
	sentado?: boolean;
	/** Mão levantada, com um aceno leve: o agente pedindo a atenção de quem aprova. */
	maoErguida?: boolean;
};

const FORMAIS_COM_CINTO = new Set(['terno', 'blazer', 'social']);
const MANGA_CURTA = new Set(['camiseta', 'polo']);

// ---------------------------------------------------------------- jeito de andar

/**
 * O jeito de andar num instante: quanto a perna avança e o pé sobe, quanto o
 * corpo pula, o balanço dos braços, a inclinação e (flutuante) a altura do
 * chão. 'normal' é o andar de sempre (09/11/2026). A rapidez da passada e a
 * velocidade no mapa de cada jeito ficam em ANDARES (aparencia.ts), para o
 * jogo.ts.
 */
export function passada(andar: string, p: { andando: boolean; fase: number; t: number; sentado?: boolean }): Passada {
	const parado: Passada = { passo: 0, pe: 0, sobe: Math.sin(p.t * 2) * 0.4, balanco: 0, inclina: 0, flutua: 0 };
	if (p.sentado) return { ...parado, sobe: Math.sin(p.t * 1.6) * 0.3 };
	// Flutua sempre, parado ou andando: as pernas ficam soltas no ar
	if (andar === 'flutuante')
		return { ...parado, sobe: 0, flutua: 4 + Math.sin(p.t * 2.2) * 1.2, balanco: Math.sin(p.t * 1.8) * 0.12, inclina: p.andando ? 0.06 : 0 };
	if (!p.andando) return andar === 'robotico' ? { ...parado, sobe: 0 } : parado;
	const s = Math.sin(p.fase);
	const a = Math.abs(s);
	switch (andar) {
		case 'apressado':
			return { passo: s * 1.15, pe: 1.8, sobe: a * 1.6, balanco: s * 0.75, inclina: 0.06, flutua: 0 };
		case 'gingado':
			return { passo: s, pe: 1.3, sobe: a, balanco: s * 0.6, inclina: s * 0.08, flutua: 0 };
		case 'saltitante':
			return { passo: s * 0.85, pe: 2.2, sobe: a * 3, balanco: s * 0.55, inclina: 0, flutua: 0 };
		case 'pesado':
			return { passo: s * 0.8, pe: 1, sobe: a * 0.7, balanco: s * 0.3, inclina: s * 0.045, flutua: 0 };
		case 'deslizante':
			// Os pés não saem do chão e o corpo vai meio para trás
			return { passo: s * 0.7, pe: 0, sobe: 0.2, balanco: s * 0.25, inclina: -0.05, flutua: 0 };
		case 'elegante':
			return { passo: s * 0.9, pe: 1.2, sobe: a * 0.9, balanco: s * 0.32, inclina: s * 0.03, flutua: 0 };
		case 'robotico': {
			// Em degraus: a perna para em três posições
			const r = Math.round(s * 2) / 2;
			return { passo: r * 0.9, pe: 1.2, sobe: Math.abs(r) * 0.5, balanco: r * 0.45, inclina: 0, flutua: 0 };
		}
		case 'furtivo':
			return { passo: s * 0.85, pe: 1, sobe: -1.2 + a * 0.5, balanco: s * 0.25, inclina: 0.07, flutua: 0 };
		case 'tranquilo':
			return { passo: s * 0.65, pe: 0.9, sobe: a * 0.6, balanco: s * 0.25, inclina: 0, flutua: 0 };
		default:
			return { passo: s, pe: 1.5, sobe: a * 1.4, balanco: s * 0.5, inclina: 0, flutua: 0 };
	}
}

// ------------------------------------------------------------------ primitivas

const pernasSentado = (feminino: boolean) => (feminino ? [-2.2, 2.2] : [-2.7, 2.7]);

/** Sentado: as canelas descem do joelho (na beira do sofá) até o pé, no chão. */
function canelas(ctx: C, cor: string, feminino: boolean, sapato: (px: number, y: number) => void) {
	const largura = feminino ? 3.6 : 4.6;
	for (const px of pernasSentado(feminino)) {
		const c = capsula(ctx, px, -13.4, -1.8, largura);
		forma(ctx, c, cor);
		sombraDireita(ctx, c, px + 0.6);
		sapato(px, 0);
	}
}

/**
 * Sentado, de frente: as coxas saem do quadril (no fundo do sofá) e vêm para a
 * frente até o joelho, em cima da canela. Coordenadas do corpo, que está
 * recuado RECUO_SENTADO para dentro do sofá.
 */
function coxas(ctx: C, cor: string, feminino: boolean) {
	const largura = feminino ? 4.4 : 5.4;
	for (const px of pernasSentado(feminino)) {
		const joelho = { x: px + RECUO_SENTADO + 0.6, y: -13.2 - ABAIXA_SENTADO };
		const quadril = { x: px - 0.4, y: -16.4 };
		forma(ctx, () => {
			const ang = Math.atan2(joelho.y - quadril.y, joelho.x - quadril.x);
			const r = largura / 2;
			ctx.arc(quadril.x, quadril.y, r, ang + Math.PI / 2, ang - Math.PI / 2);
			ctx.arc(joelho.x, joelho.y, r, ang - Math.PI / 2, ang + Math.PI / 2);
			ctx.closePath();
		}, cor);
	}
	traco(ctx, 0.2, -16, 1.4, -13.8, tom(cor, 0.7), 0.6);
}

/** Contorno do tronco masculino: reto, ombro largo. */
function tronco(ctx: C) {
	return () => ctx.roundRect(-7.2, -30.5, 14.4, 16.5, [4.6, 4.6, 2.4, 2.4]);
}

/**
 * Tronco feminino: ombro estreito e cintura marcada, terminando na cintura
 * (a saia ou a calça começa ali). O moletom é largo e desce até o quadril.
 */
function troncoFeminino(ctx: C, longo: boolean) {
	return () => {
		ctx.moveTo(-3.4, -30.5);
		ctx.lineTo(3.4, -30.5);
		ctx.quadraticCurveTo(5.9, -30.5, 5.9, -27.8);
		if (longo) {
			ctx.quadraticCurveTo(5.6, -21, 6.5, -14.4);
			ctx.lineTo(-6.5, -14.4);
			ctx.quadraticCurveTo(-5.6, -21, -5.9, -27.8);
		} else {
			ctx.quadraticCurveTo(5.9, -23.6, 4.4, -20.8);
			ctx.lineTo(4.7, -18.2);
			ctx.lineTo(-4.7, -18.2);
			ctx.lineTo(-4.4, -20.8);
			ctx.quadraticCurveTo(-5.9, -23.6, -5.9, -27.8);
		}
		ctx.quadraticCurveTo(-5.9, -30.5, -3.4, -30.5);
		ctx.closePath();
	};
}

// ------------------------------------------------------------ figurino feminino

type Figurino = {
	/** O que vai da cintura para baixo. */
	baixo: 'lapis' | 'evase' | 'rodada' | 'calca';
	corBaixo: string;
	manga: 'longa' | 'curta' | 'bufante';
	corManga: string;
	/** Peça de cima que desce até o quadril (moletom). */
	longo: boolean;
};

/** A versão feminina de cada roupa do catálogo. `luz` = luminância da cor escolhida (0–255). */
function figurinoFeminino(roupa: string, cor: string, luz: number): Figurino {
	const longa = { manga: 'longa' as const, corManga: cor, longo: false };
	switch (roupa) {
		case 'terno':
			return { ...longa, baixo: 'lapis', corBaixo: tom(cor, 0.9) };
		case 'blazer':
			return { ...longa, baixo: 'calca', corBaixo: SAIA_ESCURA };
		case 'social':
			return { ...longa, baixo: 'evase', corBaixo: luz < 90 ? SAIA_CLARA : SAIA_ESCURA };
		case 'vestido':
			return { baixo: 'rodada', corBaixo: cor, manga: 'bufante', corManga: cor, longo: false };
		case 'camiseta':
			return { baixo: 'calca', corBaixo: JEANS, manga: 'curta', corManga: cor, longo: false };
		case 'polo':
			return { baixo: 'evase', corBaixo: JEANS, manga: 'curta', corManga: cor, longo: false };
		case 'xadrez':
			return { ...longa, baixo: 'calca', corBaixo: JEANS };
		case 'jaqueta':
			return { ...longa, baixo: 'calca', corBaixo: PRETO_FOSCO };
		case 'jeans':
			return { ...longa, baixo: 'rodada', corBaixo: cor, corManga: DENIM };
		default:
			return { ...longa, baixo: 'calca', corBaixo: PRETO_FOSCO, longo: true };
	}
}

/**
 * A parte de baixo escolhida (campo `baixo`, 10/11/2026) no corpo padrão dela:
 * as saias e a calça que já existem aqui. As novas (pantalona, midi...) saem
 * com a forma mais parecida até o pintor do corpo desenhar a delas.
 */
const BAIXO_FEMININO: Record<string, Figurino['baixo']> = {
	calcaSocial: 'calca',
	jeans: 'calca',
	pantalona: 'calca',
	cargo: 'calca',
	legging: 'calca',
	bufante: 'calca',
	bermuda: 'calca',
	bermudaRasgada: 'calca',
	saiaLapis: 'lapis',
	saiaEvase: 'evase',
	saiaRodada: 'rodada',
	saiaMidi: 'rodada',
	saiaLonga: 'rodada'
};

/** Pernas finas: de meia-calça cor da pele com saia, ou de calça justa. */
function pernasFemininas(ctx: C, f: Figurino, sapato: (px: number, y: number) => void, pele: string, ps: Passada) {
	const { passo, sobe } = ps;
	const pernas: [number, number][] = [
		[-2.2 + passo * 2.2, Math.max(0, passo) * ps.pe],
		[2.2 - passo * 2.2, Math.max(0, -passo) * ps.pe]
	];
	for (const [px, ergue] of pernas) {
		if (f.baixo === 'calca') {
			const perna = capsula(ctx, px, -17 - sobe, -1.8 - ergue, 4.2);
			forma(ctx, perna, f.corBaixo);
			sombraDireita(ctx, perna, px + 0.7);
			if (f.corBaixo === JEANS) traco(ctx, px - 1.7, -3.9 - ergue, px + 1.7, -3.9 - ergue, '#8aa6d2', 0.7);
		} else forma(ctx, capsula(ctx, px, -12 - sobe, -1.8 - ergue, 3.4), pele);
		sapato(px, -ergue);
	}
}

/** Saia (lápis, evasê ou rodada) ou o quadril da calça, já na altura do corpo. */
function parteDeBaixo(ctx: C, f: Figurino) {
	const cor = f.corBaixo;
	const dobra = tom(cor, 0.76);
	switch (f.baixo) {
		case 'calca': {
			const quadril = () => {
				ctx.moveTo(-4.7, -19.4);
				ctx.lineTo(4.7, -19.4);
				ctx.quadraticCurveTo(6.2, -16.6, 4.4, -13);
				ctx.lineTo(-4.4, -13);
				ctx.quadraticCurveTo(-6.2, -16.6, -4.7, -19.4);
				ctx.closePath();
			};
			forma(ctx, quadril, cor, 0);
			sombraDireita(ctx, quadril, 2.2);
			// Contorno só dos lados (embaixo as pernas continuam)
			ctx.beginPath();
			ctx.moveTo(4.7, -19.4);
			ctx.quadraticCurveTo(6.2, -16.6, 4.4, -13);
			ctx.moveTo(-4.7, -19.4);
			ctx.quadraticCurveTo(-6.2, -16.6, -4.4, -13);
			ctx.strokeStyle = CONTORNO;
			ctx.lineWidth = LW;
			ctx.stroke();
			traco(ctx, 0, -15.8, 0, -13, dobra, 0.6);
			return;
		}
		case 'lapis': {
			const saia = () => {
				ctx.moveTo(-4.7, -19.4);
				ctx.lineTo(4.7, -19.4);
				ctx.quadraticCurveTo(6.7, -16.4, 6.3, -13.4);
				ctx.lineTo(5.3, -8.6);
				ctx.lineTo(-5.3, -8.6);
				ctx.lineTo(-6.3, -13.4);
				ctx.quadraticCurveTo(-6.7, -16.4, -4.7, -19.4);
				ctx.closePath();
			};
			forma(ctx, saia, cor);
			sombraDireita(ctx, saia, 2.4);
			traco(ctx, 2.8, -8.8, 2.6, -11, dobra, 0.7);
			return;
		}
		case 'evase': {
			const saia = () => {
				ctx.moveTo(-4.7, -19.4);
				ctx.lineTo(4.7, -19.4);
				ctx.lineTo(8.6, -9.4);
				ctx.quadraticCurveTo(0, -7.8, -8.6, -9.4);
				ctx.closePath();
			};
			forma(ctx, saia, cor);
			sombraDireita(ctx, saia, 2.6);
			traco(ctx, -1.6, -16.6, -3.4, -9.2, dobra, 0.7);
			traco(ctx, 2.2, -16.6, 4, -9.2, dobra, 0.7);
			if (cor === JEANS) traco(ctx, -7.6, -10.2, 7.6, -10.2, '#8aa6d2', 0.6);
			return;
		}
		case 'rodada': {
			const saia = () => {
				ctx.moveTo(-4.7, -19.4);
				ctx.lineTo(4.7, -19.4);
				ctx.quadraticCurveTo(7.4, -14.6, 9.8, -9.2);
				ctx.quadraticCurveTo(7.4, -7.6, 4.9, -8.6);
				ctx.quadraticCurveTo(2.4, -7.4, 0, -8.4);
				ctx.quadraticCurveTo(-2.4, -7.4, -4.9, -8.6);
				ctx.quadraticCurveTo(-7.4, -7.6, -9.8, -9.2);
				ctx.quadraticCurveTo(-7.4, -14.6, -4.7, -19.4);
				ctx.closePath();
			};
			forma(ctx, saia, cor);
			sombraDireita(ctx, saia, 2.6);
			traco(ctx, -2, -16, -4.9, -8.9, dobra, 0.7);
			traco(ctx, 2.2, -16, 4.9, -8.9, dobra, 0.7);
			return;
		}
	}
}

/** Braço fino; manga longa, curta ou bufante (vestido). Contexto já no ombro e girado. */
function bracoFeminino(ctx: C, f: Figurino, pele: string) {
	if (f.manga === 'longa') {
		const b = capsula(ctx, 0, 0, 12, 3.8);
		forma(ctx, b, f.corManga);
		sombraDireita(ctx, b, 0.7);
	} else {
		forma(ctx, capsula(ctx, 0, 0, 12, 3.2), pele);
		if (f.manga === 'curta') forma(ctx, capsula(ctx, 0, -0.2, 5, 4.2), f.corManga);
		else forma(ctx, oval(ctx, 0, 1.4, 2.8, 2.5), f.corManga);
	}
	forma(ctx, oval(ctx, 0, 12.2, 2.1, 2.1), pele);
}

/** Braço dele; contexto já no ombro e girado. */
function bracoMasculino(ctx: C, a: Aparencia, cor: string, pele: string) {
	const manga = a.roupa === 'jeans' ? DENIM : cor;
	if (a.roupa === 'vestido') forma(ctx, capsula(ctx, 0, 0, 12.4, 3.9), pele);
	else if (MANGA_CURTA.has(a.roupa)) {
		forma(ctx, capsula(ctx, 0, 0, 12.4, 3.9), pele);
		forma(ctx, capsula(ctx, 0, -0.2, 5.6, 4.6), manga);
	} else {
		const b = capsula(ctx, 0, 0, 12.4, 4.4);
		forma(ctx, b, manga);
		sombraDireita(ctx, b, 0.8);
	}
	forma(ctx, oval(ctx, 0, 12.6, 2.5, 2.5), pele);
}

/** Correntinha dourada com pingente. */
function colar(ctx: C, y = -28.2) {
	ctx.beginPath();
	ctx.arc(0.3, y - 3, 3, 0.18 * Math.PI, 0.82 * Math.PI);
	ctx.strokeStyle = '#d9a73a';
	ctx.lineWidth = 0.5;
	ctx.stroke();
	forma(ctx, oval(ctx, 0.3, y + 0.2, 0.75, 0.9), DOURADO, 0.45);
}

/** Detalhes da peça de cima feminina (dentro do recorte do tronco). */
function roupaFeminina(ctx: C, tipo: string, cor: string, clara: boolean, pele: string, deFrente: boolean) {
	const escura = tom(cor, 0.76);
	if (!deFrente) {
		if (tipo === 'moletom') forma(ctx, oval(ctx, 0, -28.6, 5.4, 3.4), escura, 0.8);
		else if (tipo === 'xadrez') xadrez(ctx, cor);
		else if (tipo === 'jeans') traco(ctx, -6, -22, 6, -22, '#8aa6d2', 0.7);
		traco(ctx, 0, -29, 0, -17, 'rgba(0,0,0,0.2)', 0.8);
		return;
	}
	const decote = (rx: number, ry: number) => forma(ctx, oval(ctx, 0.3, -30.6, rx, ry), pele, 0.7);
	const faixa = (corDentro: string) => forma(ctx, caixa(ctx, -1.7, -30.8, 4, 13, 0), corDentro, 0.6);
	switch (tipo) {
		case 'terno':
			// Tailleur: blusa de seda no decote, lapelas, dois botões, colar
			forma(ctx, poligono(ctx, [[-2.6, -30.6], [3.2, -30.6], [0.3, -23.6]]), '#fbf7f0', 0.7);
			decote(1.8, 1.3);
			colar(ctx, -28.4);
			forma(ctx, poligono(ctx, [[-2.6, -30.6], [-0.5, -24.4], [-3.9, -25.6]]), escura, 0.6);
			forma(ctx, poligono(ctx, [[3.2, -30.6], [1.1, -24.4], [4.5, -25.6]]), escura, 0.6);
			for (const y of [-21.6, -19.6]) ponto(ctx, 0.3, y, 0.55, escura);
			break;
		case 'blazer':
			forma(ctx, poligono(ctx, [[-3.2, -30.6], [3.8, -30.6], [2.4, -18], [-1.8, -18]]), '#f4f1eb', 0.6);
			decote(2.4, 1.8);
			colar(ctx);
			forma(ctx, poligono(ctx, [[-3.2, -30.6], [-1.7, -22.4], [-4.7, -23.8]]), escura, 0.6);
			forma(ctx, poligono(ctx, [[3.8, -30.6], [2.3, -22.4], [5.3, -23.8]]), escura, 0.6);
			break;
		case 'social': {
			// Blusa com laço no pescoço
			const laco = clara ? '#1c2534' : tom(cor, 1.4);
			for (const y of [-25, -22.6, -20.2]) ponto(ctx, 0.3, y, 0.42, tom(cor, 0.6));
			forma(ctx, poligono(ctx, [[0.1, -29.2], [-1.4, -25.4], [-0.2, -25.6]]), laco, 0.5);
			forma(ctx, poligono(ctx, [[0.5, -29.2], [2, -25.4], [0.8, -25.6]]), laco, 0.5);
			forma(ctx, oval(ctx, -1.5, -29.6, 1.7, 1.05, -0.25), laco, 0.55);
			forma(ctx, oval(ctx, 2.1, -29.6, 1.7, 1.05, 0.25), laco, 0.55);
			forma(ctx, oval(ctx, 0.3, -29.5, 0.8, 0.8), tom(laco, 0.85), 0.5);
			break;
		}
		case 'vestido':
			decote(3.6, 2.6);
			forma(ctx, caixa(ctx, -5.6, -19.6, 11.8, 1.3, 0.5), tom(cor, 0.7), 0.5);
			break;
		case 'camiseta': {
			decote(3.2, 2.1);
			// Coraçãozinho estampado
			const c = tom(cor, 1.4);
			ctx.beginPath();
			ctx.moveTo(-1.6, -21.9);
			ctx.bezierCurveTo(-3.6, -23.3, -2.9, -25.1, -1.6, -24.2);
			ctx.bezierCurveTo(-0.3, -25.1, 0.4, -23.3, -1.6, -21.9);
			ctx.fillStyle = c;
			ctx.fill();
			break;
		}
		case 'polo':
			decote(1.9, 1.4);
			forma(ctx, oval(ctx, -1.4, -29.8, 2, 1.2, 0.45), tom(cor, 1.25), 0.6);
			forma(ctx, oval(ctx, 2, -29.8, 2, 1.2, -0.45), tom(cor, 1.25), 0.6);
			traco(ctx, 0.3, -28.6, 0.3, -25.6, escura, 0.7);
			for (const y of [-27.6, -26.2]) ponto(ctx, 0.3, y, 0.4, '#ffffff');
			break;
		case 'xadrez':
			xadrez(ctx, cor);
			faixa('#f6f4ef');
			decote(1.8, 1.4);
			forma(ctx, poligono(ctx, [[-1.7, -30.6], [-0.4, -27.4], [-3.4, -27.8]]), tom(cor, 1.25), 0.6);
			forma(ctx, poligono(ctx, [[2.3, -30.6], [1, -27.4], [4, -27.8]]), tom(cor, 1.25), 0.6);
			break;
		case 'jaqueta':
			faixa('#ecebf0');
			decote(1.8, 1.4);
			forma(ctx, poligono(ctx, [[-1.7, -30.6], [-1.7, -25.2], [-5.2, -27]]), escura, 0.6);
			forma(ctx, poligono(ctx, [[2.3, -30.6], [2.3, -25.2], [5.8, -27]]), escura, 0.6);
			traco(ctx, -1.7, -25.2, -1.7, -18.4, tom(cor, 0.6), 0.5);
			traco(ctx, 2.3, -25.2, 2.3, -18.4, tom(cor, 0.6), 0.5);
			break;
		case 'jeans':
			faixa(cor);
			decote(1.8, 1.4);
			forma(ctx, caixa(ctx, -5, -27, 2.8, 2.6, 0.5), tom(DENIM, 0.86), 0.5);
			forma(ctx, caixa(ctx, 2.8, -27, 2.8, 2.6, 0.5), tom(DENIM, 0.86), 0.5);
			traco(ctx, -5, -20.4, -1.7, -20.4, '#8aa6d2', 0.6);
			traco(ctx, 2.3, -20.4, 5.2, -20.4, '#8aa6d2', 0.6);
			break;
		case 'moletom':
			forma(ctx, oval(ctx, 0.3, -30.2, 4.8, 2.4), escura, 0.7);
			decote(2.3, 1.4);
			traco(ctx, -1, -28.8, -1.2, -25, '#f4f4f2', 0.55);
			traco(ctx, 1.6, -28.8, 1.8, -25, '#f4f4f2', 0.55);
			forma(ctx, caixa(ctx, -3.8, -19.8, 8.2, 4.2, 1.6), tom(cor, 0.9), 0.6);
			break;
	}
}

/** O que fica por cima do tronco: o peplum do tailleur e o nó da camisa xadrez. */
function acabamentoFeminino(ctx: C, tipo: string, cor: string, deFrente: boolean) {
	if (tipo === 'terno') {
		const peplum = () => {
			ctx.moveTo(-4.7, -18.9);
			ctx.lineTo(4.7, -18.9);
			ctx.quadraticCurveTo(6.2, -16.8, 7.3, -15.2);
			ctx.quadraticCurveTo(0.3, -14, -7.3, -15.2);
			ctx.quadraticCurveTo(-6.2, -16.8, -4.7, -18.9);
			ctx.closePath();
		};
		forma(ctx, peplum, cor);
		sombraDireita(ctx, peplum, 2.9);
	} else if (tipo === 'xadrez' && deFrente) {
		forma(ctx, poligono(ctx, [[-0.6, -18.8], [-4.4, -15.4], [-1.6, -15.2]]), cor, 0.7);
		forma(ctx, poligono(ctx, [[1.2, -18.8], [5, -15.6], [2.2, -15.2]]), cor, 0.7);
		forma(ctx, oval(ctx, 0.3, -18.4, 1.9, 1.4), tom(cor, 0.85), 0.7);
	}
}

/** Sapatos dela: menores, de bico fino; o social vira scarpin e a bota é de cano alto. */
function sapatoFeminino(ctx: C, tipo: string, px: number, y: number) {
	const scarpin = (cor: string) => {
		forma(ctx, () => {
			ctx.moveTo(px - 1.9, y - 3.1);
			ctx.lineTo(px - 0.4, y - 2.9);
			ctx.quadraticCurveTo(px + 2.2, y - 2.4, px + 3.9, y - 0.9);
			ctx.lineTo(px + 3.7, y - 0.2);
			ctx.lineTo(px - 0.6, y - 0.5);
			ctx.lineTo(px - 0.9, y);
			ctx.lineTo(px - 1.9, y);
			ctx.closePath();
		}, cor, 0.8);
		ponto(ctx, px + 1.9, y - 1.7, 0.4, 'rgba(255,255,255,0.4)');
	};
	switch (tipo) {
		case 'bota':
			forma(ctx, caixa(ctx, px - 2.1, y - 9.6, 4.4, 9.2, [1.4, 1.4, 0.6, 0.6]), '#5a3d26', 0.8);
			forma(ctx, caixa(ctx, px - 2.1, y - 3, 6, 3, [1.2, 2.2, 0.8, 0.8]), '#5a3d26', 0.8);
			forma(ctx, caixa(ctx, px - 2.1, y - 1.3, 1.4, 1.3, 0.3), '#2e1f14', 0.5);
			traco(ctx, px - 2, y - 8.4, px + 2.2, y - 8.4, '#7a5536', 0.7);
			break;
		case 'tenis':
		case 'tenisPreto': {
			const branco = tipo === 'tenis';
			forma(ctx, caixa(ctx, px - 2.2, y - 3, 6, 3, [1.6, 2.2, 0.8, 0.8]), branco ? '#f5f5f2' : '#2a2d35', 0.8);
			traco(ctx, px - 1.8, y - 0.5, px + 3.4, y - 0.5, branco ? '#c4cad3' : '#f2f2f2', 0.9);
			if (branco) traco(ctx, px - 0.2, y - 2.2, px + 1.4, y - 2.2, '#e07a9a', 0.6);
			break;
		}
		case 'salto':
			scarpin('#b3263a');
			break;
		case 'marrom':
			scarpin('#9a6440');
			break;
		default:
			scarpin('#1c1f26');
	}
}

// ------------------------------------------------------------------- boneco

/** Corpo, roupa e acessórios com os pés na origem (sem translação de mundo). */
export function desenharBoneco(
	ctx: C,
	p: { dirX: number; dirY: number; andando: boolean; fase: number; t: number; sentado?: boolean; maoErguida?: boolean },
	a: Aparencia = APARENCIA_PADRAO
) {
	const sentado = !!p.sentado;
	const telaX = p.dirX - p.dirY;
	const telaY = p.dirX + p.dirY;
	const esquerda = telaX < -0.05;
	const deFrente = telaY >= -0.05;
	const feminino = a.corpo === 'feminino';

	// Bicho de roupa: a pele é o pelo e o cabelo original não sai (o topete do
	// macaco, por exemplo, é da cabeça de bicho)
	const bicho = bichoDe(a.bicho);
	const pele = bicho ? bicho.pelo : corDe(PELES, a.pele);
	const estiloCabelo = bicho ? '' : a.cabelo;
	const cabelo = corDe(CORES_CABELO, a.corCabelo);
	const roupa = a.corRoupa;
	const clara = luzDe(roupa) > 150;
	const vestido = a.roupa === 'vestido';

	// Parte de baixo: a de sempre (sai da roupa) ou a escolhida no campo `baixo`
	let calca: string | null;
	if (feminino || (vestido && a.baixo === 'auto')) calca = null;
	else if (a.corBaixo) calca = a.corBaixo;
	else if (a.baixo === 'jeans') calca = JEANS;
	else if (a.baixo === 'calcaSocial') calca = SAIA_ESCURA;
	else calca = a.roupa === 'terno' ? tom(roupa, 0.88) : FORMAIS_COM_CINTO.has(a.roupa) ? '#2b3240' : JEANS;
	const fig = feminino ? figurinoFeminino(a.roupa, roupa, luzDe(roupa)) : null;
	if (fig) {
		const formaDeBaixo = BAIXO_FEMININO[a.baixo];
		if (formaDeBaixo) {
			fig.baixo = formaDeBaixo;
			if (a.baixo === 'jeans') fig.corBaixo = JEANS;
			else if (a.baixo === 'calcaSocial') fig.corBaixo = SAIA_ESCURA;
		}
		if (a.corBaixo) fig.corBaixo = a.corBaixo;
	}

	const ps = passada(a.andar, p);
	const { passo, sobe } = ps;
	// Sentado: canela (do joelho ao pé) e colo, na cor da calça ou da saia
	const corColo = fig ? fig.corBaixo : (calca ?? roupa);
	const corCanela = fig ? (fig.baixo === 'calca' ? fig.corBaixo : pele) : (calca ?? pele);

	const q: Quadro = {
		a,
		feminino,
		deFrente,
		sentado,
		andando: p.andando,
		fase: p.fase,
		t: p.t,
		passada: ps,
		m: { ...(feminino ? MEDIDAS_FEMININO : MEDIDAS_MASCULINO) },
		bicho,
		pele,
		cabelo,
		roupa,
		clara,
		corBaixo: corColo,
		extra: a.corExtra,
		sapato: (px, y) => {
			if (corpo.sapato(ctx, q, px, y)) return;
			if (feminino) sapatoFeminino(ctx, a.sapato, px, y);
			else desenharSapato(ctx, a.sapato, px, y);
		}
	};
	const m = (q.m = corpo.medidas(q, q.m));

	// Sombra no chão (menor quando flutua)
	const longe = 1 - Math.min(0.4, ps.flutua / 15);
	ctx.beginPath();
	ctx.ellipse(0, -0.4, 10.5 * longe, 4.4 * longe, 0, 0, Math.PI * 2);
	ctx.fillStyle = `rgba(16, 24, 40, ${0.24 * longe})`;
	ctx.fill();

	ctx.save();
	if (esquerda) ctx.scale(-1, 1);
	if (ps.flutua) ctx.translate(0, -ps.flutua);

	/** Leva o contexto do chão para o quadril (sobe, recuo de sentado, inclinação). */
	const noQuadril = () => {
		if (sentado) ctx.translate(-RECUO_SENTADO, ABAIXA_SENTADO - sobe);
		else ctx.translate(0, -sobe);
		if (ps.inclina) {
			ctx.translate(0, -14);
			ctx.rotate(ps.inclina);
			ctx.translate(0, 14);
		}
	};

	// O que fica atrás de tudo (aura, asas, capa de frente)
	ctx.save();
	noQuadril();
	corpo.atras(ctx, q);
	ctx.restore();

	// Pernas e sapatos
	if (!corpo.pernas(ctx, q)) {
		if (sentado) canelas(ctx, corCanela, feminino, q.sapato);
		else if (fig) pernasFemininas(ctx, fig, q.sapato, pele, ps);
		else {
			const pernas: [number, number][] = [
				[-3 + passo * 2.4, Math.max(0, passo) * ps.pe],
				[3 - passo * 2.4, Math.max(0, -passo) * ps.pe]
			];
			for (const [px, ergue] of pernas) {
				if (calca) {
					const perna = capsula(ctx, px, -16 - sobe, -2.4 - ergue, 5.2);
					forma(ctx, perna, calca);
					sombraDireita(ctx, perna, px + 0.9);
				} else forma(ctx, capsula(ctx, px, -9 - sobe, -2.4 - ergue, 4.2), pele);
				q.sapato(px, -ergue);
			}
		}
	}

	noQuadril();

	// Saia (ou quadril da calça) por cima do alto das pernas; sentado, vira colo
	if (!sentado && !corpo.parteDeBaixo(ctx, q)) {
		if (fig) parteDeBaixo(ctx, fig);
		else if (vestido) {
			const saia = poligono(ctx, [[-5.8, -15.6], [5.8, -15.6], [8.2, -7.4], [-8.2, -7.4]]);
			forma(ctx, saia, roupa);
			sombraDireita(ctx, saia, 2.6);
			traco(ctx, -7.6, -8.6, 7.6, -8.6, tom(roupa, 0.72), 0.9);
		}
	}

	/** A cabeça (com pescoço, cabelo e chapéu) sobe ou desce com o porte. */
	const naAlturaDaCabeca = (f: () => void) => {
		ctx.save();
		if (m.ergue) ctx.translate(0, -m.ergue);
		f();
		ctx.restore();
	};

	if (deFrente)
		naAlturaDaCabeca(() => {
			cabeloAtras(ctx, estiloCabelo, cabelo);
			cabeca.cabecaAtras(ctx, q);
		});

	// Braços (o contexto do gancho já vem no ombro e girado)
	const balanco = ps.balanco;
	const braco = (lado: -1 | 1, angulo: number) => {
		ctx.save();
		ctx.translate(lado * m.ombroX, m.ombroY);
		ctx.rotate(angulo);
		if (!corpo.braco(ctx, q, lado)) {
			if (fig) bracoFeminino(ctx, fig, pele);
			else bracoMasculino(ctx, a, roupa, pele);
		}
		ctx.restore();
	};
	braco(-1, balanco);

	// Tronco e roupa
	const contorno = corpo.tronco(ctx, q) ?? (fig ? troncoFeminino(ctx, fig.longo) : tronco(ctx));
	ctx.beginPath();
	contorno();
	ctx.fillStyle = a.roupa === 'jeans' ? DENIM : roupa;
	ctx.fill();
	ctx.save();
	ctx.beginPath();
	contorno();
	ctx.clip();
	if (!corpo.roupa(ctx, q)) {
		if (fig) roupaFeminina(ctx, a.roupa, roupa, clara, pele, deFrente);
		else desenharRoupa(ctx, a.roupa, roupa, clara, pele, deFrente);
	}
	ctx.fillStyle = SOMBRA;
	ctx.fillRect(m.sombraX, -40, 20, 32);
	ctx.restore();
	ctx.beginPath();
	contorno();
	ctx.strokeStyle = CONTORNO;
	ctx.lineWidth = LW;
	ctx.stroke();
	if (fig) acabamentoFeminino(ctx, a.roupa, roupa, deFrente);
	corpo.acabamento(ctx, q);
	if (sentado && deFrente && !corpo.colo(ctx, q)) coxas(ctx, corColo, feminino);

	naAlturaDaCabeca(() => {
		// Pescoço, orelhas (com brinco, nela) e cabeça
		if (fig) forma(ctx, caixa(ctx, -1.6, -32.4, 3.4, 2.6, 1), tom(pele, 0.9), 0.8);
		else forma(ctx, caixa(ctx, -2.1, -32.4, 4.2, 2.6, 1), tom(pele, 0.9), 0.8);
		if (!cabeca.orelhas(ctx, q)) {
			forma(ctx, oval(ctx, -R + 0.3, CY + 0.8, 2, 2.6), pele);
			forma(ctx, oval(ctx, R - 0.3, CY + 0.8, 2, 2.6), pele);
			if (fig) for (const x of [-R + 0.1, R - 0.1]) forma(ctx, oval(ctx, x, CY + 3.9, 0.95, 0.95), DOURADO, 0.5);
		}
		if (!cabeca.formaDaCabeca(ctx, q)) {
			const cabecaRedonda = oval(ctx, 0, CY, R, R);
			forma(ctx, cabecaRedonda, pele);
			sombraDireita(ctx, cabecaRedonda, 5.4, SOMBRA_PELE);
			ctx.beginPath();
			cabecaRedonda();
			ctx.strokeStyle = CONTORNO;
			ctx.lineWidth = LW;
			ctx.stroke();
		}

		if (deFrente) {
			if (!cabeca.rosto(ctx, q)) desenharRosto(ctx, feminino, pele, cabelo);
			cabeca.sobreORosto(ctx, q);
			cabeloFrente(ctx, estiloCabelo, cabelo);
			cabeca.cabeloFrente(ctx, q);
			desenharOculos(ctx, a.oculos);
			cabeca.oculos(ctx, q);
			cabeca.chapeu(ctx, q);
		} else {
			cabeloCostas(ctx, estiloCabelo, cabelo);
			cabeca.costas(ctx, q);
		}
	});

	// Braço da frente, com o item na mão (no centro da mão, sem o giro do braço).
	// Mão levantada: o braço sobe para o lado de fora e acena; o item some
	const anguloFrente = p.maoErguida ? -Math.PI * 0.86 + 0.13 * Math.sin(p.t * 6) : -balanco + m.anguloMao;
	const comItem = a.naMao !== 'nada' && !p.maoErguida;
	const naMao = (camada: 'atras' | 'frente') => {
		ctx.save();
		ctx.translate(m.ombroX - Math.sin(anguloFrente) * m.braco, m.ombroY + Math.cos(anguloFrente) * m.braco);
		corpo.naMao(ctx, q, camada);
		ctx.restore();
	};
	if (comItem) naMao('atras');
	braco(1, anguloFrente);
	if (comItem) naMao('frente');
	ctx.restore();
}

function desenharRosto(ctx: C, feminino: boolean, pele: string, cabelo: string) {
	const olhos = [-2.7, 3.7];
	// Bochechas (mais coradas nela)
	for (const x of [-5.5, 6.4]) {
		ctx.beginPath();
		ctx.ellipse(x, -36.4, feminino ? 2.1 : 1.9, feminino ? 1.3 : 1.15, 0, 0, Math.PI * 2);
		ctx.fillStyle = feminino ? 'rgba(236, 96, 120, 0.55)' : 'rgba(236, 104, 116, 0.42)';
		ctx.fill();
	}
	// Sobrancelhas: nela, finas e arqueadas
	for (const x of olhos) {
		ctx.beginPath();
		if (feminino) {
			ctx.moveTo(x - 1.7, -43.8);
			ctx.quadraticCurveTo(x - 0.1, -45.7, x + 1.7, -44.2);
		} else {
			ctx.moveTo(x - 1.6, -43.5);
			ctx.quadraticCurveTo(x, -44.6, x + 1.5, -43.7);
		}
		ctx.strokeStyle = tom(cabelo, 0.7);
		ctx.lineWidth = feminino ? 0.7 : 0.95;
		ctx.lineCap = 'round';
		ctx.stroke();
	}
	// Olhos grandes com brilho; nela, cílios para fora
	for (const x of olhos) {
		ctx.beginPath();
		ctx.ellipse(x, -40.3, feminino ? 1.55 : 1.45, feminino ? 2.05 : 1.95, 0, 0, Math.PI * 2);
		ctx.fillStyle = '#1f2230';
		ctx.fill();
		ponto(ctx, x + 0.45, -41.1, 0.6, '#ffffff');
		if (feminino) {
			const fora = x < 0.5 ? -1 : 1;
			traco(ctx, x + fora * 1.2, -41.5, x + fora * 2.5, -42.1, '#1f2230', 0.7);
			traco(ctx, x + fora * 0.7, -42.1, x + fora * 1.6, -43.2, '#1f2230', 0.65);
			traco(ctx, x + fora * 1.45, -40.7, x + fora * 2.6, -40.8, '#1f2230', 0.6);
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
	// Nela, o contorno da boca é batom
	ctx.strokeStyle = feminino ? '#c4405e' : CONTORNO;
	ctx.lineWidth = feminino ? 1 : 0.75;
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
	if (tipo !== 'grau' && tipo !== 'grosso') return; // os novos saem em avatar-cabeca.ts
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

// ------------------------------------------------------- altura e cabecinha

/**
 * Até onde sobe cada cabelo, chapéu e enfeite (px acima do chão, no porte
 * padrão e parado, com a respiração). Medido pixel a pixel em 10/11/2026 (a
 * prévia do integrador desenhou cada cabelo com cada chapéu); o que não está
 * aqui fica abaixo de ALTO_PADRAO. Peça nova que sobe mais: entra aqui.
 */
const ALTO_PADRAO = 54;
const ALTO_CABELO: Record<string, number> = {
	raboCacheado: 60,
	moicano: 59.75,
	cachosVolumosos: 58.75,
	topete: 58.5,
	coque: 58.5,
	black: 57.5,
	chanelCacheado: 57,
	arrepiado: 57,
	cacheado: 56.5,
	penteadoTras: 56.25,
	espetado: 55.75,
	ondulado: 54.5,
	// Segunda rodada: medido pelo pintor da cabeça depois de desenhar (o mesmo
	// método dá 62 na cartola)
	coqueSolto: 58.5,
	flattop: 57.25,
	onduladoCurto: 55.75,
	repicado: 55.5,
	permanente: 55.5,
	chanelOndulado: 54.75,
	ombro: 54.5
};
const ALTO_CHAPEU: Record<string, number> = {
	cartola: 62,
	chapeuMago: 61.75,
	aureola: 61.75,
	fedora: 58.5,
	laco: 58,
	gorro: 57.5,
	boina: 57.5,
	fone: 57,
	bone: 56.25,
	capuz: 56,
	// Segunda rodada (medido). O chapéu de palha sobe até cobrir o coque do samurai
	chapeuPalha: 59.25,
	abaLarga: 59,
	chapeuFlor: 58,
	lencoCabeca: 55
};
const ALTO_DETALHE: Record<string, number> = { antenas: 60.5, chifres: 57.75 };
/**
 * Orelhas de bicho (segunda rodada, medido): a da coelha encosta no teto. O
 * cachorro e a dálmata (orelha caída, 51,25) ficam abaixo do padrão.
 */
const ALTO_BICHO: Record<string, number> = {
	coelho: 61.5,
	lobo: 57.5,
	macaco: 55.5,
	gato: 55,
	guaxinim: 55,
	tigre: 54.5,
	urso: 54.25,
	panda: 54.25
};

/** Quanto a cabeça sobe (ou desce) pelo porte: gigante +2,6, baixinho -2,4. */
export function ergueDaCabeca(a: Aparencia): number {
	const feminino = a.corpo === 'feminino';
	// corpo.medidas só lê a aparência, o sexo e se está sentado
	const q = { a, feminino, sentado: false } as Quadro;
	return corpo.medidas(q, { ...(feminino ? MEDIDAS_FEMININO : MEDIDAS_MASCULINO) }).ergue;
}

const altos = new WeakMap<Aparencia, [number, number]>();

/**
 * Até onde o boneco sobe acima do chão (px do zoom 1): o cabelo ou chapéu
 * mais alto e o porte; em pé, também o pulo do jeito de andar e o flutuar
 * (sentado não pula nem flutua). O jogo usa para pôr o crachá, o "z z z" e o
 * balão do agente acima da cabeça. Guardado por aparência (o jogo pergunta a
 * cada quadro).
 */
export function altoDoBoneco(a: Aparencia, sentado = false): number {
	let par = altos.get(a);
	if (!par) {
		// Bicho não tem cabelo: vale a orelha
		const bicho = bichoDe(a.bicho);
		const topo = bicho ? (ALTO_BICHO[bicho.id] ?? ALTO_PADRAO) : (ALTO_CABELO[a.cabelo] ?? ALTO_PADRAO);
		let alto = Math.max(topo, ALTO_CHAPEU[a.chapeu] ?? 0);
		for (const d of a.detalhes) alto = Math.max(alto, ALTO_DETALHE[d] ?? 0);
		alto += ergueDaCabeca(a);
		// Andando, o pulo troca a respiração (0,4, que já está na medida)
		const pulo = passada(a.andar, { andando: true, fase: Math.PI / 2, t: 0 }).sobe;
		const flutua = a.andar === 'flutuante' ? 5.2 : 0;
		par = [alto + Math.max(0, pulo - 0.4) + flutua, alto];
		altos.set(a, par);
	}
	return par[sentado ? 1 : 0];
}

/**
 * Até onde o crachá, o "z z z" e o balão precisam subir além do lugar de
 * sempre (que cabe o boneco até 56 px de altura).
 */
export const sobraNoAlto = (a: Aparencia, sentado = false) => Math.max(0, altoDoBoneco(a, sentado) - 56);

/**
 * A "cabecinha" da tela de escolha: o boneco inteiro, de frente e parado,
 * com a cabeça no centro de um círculo de `raio` px (recortado nele). O
 * desenho é o do jogo; só a escala muda.
 */
export function desenharCabecinha(ctx: C, a: Aparencia, cx: number, cy: number, raio: number, t = 0.6) {
	// O círculo pega da ponta do chapéu alto ao colarinho: ~16 px do boneco
	const k = raio / 16;
	// Orelha de bicho que passa do círculo (a da coelha vai a 61,5; ele acaba
	// em ~59,7): o boneco desce o que passa, para a ponta não sair cortada
	const bicho = bichoDe(a.bicho);
	const desce = bicho ? Math.min(2.4, Math.max(0, (ALTO_BICHO[bicho.id] ?? 0) - 59.5)) : 0;
	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, raio, 0, Math.PI * 2);
	ctx.clip();
	ctx.translate(cx, cy);
	ctx.scale(k, k);
	ctx.translate(0, -(CY - 3.2 - ergueDaCabeca(a)) + desce);
	desenharBoneco(ctx, { dirX: 1, dirY: 1, andando: false, fase: 0, t }, a);
	ctx.restore();
}

/** Boneco num ponto do mundo (o jogo). */
export function desenharAvatar(ctx: C, p: Pose, a: Aparencia = APARENCIA_PADRAO) {
	const base = paraTela(p.x, p.y, 0);
	ctx.save();
	ctx.translate(base.x, base.y);
	desenharBoneco(ctx, p, a);
	ctx.restore();
}

/**
 * Retângulo do avatar na tela (zoom 1), para o clique. `sobra`: o tanto que o
 * chapéu alto, o gigante ou quem flutua passam do boneco de sempre (sobraNoAlto).
 */
export function areaDoAvatar(x: number, y: number, sentado = false, sobra = 0) {
	const b = paraTela(x, y, 0);
	return { x0: b.x - 12, y0: b.y - 56 - sobra + (sentado ? ABAIXA_SENTADO : 0), x1: b.x + 12, y1: b.y + 3 };
}
