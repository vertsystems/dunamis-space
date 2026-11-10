// Peças novas do CORPO do boneco do DGathe (pintor do corpo).
//
// Pedido do Bruno (10/11/2026): personagens prontos, com bastante variedade
// (reais, sobrenaturais, heróis). Aqui ficam os portes (gordinho, forte,
// gigante...), as roupas novas, as partes de baixo novas (pantalona, cargo,
// saia midi...), os sapatos novos, os itens na mão e os detalhes do corpo
// (capa, asas, aura, relógio...). A lista exata (id, como é, quem usa) está em
// docs/dgathe/personagens.md.
//
// Como funciona: avatar.ts chama cada função exportada no ponto certo da ordem
// de desenho, já com o contexto no lugar (pés na origem, espelhado quando anda
// para a esquerda). As peças ORIGINAIS (roupas terno, blazer, social, vestido,
// camiseta, polo, xadrez, jaqueta, jeans, moletom; sapatos social, marrom,
// tenis, tenisPreto, bota, salto; o corpo padrão dele e dela) continuam em
// avatar.ts. Quem não usa nada daqui recebe false/null/as medidas recebidas e
// sai idêntico ao boneco de antes.
//
// Por que algumas peças originais também são redesenhadas aqui: um porte novo
// muda a largura da perna, do braço e do quadril. Quando o porte não é o
// padrão, as pernas, os braços e (nela) o quadril e a saia saem daqui, nas
// medidas do porte, imitando a peça original. O desenho de dentro do tronco
// das roupas originais continua em avatar.ts (o porte guarda o alto do tronco
// perto do padrão para os detalhes caírem no lugar), menos a jaqueta jeans do
// gigante, que vira aberta com o peito à mostra (ref. 13).
//
// Regras: importar só de avatar-base.ts (nunca de avatar.ts); cada função
// deixa o contexto como encontrou (save/restore); contorno com forma() e
// sombra chapada à direita com sombraDireita(). O boneco tem 54 px: poucos
// elementos, bem marcados; nada de letra, número, logo nem marca.

import {
	ABAIXA_SENTADO,
	CONTORNO,
	DENIM,
	DOURADO,
	JEANS,
	LW,
	RECUO_SENTADO,
	caixa,
	capsula,
	extraOu,
	forma,
	luzDe,
	oval,
	poligono,
	ponto,
	sombraDireita,
	temDetalhe,
	tom,
	traco,
	type C,
	type Medidas,
	type Quadro
} from './avatar-base';

// =================================================================== catálogo

/** Roupas desenhadas aqui (as outras são as originais, de avatar.ts). */
const ROUPAS_NOVAS = new Set([
	'ternoColete',
	'smoking',
	'sobretudo',
	'trench',
	'camisaDobrada',
	'blazerVestido',
	'blusaAmpla',
	'jaleco',
	'golaAlta',
	'sueter',
	'bomber',
	'jaquetaCouro',
	'jaquetaCurta',
	'regata',
	'top',
	'macacao',
	'semCamisa',
	'uniformeHeroi',
	'quimono',
	'tunica',
	'robo',
	// Segunda rodada (refs. 18 a 55)
	'vestidoEnvelope',
	'blusaEnvelope',
	'trenchCurto',
	'casacoLongo',
	'camisaCurta',
	'xadrezAberta',
	'camisaListrada',
	'jaquetaCapuz',
	'jaquetaPelucia',
	'puffer',
	'casacoPele',
	'cardiga',
	'colete',
	'trico',
	'camisaFutebol',
	'camuflado',
	'haori'
]);

/** Nela, roupas que descem até o quadril (as outras terminam na cintura). */
const LONGAS_DELA = new Set([
	'blazerVestido',
	'jaleco',
	'sueter',
	'jaquetaCouro',
	'quimono',
	'robo',
	'bomber',
	'golaAlta',
	'sobretudo',
	'trench',
	'ternoColete',
	'smoking',
	'casacoLongo',
	'xadrezAberta',
	'camisaListrada',
	'jaquetaCapuz',
	'jaquetaPelucia',
	'puffer',
	'casacoPele',
	'cardiga',
	'colete',
	'camisaFutebol',
	'camuflado',
	'haori'
]);

/** Camisa por dentro da calça ou da saia: o cós passa por cima da roupa. */
const POR_DENTRO = new Set(['camisaDobrada', 'camisaCurta', 'blusaEnvelope']);

/** Pelúcia creme (gola, punho e barra do casacão, gola da jaqueta do urso). */
const PELUCIA = '#ece0c8';
/** Camisa clara por baixo do colete. */
const CAMISA_CLARA = '#efe9dc';
/** Quimono escuro por baixo do haori. */
const QUIMONO_ESCURO = '#23262e';

/**
 * O que vai nas pernas. Partes de baixo novas, as originais dela (calça e as
 * três saias) e os casos em que a roupa decide (macacão, quimono, túnica,
 * robô) ou a perna fica de fora (ele de vestido).
 */
type Baixo =
	| 'calca'
	| 'legging'
	| 'pantalona'
	| 'cargo'
	| 'bermuda'
	| 'bermudaRasgada'
	| 'bufante'
	| 'lapis'
	| 'evase'
	| 'rodada'
	| 'saiaMidi'
	| 'saiaLonga'
	| 'macacao'
	| 'quimono'
	| 'tunica'
	| 'robo'
	| 'pele'
	// Segunda rodada
	| 'jeansRasgado'
	| 'calcaMoletom'
	| 'calcaLarga'
	| 'saiaFlorida'
	| 'calcao'
	| 'jardineira'
	| 'hakama'
	/** A saia transpassada do vestido envelope (vem com a roupa). */
	| 'saiaEnvelope'
	/** A calça cargo camuflada da farda (com a parte de baixo "auto"). */
	| 'camuflado';

const BAIXOS_NOVOS = new Set<string>([
	'legging',
	'pantalona',
	'cargo',
	'bermuda',
	'bermudaRasgada',
	'bufante',
	'saiaMidi',
	'saiaLonga',
	'jeansRasgado',
	'calcaMoletom',
	'calcaLarga',
	'saiaFlorida',
	'calcao',
	'jardineira',
	'hakama'
]);
const SAIAS = new Set<Baixo>(['lapis', 'evase', 'rodada', 'saiaMidi', 'saiaLonga', 'saiaFlorida', 'saiaEnvelope']);
/** Partes de baixo que a roupa decide (a perna é da roupa). */
const BAIXO_DA_ROUPA: Record<string, Baixo> = {
	macacao: 'macacao',
	quimono: 'quimono',
	tunica: 'tunica',
	robo: 'robo',
	vestidoEnvelope: 'saiaEnvelope'
};

/**
 * A parte de baixo que vem com a roupa quando a escolhida é "auto": a farda
 * vem com a calça cargo camuflada, o haori com a hakama e, nela, o casaco
 * longo deixa a perna de meia-calça (a barra cobre até abaixo do joelho).
 */
function baixoAutoDaRoupa(roupa: string, feminino: boolean): Baixo | undefined {
	if (roupa === 'camuflado') return 'camuflado';
	if (roupa === 'haori') return 'hakama';
	if (roupa === 'casacoLongo' && feminino) return 'pele';
	return undefined;
}

/** A parte de baixo que o figurino feminino de avatar.ts usa para cada roupa original. */
const BAIXO_ORIGINAL_DELA: Record<string, Baixo> = {
	terno: 'lapis',
	blazer: 'calca',
	social: 'evase',
	vestido: 'rodada',
	camiseta: 'calca',
	polo: 'evase',
	xadrez: 'calca',
	jaqueta: 'calca',
	jeans: 'rodada'
};
/** As saias originais escolhidas para ele (bônus: nenhum personagem usa). */
const SAIAS_ORIGINAIS: Record<string, Baixo> = { saiaLapis: 'lapis', saiaEvase: 'evase', saiaRodada: 'rodada' };
const BAIXO_ESCOLHIDO_DELA: Record<string, Baixo> = {
	calcaSocial: 'calca',
	jeans: 'calca',
	saiaLapis: 'lapis',
	saiaEvase: 'evase',
	saiaRodada: 'rodada'
};

/** Nele, a calça que combina com cada roupa nova quando a parte de baixo é "auto". */
const CALCA_DA_ROUPA: Record<string, (cor: string) => string> = {
	ternoColete: (cor) => tom(cor, 0.88),
	smoking: () => '#1c1f26',
	sobretudo: () => '#2b3240',
	trench: () => '#2b3240',
	camisaDobrada: () => '#2b3240',
	jaleco: () => '#2b3240',
	sueter: () => '#9b8a6e',
	uniformeHeroi: (cor) => cor,
	robo: (cor) => tom(cor, 0.8),
	casacoLongo: () => '#2b3240',
	jaquetaPelucia: () => '#2b3240',
	cardiga: () => '#6b6f78',
	colete: () => '#bfa984',
	haori: () => QUIMONO_ESCURO
};

/** Barra comprida que sai por baixo do tronco (casaco até o joelho, túnica até o pé). */
type Barra = 'sobretudo' | 'trench' | 'jaleco' | 'tunica' | 'casacoLongo' | 'casacoPele' | 'haori' | null;
const BARRAS: Record<string, Barra> = {
	sobretudo: 'sobretudo',
	trench: 'trench',
	jaleco: 'jaleco',
	tunica: 'tunica',
	casacoLongo: 'casacoLongo',
	casacoPele: 'casacoPele',
	haori: 'haori'
};

/** Itens que só aparecem em pé (sentado, a maleta e a bolsa ficam de fora do desenho). */
const SO_EM_PE = new Set(['maleta', 'bolsa', 'bolsaOmbro', 'capacete', 'cajado', 'sacola', 'raquete']);
/** Giro do braço da frente para segurar cada item (rad; 0 = solto ao lado do corpo). */
const ANGULO_DO_ITEM: Record<string, number> = {
	celular: 0.9,
	prancheta: 0.5,
	cafe: 0.7,
	camera: 0.6,
	lupa: 0.3,
	cachimbo: 1,
	cajado: 0.1,
	banana: 0.7,
	cafeGelado: 0.8,
	caneta: 1.1,
	raquete: 0.85
};

// =================================================================== portes

/**
 * Medidas de cada porte. Coordenadas do boneco (pés em 0, y para cima é
 * negativo). `k` é o fator de largura dos detalhes da roupa em relação ao
 * corpo padrão dele (7,2 de meia-largura).
 */
type Geo = {
	/** Alto do tronco, meia-largura no ombro e na base, fim do tronco (curto e longo, dela). */
	topo: number;
	ombro: number;
	base: number;
	baseLonga: number;
	larguraBase: number;
	/** Barriga do gordinho (meia-largura máxima; 0 = sem). */
	barriga: number;
	/** Cintura dela (meia-largura e altura) e meia-largura do quadril. */
	cintura: number;
	cinturaY: number;
	quadrilL: number;
	/** Onde a perna começa (y), onde fica (x), largura de calça e de perna de pele. */
	quadril: number;
	pernaX: number;
	pernaL: number;
	pernaPele: number;
	/** Largura do braço e raio da mão. */
	bracoL: number;
	mao: number;
	k: number;
	/** Escala dos sapatos novos. */
	pe: number;
	/** Quanto os braços abrem para fora (rad): em volta da barriga, do músculo. */
	abre: number;
	/** O que muda nas Medidas de avatar.ts. */
	m: Partial<Medidas>;
};

const DELE: Geo = {
	topo: -30.5,
	ombro: 7.2,
	base: -14,
	baseLonga: -14,
	larguraBase: 7.2,
	barriga: 0,
	cintura: 7.2,
	cinturaY: -17,
	quadrilL: 7.2,
	quadril: -16,
	pernaX: 3,
	pernaL: 5.2,
	pernaPele: 4.2,
	bracoL: 4.4,
	mao: 2.5,
	k: 1,
	pe: 1,
	abre: 0,
	m: {}
};

const DELA: Geo = {
	topo: -30.5,
	ombro: 5.9,
	base: -18.2,
	baseLonga: -14.4,
	larguraBase: 4.7,
	barriga: 0,
	cintura: 4.4,
	cinturaY: -20.8,
	quadrilL: 4.7,
	quadril: -17,
	pernaX: 2.2,
	pernaL: 4.2,
	pernaPele: 3.4,
	bracoL: 3.8,
	mao: 2.1,
	k: 0.82,
	pe: 1,
	abre: 0,
	m: {}
};

const PORTES_DELE: Record<string, Geo> = {
	padrao: DELE,
	magro: {
		...DELE,
		ombro: 6.2,
		larguraBase: 6.1,
		cintura: 6.1,
		quadrilL: 6.1,
		pernaX: 2.6,
		pernaL: 4.3,
		pernaPele: 3.6,
		bracoL: 3.6,
		mao: 2.25,
		k: 0.86,
		m: { ombroX: 6.2, sombraX: 2.8 }
	},
	// Barriga redonda que passa da linha do tronco, ombro caído (ref. 4)
	gordinho: {
		...DELE,
		ombro: 7.4,
		base: -13.4,
		baseLonga: -13.4,
		larguraBase: 5.4,
		barriga: 9.9,
		cintura: 9.9,
		quadrilL: 8.4,
		pernaX: 3.5,
		pernaL: 6.2,
		pernaPele: 5,
		bracoL: 5,
		mao: 2.6,
		k: 1.08,
		pe: 1.06,
		abre: 0.2,
		m: { ombroX: 7.6, ombroY: -28.2, braco: 12.2, sombraX: 4.6 }
	},
	// Ombro largo e peito em V
	forte: {
		...DELE,
		topo: -31,
		ombro: 9,
		larguraBase: 6.8,
		cintura: 6.8,
		quadrilL: 6.8,
		pernaX: 3.3,
		pernaL: 6,
		pernaPele: 5,
		bracoL: 5.6,
		mao: 2.9,
		k: 1.18,
		pe: 1.06,
		abre: 0.08,
		m: { ombroX: 8.7, ombroY: -28.9, braco: 12.8, ergue: 0.5, sombraX: 4.2 }
	},
	// O maior: tronco alto, ombro enorme, mão grande, perna grossa e curta (refs. 12 e 13)
	gigante: {
		...DELE,
		topo: -31.6,
		ombro: 10.6,
		base: -12.2,
		baseLonga: -12.2,
		larguraBase: 7.8,
		cintura: 7.8,
		quadrilL: 7.8,
		quadril: -13.4,
		pernaX: 4.2,
		pernaL: 7.4,
		pernaPele: 6.6,
		bracoL: 6.8,
		mao: 3.5,
		k: 1.36,
		pe: 1.22,
		abre: 0.14,
		m: { ombroX: 10, ombroY: -29.2, braco: 12.6, ergue: 2.6, sombraX: 5.2 }
	},
	// Cabeça igual, tronco menor e mais baixo (a cabeça desce)
	baixinho: {
		...DELE,
		topo: -29.2,
		ombro: 6.8,
		larguraBase: 6.8,
		cintura: 6.8,
		quadrilL: 6.8,
		pernaX: 2.85,
		pernaL: 4.9,
		pernaPele: 4,
		bracoL: 4.2,
		mao: 2.4,
		k: 0.94,
		pe: 0.94,
		m: { ombroX: 6.8, ombroY: -27.4, braco: 11.4, ergue: -2.4, sombraX: 3.2 }
	}
};

const PORTES_DELA: Record<string, Geo> = {
	padrao: DELA,
	magro: {
		...DELA,
		ombro: 5.3,
		cintura: 3.9,
		quadrilL: 4.2,
		larguraBase: 4.2,
		pernaX: 2,
		pernaL: 3.6,
		pernaPele: 3,
		bracoL: 3.3,
		mao: 1.95,
		k: 0.74,
		m: { ombroX: 4.9, sombraX: 2.5 }
	},
	gordinho: {
		...DELA,
		ombro: 6.4,
		cintura: 6,
		quadrilL: 6.3,
		larguraBase: 6.3,
		pernaX: 2.7,
		pernaL: 5.2,
		pernaPele: 4.2,
		bracoL: 4.4,
		mao: 2.3,
		k: 0.92,
		pe: 1.04,
		abre: 0.12,
		m: { ombroX: 6, sombraX: 3.5 }
	},
	forte: {
		...DELA,
		ombro: 7.2,
		cintura: 5,
		quadrilL: 5.4,
		larguraBase: 5.4,
		pernaX: 2.6,
		pernaL: 5,
		pernaPele: 4,
		bracoL: 4.8,
		mao: 2.5,
		k: 0.98,
		pe: 1.04,
		m: { ombroX: 6.9, ombroY: -28.6, braco: 12.4, ergue: 0.4, sombraX: 3.4 }
	},
	gigante: {
		...DELA,
		topo: -32,
		ombro: 8.8,
		base: -17.4,
		baseLonga: -13.4,
		cintura: 6.6,
		cinturaY: -21.4,
		quadrilL: 7.2,
		larguraBase: 7.2,
		quadril: -15.6,
		pernaX: 3.5,
		pernaL: 6.4,
		pernaPele: 5.8,
		bracoL: 5.8,
		mao: 3.1,
		k: 1.2,
		pe: 1.18,
		abre: 0.1,
		m: { ombroX: 8.4, ombroY: -29.4, braco: 12.4, ergue: 2, sombraX: 4.4 }
	},
	baixinho: {
		...DELA,
		topo: -29.2,
		m: { ombroY: -27.2, braco: 11.2, ergue: -2.4 }
	}
};

// =================================================================== o plano

/** O que este boneco usa daqui, resolvido uma vez por quadro. */
type Plano = {
	g: Geo;
	porte: string;
	roupaNova: boolean;
	/** Parte de baixo resolvida e a cor da perna (calça, saia ou pele). */
	baixo: Baixo;
	corPerna: string;
	barra: Barra;
	pernas: boolean;
	parteDeBaixo: boolean;
	colo: boolean;
	braco: boolean;
	tronco: boolean;
	/** Desenha aqui os detalhes de dentro do tronco. */
	roupa: boolean;
	/** Tronco dela que desce até o quadril. */
	longo: boolean;
};

const planos = new WeakMap<Quadro, Plano>();

function plano(q: Quadro): Plano {
	const pronto = planos.get(q);
	if (pronto) return pronto;
	const a = q.a;
	const tabela = q.feminino ? PORTES_DELA : PORTES_DELE;
	const porte = tabela[a.porte] ? a.porte : 'padrao';
	const g = tabela[porte];
	const roupaNova = ROUPAS_NOVAS.has(a.roupa);

	let baixo: Baixo;
	const daRoupa = BAIXO_DA_ROUPA[a.roupa] ?? (a.baixo === 'auto' ? baixoAutoDaRoupa(a.roupa, q.feminino) : undefined);
	if (daRoupa) baixo = daRoupa;
	else if (BAIXOS_NOVOS.has(a.baixo)) baixo = a.baixo as Baixo;
	else if (q.feminino) baixo = BAIXO_ESCOLHIDO_DELA[a.baixo] ?? BAIXO_ORIGINAL_DELA[a.roupa] ?? 'calca';
	// Nele, as saias originais (lápis, evasê, rodada) saem daqui, na largura dele
	else if (SAIAS_ORIGINAIS[a.baixo]) baixo = SAIAS_ORIGINAIS[a.baixo];
	else baixo = a.roupa === 'vestido' && a.baixo === 'auto' ? 'pele' : 'calca';
	// Macacão, quimono, túnica e a farda: a perna é da cor da roupa; robô usa a cor de baixo (metal).
	// Roupa nova com a parte de baixo "combinando" (auto): avatar.ts daria jeans a
	// tudo que não é terno; aqui cada roupa ganha a calça que combina com ela.
	const autoDele = !q.feminino && roupaNova && a.baixo === 'auto' && !a.corBaixo ? CALCA_DA_ROUPA[a.roupa] : undefined;
	const daCorDaRoupa = baixo === 'macacao' || baixo === 'quimono' || baixo === 'tunica' || baixo === 'camuflado';
	const corPerna = daCorDaRoupa ? q.roupa : autoDele ? autoDele(q.roupa) : q.corBaixo;

	// Nela, o porte padrão e o baixinho usam a perna e o quadril de sempre
	const porteMudaPerna = q.feminino ? porte !== 'padrao' && porte !== 'baixinho' : porte !== 'padrao';
	const baixoNovo = BAIXOS_NOVOS.has(baixo) || !!daRoupa || (!q.feminino && SAIAS.has(baixo));
	const barra = BARRAS[a.roupa] ?? null;
	const pernas = porteMudaPerna || baixoNovo || !!autoDele;
	const parteDeBaixo = q.feminino
		? porteMudaPerna || baixoNovo || !!barra
		: !!barra || SAIAS.has(baixo);
	// Bicho de roupa (a mão vira pata), tatuagem e braços cruzados também saem daqui
	const acessorioNoBraco =
		temDetalhe(q, 'luvas') ||
		temDetalhe(q, 'pulseiras') ||
		temDetalhe(q, 'relogio') ||
		temDetalhe(q, 'tatuagem') ||
		!!q.bicho ||
		a.naMao === 'bracosCruzados';
	const longo = q.feminino && (roupaNova ? LONGAS_DELA.has(a.roupa) : a.roupa === 'moletom' || !(a.roupa in BAIXO_ORIGINAL_DELA));
	const adaptaJeans = !q.feminino && a.roupa === 'jeans' && (porte === 'gigante' || porte === 'forte');

	const p: Plano = {
		g,
		porte,
		roupaNova,
		baixo,
		corPerna,
		barra,
		pernas,
		parteDeBaixo,
		colo: pernas || !!barra,
		braco: porte !== 'padrao' || roupaNova || acessorioNoBraco || adaptaJeans,
		tronco: porte !== 'padrao' || (q.feminino && roupaNova),
		roupa: roupaNova || adaptaJeans,
		longo
	};
	planos.set(q, p);
	return p;
}

// =================================================================== ajudantes

const escura = (cor: string) => luzDe(cor) < 48;
/** Tom de dobra e detalhe: mais escuro, ou mais claro quando a peça já é quase preta. */
const dobra = (cor: string) => (escura(cor) ? tom(cor, 1.32) : tom(cor, 0.76));
/** Costura e risco fino. */
const costura = (cor: string) => (escura(cor) ? tom(cor, 1.55) : tom(cor, 0.6));

/** Faixa grossa com contorno (alça, cordão, ponta de faixa, cauda). */
function faixa(ctx: C, pts: [number, number][], cor: string, largura: number) {
	ctx.beginPath();
	ctx.moveTo(pts[0][0], pts[0][1]);
	if (pts.length === 3) ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
	else for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.strokeStyle = CONTORNO;
	ctx.lineWidth = largura + 1.1;
	ctx.stroke();
	ctx.strokeStyle = cor;
	ctx.lineWidth = largura;
	ctx.stroke();
}

/** Estrelinha de quatro pontas (túnica, chapéu de mago), sem contorno. */
function estrela(ctx: C, x: number, y: number, r: number, cor: string) {
	const i = r * 0.34;
	forma(ctx, poligono(ctx, [[x, y - r], [x + i, y - i], [x + r, y], [x + i, y + i], [x, y + r], [x - i, y + i], [x - r, y], [x - i, y - i]]), cor, 0);
}

/** #rrggbb com transparência. */
function rgba(cor: string, alfa: number) {
	const n = parseInt(cor.slice(1), 16);
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}

/** Linha de contorno de um caminho aberto (os lados de uma saia, sem a barra). */
function riscar(ctx: C, f: () => void, cor = CONTORNO, lw = LW) {
	ctx.beginPath();
	f();
	ctx.strokeStyle = cor;
	ctx.lineWidth = lw;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.stroke();
}

/** Cápsula de (x0, y0) a (x1, y1), em qualquer direção (antebraço cruzado, rabo). */
function segmento(ctx: C, x0: number, y0: number, x1: number, y1: number, largura: number) {
	return () => {
		const ang = Math.atan2(y1 - y0, x1 - x0);
		const r = largura / 2;
		ctx.arc(x0, y0, r, ang + Math.PI / 2, ang - Math.PI / 2);
		ctx.arc(x1, y1, r, ang - Math.PI / 2, ang + Math.PI / 2);
		ctx.closePath();
	};
}

/** Pinta dentro de um caminho (recorte) e devolve o contexto como estava. */
function dentroDe(ctx: C, f: () => void, pintar: () => void) {
	ctx.save();
	ctx.beginPath();
	f();
	ctx.clip();
	pintar();
	ctx.restore();
}

/**
 * Manchas do camuflado em posições fixas (fx, fy de 0 a 1 dentro da caixa;
 * raios em px; giro; 0 = tom escuro, 1 = tom claro). Poucas e grandes: no
 * boneco de 54 px, mancha pequena vira sujeira.
 */
const MANCHAS: [number, number, number, number, number, 0 | 1][] = [
	[0.1, 0.08, 1.9, 1.1, 0.4, 0],
	[0.56, 0.05, 1.6, 1, -0.3, 1],
	[0.88, 0.2, 1.8, 1.1, 0.8, 0],
	[0.3, 0.3, 1.7, 1, -0.6, 1],
	[0.7, 0.42, 2, 1.1, 0.2, 0],
	[0.06, 0.52, 1.6, 1, 0.9, 1],
	[0.44, 0.6, 1.8, 1, -0.2, 0],
	[0.92, 0.68, 1.5, 0.9, -0.7, 1],
	[0.2, 0.82, 1.9, 1, 0.3, 0],
	[0.66, 0.9, 1.6, 1, 0.6, 1]
];

/** Camuflado em três tons (a cor, tom 0,72 e 1,3) na caixa dada; quem chama já recortou. */
function camuflar(ctx: C, cor: string, x: number, y: number, w: number, h: number, escala = 1) {
	const tons = [tom(cor, 0.72), tom(cor, 1.3)];
	for (const [fx, fy, rx, ry, giro, t] of MANCHAS) {
		ctx.beginPath();
		ctx.ellipse(x + fx * w, y + fy * h, rx * escala, ry * escala, giro, 0, Math.PI * 2);
		ctx.fillStyle = tons[t];
		ctx.fill();
	}
}

/** Xadrez de linhas cruzadas (como o da camisa xadrez original), na caixa dada; quem chama já recortou. */
function xadrezEm(ctx: C, cor: string, x0: number, y0: number, x1: number, y1: number, passo = 3.6, lw = 1.1) {
	const risco = tom(cor, 0.66);
	ctx.globalAlpha = 0.55;
	for (let y = y0 + passo * 0.4; y < y1; y += passo) traco(ctx, x0, y, x1, y, risco, lw);
	for (let x = x0 + passo * 0.4; x < x1; x += passo) traco(ctx, x, y0, x, y1, risco, lw);
	ctx.globalAlpha = 1;
}

/** Botão grande e escuro com brilho (casaco longo). */
function botao(ctx: C, x: number, y: number, r: number) {
	forma(ctx, oval(ctx, x, y, r, r), '#2a2326', 0.4);
	ponto(ctx, x - r * 0.3, y - r * 0.3, r * 0.3, 'rgba(255,255,255,0.45)');
}

/** Bolinhas de pelúcia numa linha (borda da gola, do punho e da barra). */
function felpa(ctx: C, pts: [number, number][], r = 0.75) {
	for (const [x, y] of pts) forma(ctx, oval(ctx, x, y, r, r), PELUCIA, 0.45);
}

/** Bolso de lapela no peito (retângulo, aba mais escura e botão). */
function bolsoDeLapela(ctx: C, x: number, y: number, w: number, cor: string) {
	forma(ctx, caixa(ctx, x, y, w, 2.8, 0.4), tom(cor, 0.94), 0.5);
	forma(ctx, caixa(ctx, x - 0.1, y - 0.2, w + 0.2, 1.1, [0.4, 0.4, 0.6, 0.6]), dobra(cor), 0.5);
	ponto(ctx, x + w / 2, y + 0.6, 0.35, costura(cor));
}

// =================================================================== medidas

/**
 * Medidas do porte (ombro, braço, quanto a cabeça sobe) e o giro do braço da
 * frente para segurar o item na mão. Devolve `padrao` quando nada muda.
 */
export function medidas(q: Quadro, padrao: Medidas): Medidas {
	const tabela = q.feminino ? PORTES_DELA : PORTES_DELE;
	const g = tabela[q.a.porte];
	const item = q.a.naMao;
	let angulo = ANGULO_DO_ITEM[item] ?? 0;
	// Pingue-pongue (o jogo põe a raquete no agente que joga): o braço vai e volta
	if (item === 'raquete') angulo += Math.sin((q.t || 0) * 6.5) * 0.45;
	if (q.sentado) angulo = SO_EM_PE.has(item) ? 0 : item === 'notebook' || item === 'livro' ? 0.55 : angulo;
	if ((!g || g === DELE || g === DELA) && !angulo) return padrao;
	return { ...padrao, ...(g ? g.m : {}), anguloMao: padrao.anguloMao + angulo - (g ? g.abre : 0) };
}

// =================================================================== tronco

/**
 * O contorno do tronco (caminho, sem desenhar). null = o padrão (reto nele,
 * de cintura nela).
 */
export function tronco(ctx: C, q: Quadro): (() => void) | null {
	const p = plano(q);
	if (!p.tronco) return null;
	const g = p.g;
	const T = g.topo;
	if (q.feminino) {
		const a = g.ombro - 2.5;
		const s = T + 2.7;
		return () => {
			ctx.moveTo(-a, T);
			ctx.lineTo(a, T);
			ctx.quadraticCurveTo(g.ombro, T, g.ombro, s);
			if (p.longo) {
				const b = g.quadrilL + 1.8;
				ctx.quadraticCurveTo(g.ombro - 0.3, g.cinturaY - 0.2, b, g.baseLonga);
				ctx.lineTo(-b, g.baseLonga);
				ctx.quadraticCurveTo(-(g.ombro - 0.3), g.cinturaY - 0.2, -g.ombro, s);
			} else {
				ctx.quadraticCurveTo(g.ombro, g.cinturaY - 2.8, g.cintura, g.cinturaY);
				ctx.lineTo(g.cintura + 0.3, g.base);
				ctx.lineTo(-(g.cintura + 0.3), g.base);
				ctx.lineTo(-g.cintura, g.cinturaY);
				ctx.quadraticCurveTo(-g.ombro, g.cinturaY - 2.8, -g.ombro, s);
			}
			ctx.quadraticCurveTo(-g.ombro, T, -a, T);
			ctx.closePath();
		};
	}
	const B = g.base;
	if (g.barriga) {
		// Gordinho: ombro caído e barriga que passa da linha do tronco
		const o = g.ombro;
		const b = g.barriga;
		const meio = B - 5.2;
		return () => {
			ctx.moveTo(-3.6, T);
			ctx.lineTo(3.6, T);
			ctx.quadraticCurveTo(o, T, o + 0.1, T + 3.6);
			ctx.bezierCurveTo(o + 0.3, T + 7, b, T + 7.8, b, meio);
			ctx.bezierCurveTo(b, B - 1, b - 2.4, B + 0.2, g.larguraBase - 0.8, B + 0.1);
			ctx.lineTo(-g.larguraBase + 0.8, B + 0.1);
			ctx.bezierCurveTo(-b + 2.4, B + 0.2, -b, B - 1, -b, meio);
			ctx.bezierCurveTo(-b, T + 7.8, -o - 0.3, T + 7, -o - 0.1, T + 3.6);
			ctx.quadraticCurveTo(-o, T, -3.6, T);
			ctx.closePath();
		};
	}
	if (g.ombro - g.larguraBase > 0.5) {
		// Forte e gigante: ombro largo e arredondado, afinando até a cintura (V)
		const o = g.ombro;
		const w = g.larguraBase;
		const r = p.porte === 'gigante' ? 5.6 : 4.8;
		const meio = (T + B) / 2 + 2;
		return () => {
			ctx.moveTo(-o + r, T);
			ctx.lineTo(o - r, T);
			ctx.quadraticCurveTo(o, T, o, T + r);
			ctx.quadraticCurveTo(o - 0.4, meio, w, B - 2);
			ctx.quadraticCurveTo(w, B, w - 2, B);
			ctx.lineTo(-w + 2, B);
			ctx.quadraticCurveTo(-w, B, -w, B - 2);
			ctx.quadraticCurveTo(-o + 0.4, meio, -o, T + r);
			ctx.quadraticCurveTo(-o, T, -o + r, T);
			ctx.closePath();
		};
	}
	const raio = g.ombro < 6.5 ? [4.2, 4.2, 2.2, 2.2] : [4.6, 4.6, 2.4, 2.4];
	return () => ctx.roundRect(-g.ombro, T, g.ombro * 2, B - T, raio);
}

// =================================================================== roupa

/** Medidas que as roupas usam para pôr os detalhes. */
type Molde = {
	T: number;
	/** Fim do tronco. */
	B: number;
	/** Meia-largura no peito. */
	W: number;
	k: number;
	/** Linha do cinto: nele, perto do fim do tronco; nela, na cintura. */
	cinto: number;
	cor: string;
	esc: string;
	fem: boolean;
};

function molde(q: Quadro, p: Plano): Molde {
	const g = p.g;
	const B = q.feminino ? (p.longo ? g.baseLonga : g.base) : g.base;
	return {
		T: g.topo,
		B,
		W: q.feminino ? g.ombro - 0.3 : Math.max(g.ombro, g.barriga * 0.9),
		k: g.k,
		cinto: q.feminino ? g.cinturaY + 0.3 : B - 2,
		cor: q.roupa,
		esc: dobra(q.roupa),
		fem: q.feminino
	};
}

/**
 * Dentro do recorte do tronco (já pintado com a cor da roupa): os detalhes da
 * roupa, de frente e de costas. true = desenhei.
 */
export function roupa(ctx: C, q: Quadro): boolean {
	const p = plano(q);
	if (!p.roupa) return false;
	const d = molde(q, p);
	// Peito nu é só dele; nela, a mesma escolha vira top
	const desenho = ROUPAS[q.feminino && q.a.roupa === 'semCamisa' ? 'top' : q.a.roupa];
	if (!desenho) return false;
	if (q.deFrente) desenho.frente(ctx, q, d);
	else (desenho.costas ?? costasLisas)(ctx, q, d);
	return true;
}

type DesenhoRoupa = {
	frente: (ctx: C, q: Quadro, d: Molde) => void;
	costas?: (ctx: C, q: Quadro, d: Molde) => void;
};

/** Costas de quase tudo: a costura do meio. */
function costasLisas(ctx: C, _q: Quadro, d: Molde) {
	traco(ctx, 0, d.T + 1.5, 0, d.B - 0.5, 'rgba(0,0,0,0.2)', 0.8);
}

/** Decote de pele no alto do tronco. */
function decote(ctx: C, q: Quadro, d: Molde, rx: number, ry: number) {
	forma(ctx, oval(ctx, 0.3, d.T - 0.1, rx, ry), q.pele, 0.7);
}

/** Decote em V de pele. */
function decoteV(ctx: C, q: Quadro, d: Molde, abre: number, fundo: number) {
	forma(ctx, poligono(ctx, [[-abre, d.T - 0.2], [abre + 0.6, d.T - 0.2], [0.3, d.T + fundo]]), q.pele, 0.7);
}

/** Cinto de couro com fivela dourada (como o do terno original). */
function cintoCouro(ctx: C, d: Molde, cor = '#3a2a1e') {
	forma(ctx, caixa(ctx, -d.W - 1, d.cinto, d.W * 2 + 2, 2, 0.6), cor, 0.6);
	forma(ctx, caixa(ctx, -0.6, d.cinto - 0.2, 2.4, 2.4, 0.5), '#c9a24a', 0.5);
}

/** Barra canelada (suéter, bomber): faixa com risquinhos. */
function canelado(ctx: C, d: Molde, y: number, alt: number, cor: string) {
	forma(ctx, caixa(ctx, -d.W - 1.5, y, d.W * 2 + 3, alt, 0.7), cor, 0.6);
	for (let x = -d.W + 0.6; x < d.W; x += 1.9) traco(ctx, x, y + 0.5, x, y + alt - 0.5, tom(cor, 0.8), 0.45);
}

/** Duas lapelas (triângulos) dos lados da abertura. */
function lapelas(ctx: C, d: Molde, cor: string, abre: number, fundo: number, largura: number, lw = 0.6) {
	const k = d.k;
	forma(ctx, poligono(ctx, [[-abre * k, d.T - 0.1], [-abre * k + 1.4, d.T + fundo], [-(abre + largura) * k, d.T + fundo - 1.6]]), cor, lw);
	forma(ctx, poligono(ctx, [[abre * k + 0.6, d.T - 0.1], [abre * k - 0.8, d.T + fundo], [(abre + largura) * k + 0.6, d.T + fundo - 1.6]]), cor, lw);
}

const ROUPAS: Record<string, DesenhoRoupa> = {
	// Terno com colete à mostra, camisa clara e gravata (ref. 4)
	ternoColete: {
		frente(ctx, _q, d) {
			const k = d.k;
			const colete = tom(d.cor, 0.62);
			forma(ctx, poligono(ctx, [[-4 * k, d.T + 1], [4.6 * k, d.T + 1], [4.6 * k, d.B + 1], [-4 * k, d.B + 1]]), colete, 0.6);
			forma(ctx, poligono(ctx, [[-2.8 * k, d.T - 0.2], [3.4 * k, d.T - 0.2], [0.3, d.T + 6.4]]), '#f1ede4', 0.6);
			forma(ctx, poligono(ctx, [[-2.8 * k, d.T - 0.2], [0.3, d.T + 1.8], [-1.8 * k, d.T + 2.8]]), '#ffffff', 0.5);
			forma(ctx, poligono(ctx, [[3.4 * k, d.T - 0.2], [0.3, d.T + 1.8], [2.4 * k, d.T + 2.8]]), '#ffffff', 0.5);
			forma(ctx, poligono(ctx, [[0.3, d.T + 1.6], [1.3, d.T + 3.2], [0.3, d.T + 7.2], [-0.7, d.T + 3.2]]), '#9a5a32', 0.55);
			for (const y of [d.T + 9, d.T + 11.6, d.T + 14.2]) if (y < d.B - 0.8) ponto(ctx, 0.3, y, 0.5, tom(colete, 1.7));
			lapelas(ctx, d, d.esc, 4, 7, 1.6);
			forma(ctx, caixa(ctx, -d.W + 0.8, -19.6, 2.6 * k, 0.9, 0.3), d.esc, 0);
			forma(ctx, caixa(ctx, d.W - 0.8 - 2.6 * k, -19.6, 2.6 * k, 0.9, 0.3), d.esc, 0);
		}
	},

	// Smoking: lapela de cetim brilhante, camisa branca, gravata-borboleta
	smoking: {
		frente(ctx, _q, d) {
			const k = d.k;
			forma(ctx, poligono(ctx, [[-3.4 * k, d.T - 0.2], [4 * k, d.T - 0.2], [0.3, d.T + 9.4]]), '#f7f5f0', 0.6);
			const cetim = escura(d.cor) ? tom(d.cor, 1.45) : tom(d.cor, 1.3);
			forma(ctx, poligono(ctx, [[-3.4 * k, d.T - 0.1], [-0.4, d.T + 9], [-4.8 * k, d.T + 6.6]]), cetim, 0.6);
			forma(ctx, poligono(ctx, [[4 * k, d.T - 0.1], [1, d.T + 9], [5.4 * k, d.T + 6.6]]), cetim, 0.6);
			traco(ctx, -3.6 * k, d.T + 1.6, -2.2 * k, d.T + 5.6, 'rgba(255,255,255,0.4)', 0.6);
			// Gravata-borboleta
			const y = d.T + 1.5;
			forma(ctx, poligono(ctx, [[0.3, y], [-2, y - 1.1], [-2, y + 1.1]]), '#16181e', 0.5);
			forma(ctx, poligono(ctx, [[0.3, y], [2.6, y - 1.1], [2.6, y + 1.1]]), '#16181e', 0.5);
			ponto(ctx, 0.3, y, 0.6, '#2a2d35');
			for (const yy of [d.T + 4.4, d.T + 6.6]) ponto(ctx, 0.3, yy, 0.38, '#2a2d35');
			ponto(ctx, 0.3, d.T + 10.6, 0.6, d.esc);
			// Lencinho no bolso
			forma(ctx, poligono(ctx, [[-5.8 * k, d.T + 6.2], [-3.9 * k, d.T + 6.2], [-4.9 * k, d.T + 4.9]]), '#f7f5f0', 0.45);
		}
	},

	// Sobretudo aberto, lapela larga, camisa e gravata por dentro (ref. 5)
	sobretudo: {
		frente(ctx, q, d) {
			const k = d.k;
			const fechado = escura(d.cor);
			const dentro = fechado ? '#3a3f4b' : '#efe6d2';
			forma(ctx, poligono(ctx, [[-2.6 * k, d.T - 0.2], [3.2 * k, d.T - 0.2], [2.8 * k, d.B + 1], [-2.2 * k, d.B + 1]]), dentro, 0.6);
			if (!fechado) {
				forma(ctx, poligono(ctx, [[0.3, d.T + 1], [1.3, d.T + 2.8], [0.3, d.B - 3.6], [-0.7, d.T + 2.8]]), '#2a2d35', 0.55);
				forma(ctx, poligono(ctx, [[-2.6 * k, d.T - 0.2], [0.3, d.T + 1.6], [-1.6 * k, d.T + 2.6]]), '#f8f3e6', 0.5);
				forma(ctx, poligono(ctx, [[3.2 * k, d.T - 0.2], [0.3, d.T + 1.6], [2.2 * k, d.T + 2.6]]), '#f8f3e6', 0.5);
			} else decote(ctx, q, d, 1.6, 1.1);
			// Calça e cinto aparecem no vão do casaco aberto
			forma(ctx, caixa(ctx, -2.4 * k, d.B - 2.4, 5.4 * k, 4, 0), q.corBaixo, 0);
			forma(ctx, caixa(ctx, -2.4 * k, d.B - 2.6, 5.4 * k, 1.5, 0.3), '#5a3d26', 0.5);
			ponto(ctx, 0.3, d.B - 1.85, 0.55, '#c9a24a');
			// Lapela larga
			forma(ctx, poligono(ctx, [[-2.6 * k, d.T - 0.2], [-2.2 * k, d.T + 9.4], [-4.4 * k, d.T + 6.8], [-6.2 * k, d.T + 3], [-4.6 * k, d.T - 0.2]]), d.esc, 0.6);
			forma(ctx, poligono(ctx, [[3.2 * k, d.T - 0.2], [2.8 * k, d.T + 9.4], [5 * k, d.T + 6.8], [6.8 * k, d.T + 3], [5.2 * k, d.T - 0.2]]), d.esc, 0.6);
			traco(ctx, -2.2 * k, d.T + 9.4, -2.2 * k, d.B, costura(d.cor), 0.6);
			traco(ctx, 2.8 * k, d.T + 9.4, 2.8 * k, d.B, costura(d.cor), 0.6);
			forma(ctx, caixa(ctx, -d.W + 0.6, -19.4, 2.4 * k, 0.9, 0.3), d.esc, 0);
		}
	},

	// Capa de chuva trespassada, botões em fileira dupla, cinto com fivela (ref. 6)
	trench: {
		frente(ctx, _q, d) {
			const k = d.k;
			forma(ctx, poligono(ctx, [[-1.6 * k, d.T - 0.2], [2.2 * k, d.T - 0.2], [0.3, d.T + 3.6]]), '#f6f4ef', 0.5);
			forma(ctx, poligono(ctx, [[0.3, d.T + 0.6], [1.1, d.T + 1.9], [0.3, d.T + 4.4], [-0.5, d.T + 1.9]]), '#2f4a8a', 0.5);
			// Gola larga e lapelas
			const gola = tom(d.cor, 1.06);
			forma(ctx, poligono(ctx, [[-1.6 * k, d.T - 0.2], [-0.3, d.T + 6], [-3.2 * k, d.T + 5.2], [-5.6 * k, d.T + 1.4], [-4 * k, d.T - 0.2]]), gola, 0.6);
			forma(ctx, poligono(ctx, [[2.2 * k, d.T - 0.2], [0.9, d.T + 6], [3.8 * k, d.T + 5.2], [6.2 * k, d.T + 1.4], [4.6 * k, d.T - 0.2]]), gola, 0.6);
			// Borda do trespasse e os botões em duas fileiras
			traco(ctx, 1.9 * k, d.T + 6, 1.9 * k, d.B, costura(d.cor), 0.6);
			for (const y of [d.T + 8.2, d.T + 11.2]) for (const x of [-2.1 * k, 3.6 * k]) forma(ctx, oval(ctx, x, y, 0.7, 0.7), '#6d6457', 0.4);
			// Cinto com fivela
			const y = d.B - 3.8;
			forma(ctx, caixa(ctx, -d.W - 1, y, d.W * 2 + 2, 1.8, 0.4), tom(d.cor, 0.62), 0.6);
			forma(ctx, caixa(ctx, -0.6, y - 0.4, 2.2, 2.6, 0.4), '#8a8f99', 0.5);
			forma(ctx, caixa(ctx, -0.1, y + 0.3, 1.2, 1.2, 0.2), tom(d.cor, 0.62), 0);
			// Ombreiras
			forma(ctx, caixa(ctx, -d.W + 0.4, d.T + 0.5, 3.2 * k, 1.2, 0.4), d.cor, 0.5);
			forma(ctx, caixa(ctx, d.W - 0.4 - 3.2 * k, d.T + 0.5, 3.2 * k, 1.2, 0.4), d.cor, 0.5);
		},
		costas(ctx, _q, d) {
			traco(ctx, -d.W, d.T + 4.8, d.W, d.T + 4.8, costura(d.cor), 0.6);
			traco(ctx, 0, d.T + 4.8, 0, d.B - 0.5, 'rgba(0,0,0,0.2)', 0.8);
			forma(ctx, caixa(ctx, -d.W - 1, d.B - 3.8, d.W * 2 + 2, 1.8, 0.4), tom(d.cor, 0.62), 0.6);
			forma(ctx, caixa(ctx, -d.W + 0.4, d.T + 0.5, 3.2 * d.k, 1.2, 0.4), d.cor, 0.5);
			forma(ctx, caixa(ctx, d.W - 0.4 - 3.2 * d.k, d.T + 0.5, 3.2 * d.k, 1.2, 0.4), d.cor, 0.5);
		}
	},

	// Camisa de botão com gola e manga dobrada, por dentro da calça; nela, decote em V
	camisaDobrada: {
		frente(ctx, q, d) {
			const k = d.k;
			const gola = d.fem ? tom(d.cor, 1.12) : tom(d.cor, 1.18);
			const vinco = costura(d.cor);
			if (d.fem) {
				decoteV(ctx, q, d, 1.7, 4.6);
				forma(ctx, poligono(ctx, [[-1.9, d.T - 0.2], [-0.3, d.T + 2.4], [-3.2, d.T + 2.6]]), gola, 0.55);
				forma(ctx, poligono(ctx, [[2.5, d.T - 0.2], [0.9, d.T + 2.4], [3.8, d.T + 2.6]]), gola, 0.55);
				traco(ctx, 0.3, d.T + 4.6, 0.3, d.B, vinco, 0.5);
				for (const y of [d.T + 6.4, d.T + 8.6]) ponto(ctx, 0.3, y, 0.38, vinco);
				forma(ctx, caixa(ctx, 1.6, d.T + 4.6, 2.4, 2.2, 0.4), tom(d.cor, 0.94), 0.45);
				return;
			}
			forma(ctx, poligono(ctx, [[-1.3, d.T - 0.2], [1.9, d.T - 0.2], [0.3, d.T + 2.6]]), q.pele, 0.6);
			forma(ctx, poligono(ctx, [[-3.2 * k, d.T - 0.2], [0.1, d.T + 2.6], [-2.4 * k, d.T + 3.6]]), gola, 0.55);
			forma(ctx, poligono(ctx, [[3.8 * k, d.T - 0.2], [0.5, d.T + 2.6], [3 * k, d.T + 3.6]]), gola, 0.55);
			traco(ctx, 0.3, d.T + 2.8, 0.3, d.B - 2, vinco, 0.55);
			for (const y of [d.T + 5.6, d.T + 8.6, d.T + 11.6]) ponto(ctx, 0.3, y, 0.42, vinco);
			forma(ctx, caixa(ctx, -5.6 * k, d.T + 4.8, 2.8 * k, 2.6, 0.4), tom(d.cor, 0.94), 0.5);
			cintoCouro(ctx, d);
		},
		costas(ctx, _q, d) {
			traco(ctx, -d.W, d.T + 4, d.W, d.T + 4, costura(d.cor), 0.55);
			traco(ctx, 0, d.T + 4, 0, d.B - 0.5, 'rgba(0,0,0,0.18)', 0.8);
			if (!d.fem) forma(ctx, caixa(ctx, -d.W - 1, d.cinto, d.W * 2 + 2, 2, 0.6), '#3a2a1e', 0.6);
		}
	},

	// Blazer curto aberto sobre vestido longo (o vestido é a cor de baixo) (ref. 3)
	blazerVestido: {
		frente(ctx, q, d) {
			const k = d.k;
			const vestido = q.corBaixo;
			forma(ctx, poligono(ctx, [[-2.4 * k, d.T - 0.2], [3 * k, d.T - 0.2], [3.4 * k, d.B + 1], [-2.8 * k, d.B + 1]]), vestido, 0.6);
			decoteV(ctx, q, d, 1.4, 3.8);
			ponto(ctx, 0.3, d.T + 4.6, 0.55, DOURADO);
			traco(ctx, -2.5 * k, -20.4, 3.2 * k, -20.4, tom(vestido, 0.8), 0.6);
			forma(ctx, poligono(ctx, [[-2.4 * k, d.T - 0.1], [-1.9 * k, d.T + 8], [-4.4 * k, d.T + 4.8]]), d.esc, 0.6);
			forma(ctx, poligono(ctx, [[3 * k, d.T - 0.1], [2.5 * k, d.T + 8], [5 * k, d.T + 4.8]]), d.esc, 0.6);
			ponto(ctx, 3.3 * k, -19.4, 0.5, d.esc);
		}
	},

	// Gola alta, manga larga até o cotovelo, cinto fino na cintura (ref. 2)
	blusaAmpla: {
		frente(ctx, _q, d) {
			forma(ctx, caixa(ctx, -2.7 * d.k, d.T - 0.8, 6 * d.k, 2.2, 0.9), tom(d.cor, 0.9), 0.6);
			for (const x of [-0.8, 0.3, 1.4]) traco(ctx, x, d.T - 0.1, x, d.T + 0.9, tom(d.cor, 0.78), 0.4);
			traco(ctx, -2.6 * d.k, d.T + 3, -1 * d.k, d.cinto - 1, 'rgba(0,0,0,0.08)', 0.7);
			forma(ctx, caixa(ctx, -d.W - 1, d.cinto - 0.6, d.W * 2 + 2, 1.1, 0.4), tom(d.cor, 0.84), 0.5);
			forma(ctx, caixa(ctx, 1.5, d.cinto - 0.9, 1.6, 1.7, 0.3), '#d9d6cf', 0.45);
		},
		costas(ctx, _q, d) {
			costasLisas(ctx, _q, d);
			forma(ctx, caixa(ctx, -d.W - 1, d.cinto - 0.6, d.W * 2 + 2, 1.1, 0.4), tom(d.cor, 0.84), 0.5);
		}
	},

	// Jaleco branco aberto, bolso com caneta, roupa escura por baixo
	jaleco: {
		frente(ctx, q, d) {
			const k = d.k;
			forma(ctx, poligono(ctx, [[-2.2 * k, d.T - 0.2], [2.8 * k, d.T - 0.2], [2.4 * k, d.B + 1], [-1.8 * k, d.B + 1]]), '#3c4658', 0.6);
			decoteV(ctx, q, d, 1.1, 2.2);
			const lapela = tom(d.cor, 0.93);
			forma(ctx, poligono(ctx, [[-2.2 * k, d.T - 0.1], [-1.6 * k, d.T + 7.4], [-4.4 * k, d.T + 4.6]]), lapela, 0.6);
			forma(ctx, poligono(ctx, [[2.8 * k, d.T - 0.1], [2.2 * k, d.T + 7.4], [5 * k, d.T + 4.6]]), lapela, 0.6);
			traco(ctx, -1.8 * k, d.T + 7.4, -1.6 * k, d.B, tom(d.cor, 0.78), 0.55);
			traco(ctx, 2.4 * k, d.T + 7.4, 2.2 * k, d.B, tom(d.cor, 0.78), 0.55);
			// Bolso do peito com caneta
			const x = -d.W + 0.9;
			traco(ctx, x + 1.1 * k, d.T + 5.2, x + 1.1 * k, d.T + 7.6, '#2f6fd8', 0.9);
			forma(ctx, caixa(ctx, x, d.T + 6.6, 2.8 * k, 2.4, 0.4), lapela, 0.5);
		},
		costas(ctx, _q, d) {
			costasLisas(ctx, _q, d);
			forma(ctx, caixa(ctx, -3 * d.k, d.B - 4.4, 6.6 * d.k, 1.2, 0.4), d.cor, 0.5);
		}
	},

	// Suéter fino de gola alta, liso
	golaAlta: {
		frente(ctx, _q, d) {
			const gola = tom(d.cor, escura(d.cor) ? 1.25 : 0.86);
			forma(ctx, caixa(ctx, -3.2 * d.k, d.T - 0.9, 7 * d.k, 2.6, 1), gola, 0.7);
			for (const x of [-1.6, 0.3, 2.2]) traco(ctx, x * d.k, d.T - 0.2, x * d.k, d.T + 1.3, tom(gola, 0.82), 0.4);
			traco(ctx, -d.W, d.B - 1.6, d.W, d.B - 1.6, tom(gola, 0.9), 0.6);
		},
		costas(ctx, _q, d) {
			forma(ctx, caixa(ctx, -3.2 * d.k, d.T - 0.9, 7 * d.k, 2.4, 1), tom(d.cor, escura(d.cor) ? 1.25 : 0.86), 0.7);
			costasLisas(ctx, _q, d);
		}
	},

	// Suéter de tricô com a gola da camisa aparecendo, barra canelada
	sueter: {
		frente(ctx, _q, d) {
			const k = d.k;
			forma(ctx, oval(ctx, 0.3, d.T - 0.2, 3.6 * k, 2.4), tom(d.cor, 0.82), 0.6);
			forma(ctx, poligono(ctx, [[-1.6 * k, d.T - 0.2], [2.2 * k, d.T - 0.2], [0.3, d.T + 1.6]]), '#f4f1eb', 0.5);
			forma(ctx, poligono(ctx, [[-2.8 * k, d.T - 0.4], [0.2, d.T + 1.8], [-2.2 * k, d.T + 2.8]]), '#f4f1eb', 0.5);
			forma(ctx, poligono(ctx, [[3.4 * k, d.T - 0.4], [0.4, d.T + 1.8], [2.8 * k, d.T + 2.8]]), '#f4f1eb', 0.5);
			// Duas tranças do tricô
			for (const x of [-2.4 * k, 3 * k]) {
				ctx.beginPath();
				for (let y = d.T + 3.6; y < d.B - 2.6; y += 1.6) {
					ctx.moveTo(x - 0.6, y);
					ctx.lineTo(x + 0.6, y + 0.9);
				}
				ctx.strokeStyle = tom(d.cor, 0.8);
				ctx.lineWidth = 0.55;
				ctx.stroke();
			}
			canelado(ctx, d, d.B - 2.3, 2.6, tom(d.cor, 0.86));
		},
		costas(ctx, _q, d) {
			forma(ctx, oval(ctx, 0, d.T - 0.4, 3.6 * d.k, 2), tom(d.cor, 0.82), 0.6);
			canelado(ctx, d, d.B - 2.3, 2.6, tom(d.cor, 0.86));
		}
	},

	// Bomber: ribana no punho e na barra, faixa na cor de destaque, camiseta branca (ref. 14)
	bomber: {
		frente(ctx, q, d) {
			const k = d.k;
			const destaque = extraOu(q, '#d93a3a');
			const ribana = escura(d.cor) ? tom(d.cor, 1.28) : tom(d.cor, 0.8);
			forma(ctx, poligono(ctx, [[-1.7 * k, d.T - 0.2], [2.3 * k, d.T - 0.2], [2.1 * k, d.B - 2], [-1.5 * k, d.B - 2]]), '#f4f4f2', 0.6);
			decote(ctx, q, d, 1.9, 1.3);
			traco(ctx, -1.6 * k, d.T + 1.4, -1.4 * k, d.B - 2.2, '#a9b1bd', 0.5);
			traco(ctx, 2.2 * k, d.T + 1.4, 2, d.B - 2.2, '#a9b1bd', 0.5);
			forma(ctx, caixa(ctx, -4 * k, d.T - 0.4, 2.4 * k, 1.7, 0.6), ribana, 0.5);
			forma(ctx, caixa(ctx, 2.2 * k, d.T - 0.4, 2.4 * k, 1.7, 0.6), ribana, 0.5);
			traco(ctx, -5.4 * k, d.B - 6.4, -4.4 * k, d.B - 4, destaque, 0.9);
			traco(ctx, 5 * k, d.B - 6.4, 4 * k, d.B - 4, destaque, 0.9);
			canelado(ctx, d, d.B - 2.4, 2.6, ribana);
			traco(ctx, -d.W, d.B - 1.1, d.W, d.B - 1.1, destaque, 0.5);
		},
		costas(ctx, q, d) {
			const ribana = escura(d.cor) ? tom(d.cor, 1.28) : tom(d.cor, 0.8);
			forma(ctx, caixa(ctx, -3 * d.k, d.T - 0.4, 6.6 * d.k, 1.7, 0.6), ribana, 0.5);
			costasLisas(ctx, q, d);
			canelado(ctx, d, d.B - 2.4, 2.6, ribana);
			traco(ctx, -d.W, d.B - 1.1, d.W, d.B - 1.1, extraOu(q, '#d93a3a'), 0.5);
		}
	},

	// Jaqueta de couro aberta, gola larga, zíper, camiseta clara, brilho no couro
	jaquetaCouro: {
		frente(ctx, q, d) {
			const k = d.k;
			forma(ctx, poligono(ctx, [[-2 * k, d.T - 0.2], [2.6 * k, d.T - 0.2], [2.4 * k, d.B + 1], [-1.8 * k, d.B + 1]]), '#e8e4dc', 0.6);
			decote(ctx, q, d, 2, 1.4);
			const gola = tom(d.cor, escura(d.cor) ? 1.3 : 0.8);
			forma(ctx, poligono(ctx, [[-2 * k, d.T - 0.2], [-1.6 * k, d.T + 6], [-5.4 * k, d.T + 4], [-4.6 * k, d.T - 0.2]]), gola, 0.6);
			forma(ctx, poligono(ctx, [[2.6 * k, d.T - 0.2], [2.2 * k, d.T + 6], [6 * k, d.T + 4], [5.2 * k, d.T - 0.2]]), gola, 0.6);
			traco(ctx, -2.6 * k, d.T + 6.6, -3.6 * k, d.B - 2, '#c9ced6', 0.55);
			traco(ctx, -d.W + 1, d.T + 3.4, -d.W + 1.6, d.T + 7.8, 'rgba(255,255,255,0.3)', 0.9);
			forma(ctx, caixa(ctx, -d.W - 1, d.B - 1.8, d.W * 2 + 2, 1.9, 0.5), gola, 0.5);
			ponto(ctx, -2.8 * k, d.T + 8.6, 0.42, '#c9ced6');
			ponto(ctx, 3.6 * k, d.T + 8.6, 0.42, '#c9ced6');
		},
		costas(ctx, q, d) {
			costasLisas(ctx, q, d);
			traco(ctx, -d.W + 1, d.T + 3.4, -d.W + 1.6, d.T + 9, 'rgba(255,255,255,0.3)', 0.9);
			forma(ctx, caixa(ctx, -d.W - 1, d.B - 1.8, d.W * 2 + 2, 1.9, 0.5), tom(d.cor, escura(d.cor) ? 1.3 : 0.8), 0.5);
		}
	},

	// Jaqueta curta de cotelê com botões duplos, top branco por dentro (ref. 15)
	jaquetaCurta: {
		frente(ctx, q, d) {
			const k = d.k;
			forma(ctx, poligono(ctx, [[-1.8 * k, d.T - 0.2], [2.4 * k, d.T - 0.2], [2.2 * k, d.B + 1], [-1.6 * k, d.B + 1]]), '#f6f4ef', 0.6);
			decoteV(ctx, q, d, 1.2, 2.6);
			const gola = tom(d.cor, 0.86);
			forma(ctx, poligono(ctx, [[-1.8 * k, d.T - 0.2], [-0.8 * k, d.T + 5.4], [-4.4 * k, d.T + 3.6], [-3.8 * k, d.T - 0.2]]), gola, 0.6);
			forma(ctx, poligono(ctx, [[2.4 * k, d.T - 0.2], [1.4 * k, d.T + 5.4], [5 * k, d.T + 3.6], [4.4 * k, d.T - 0.2]]), gola, 0.6);
			for (const y of [d.B - 4.4, d.B - 1.8]) for (const x of [-2.9 * k, 3.5 * k]) ponto(ctx, x, y, 0.55, '#4a3a2a');
			traco(ctx, -1.6 * k, d.T + 5.4, -1.6 * k, d.B, costura(d.cor), 0.5);
			traco(ctx, 2.2 * k, d.T + 5.4, 2.2 * k, d.B, costura(d.cor), 0.5);
		}
	},

	// Regata cavada: ombro e braço de pele
	regata: {
		frente(ctx, q, d) {
			regata(ctx, q, d, d.T + 3.6);
		},
		costas(ctx, q, d) {
			regata(ctx, q, d, d.T + 1.4);
			costasLisas(ctx, q, d);
		}
	},

	// Top esportivo curto, barriga de pele
	top: {
		frente(ctx, q, d) {
			top(ctx, q, d, true);
		},
		costas(ctx, q, d) {
			top(ctx, q, d, false);
		}
	},

	// Macacão inteiro, gola alta com zíper, faixas na cor de destaque (sem logo nem número)
	macacao: {
		frente(ctx, q, d) {
			const k = d.k;
			const faixaCor = extraOu(q, '#ff6f00');
			forma(ctx, poligono(ctx, [[-2.6 * k, d.T + 1.2], [-d.W - 1, d.T + 4.6], [-d.W - 1, d.T + 6.6], [-2.6 * k, d.T + 3.2]]), faixaCor, 0.5);
			forma(ctx, poligono(ctx, [[3.2 * k, d.T + 1.2], [d.W + 1, d.T + 4.6], [d.W + 1, d.T + 6.6], [3.2 * k, d.T + 3.2]]), faixaCor, 0.5);
			forma(ctx, caixa(ctx, -d.W - 0.6, d.T + 6.2, 1.9, d.B - d.T - 5.6, 0), faixaCor, 0.5);
			forma(ctx, caixa(ctx, d.W - 1.3, d.T + 6.2, 1.9, d.B - d.T - 5.6, 0), faixaCor, 0.5);
			forma(ctx, caixa(ctx, -3 * k, d.T - 0.6, 6.6 * k, 2.2, 0.9), dobra(d.cor), 0.6);
			traco(ctx, 0.3, d.T + 1.6, 0.3, d.B - 0.6, costura(d.cor), 0.6);
			forma(ctx, caixa(ctx, -0.2, d.T + 1.6, 1, 1.6, 0.3), '#c9ced6', 0.4);
		},
		costas(ctx, q, d) {
			const faixaCor = extraOu(q, '#ff6f00');
			forma(ctx, caixa(ctx, -d.W - 0.6, d.T + 6.2, 1.9, d.B - d.T - 5.6, 0), faixaCor, 0.5);
			forma(ctx, caixa(ctx, d.W - 1.3, d.T + 6.2, 1.9, d.B - d.T - 5.6, 0), faixaCor, 0.5);
			forma(ctx, caixa(ctx, -3 * d.k, d.T - 0.6, 6.6 * d.k, 2, 0.9), dobra(d.cor), 0.6);
			costasLisas(ctx, q, d);
		}
	},

	// Peito nu: peitoral e abdômen em traços leves (no bicho, peito de pelo com a barriga clara)
	semCamisa: {
		frente(ctx, q, d) {
			if (q.bicho) {
				peitoDePelo(ctx, q, d, true);
				return;
			}
			ctx.fillStyle = q.pele;
			ctx.fillRect(-20, -45, 40, 40);
			const k = d.k;
			const risco = tom(q.pele, 0.7);
			const T = d.T;
			ctx.beginPath();
			ctx.moveTo(-d.W + 1.6, T + 6);
			ctx.quadraticCurveTo(-2.6 * k, T + 8.8, -0.2, T + 6.6);
			ctx.moveTo(0.8, T + 6.6);
			ctx.quadraticCurveTo(3.2 * k, T + 8.8, d.W - 1, T + 6);
			ctx.moveTo(-3.6 * k, T + 1.6);
			ctx.lineTo(-1, T + 2.4);
			ctx.moveTo(1.6, T + 2.4);
			ctx.lineTo(4.2 * k, T + 1.6);
			ctx.strokeStyle = risco;
			ctx.lineWidth = 0.7;
			ctx.lineCap = 'round';
			ctx.stroke();
			traco(ctx, 0.3, T + 3.6, 0.3, d.B - 3.2, risco, 0.55);
			for (const y of [T + 10.4, T + 13.2]) {
				if (y > d.B - 2) continue;
				traco(ctx, -1.9 * k, y, -0.5, y + 0.3, risco, 0.55);
				traco(ctx, 1.1, y + 0.3, 2.5 * k, y, risco, 0.55);
			}
		},
		costas(ctx, q, d) {
			if (q.bicho) {
				peitoDePelo(ctx, q, d, false);
				return;
			}
			ctx.fillStyle = q.pele;
			ctx.fillRect(-20, -45, 40, 40);
			const risco = tom(q.pele, 0.72);
			traco(ctx, 0, d.T + 3, 0, d.B - 2, risco, 0.6);
			ctx.beginPath();
			ctx.arc(-3 * d.k, d.T + 6.6, 2.4 * d.k, Math.PI * 0.15, Math.PI * 0.85);
			ctx.moveTo(3 * d.k + 2.4 * d.k * Math.cos(Math.PI * 0.15), d.T + 6.6 + 2.4 * d.k * Math.sin(Math.PI * 0.15));
			ctx.arc(3 * d.k, d.T + 6.6, 2.4 * d.k, Math.PI * 0.15, Math.PI * 0.85);
			ctx.strokeStyle = risco;
			ctx.lineWidth = 0.6;
			ctx.stroke();
		}
	},

	// Collant de herói: emblema ORIGINAL (raio num losango) e cinto na cor de destaque
	uniformeHeroi: {
		frente(ctx, q, d) {
			const k = d.k;
			const destaque = extraOu(q, '#f2c230');
			const cy = d.T + (d.fem ? 5.6 : 6.4);
			const r = d.fem ? 2.7 : 3.3 * Math.min(k, 1.15);
			forma(ctx, poligono(ctx, [[0.3, cy - r], [0.3 + r * 1.05, cy], [0.3, cy + r], [0.3 - r * 1.05, cy]]), destaque, 0.7);
			const s = r / 3.3;
			forma(
				ctx,
				poligono(ctx, [
					[0.3 + 0.8 * s, cy - 2.2 * s],
					[0.3 - 1.2 * s, cy + 0.3 * s],
					[0.3 + 0.1 * s, cy + 0.3 * s],
					[0.3 - 0.6 * s, cy + 2.3 * s],
					[0.3 + 1.5 * s, cy - 0.5 * s],
					[0.3 + 0.2 * s, cy - 0.5 * s]
				]),
				d.cor,
				0.45
			);
			heroiCinto(ctx, q, d);
		},
		costas(ctx, q, d) {
			costasLisas(ctx, q, d);
			heroiCinto(ctx, q, d);
		}
	},

	// Quimono transpassado (a faixa da cintura sai no acabamento)
	quimono: {
		frente(ctx, q, d) {
			const k = d.k;
			decoteV(ctx, q, d, 1.5 * k, 4.6);
			const gola = escura(d.cor) ? tom(d.cor, 1.3) : tom(d.cor, 0.8);
			faixa(ctx, [[-1.8 * k, d.T - 0.4], [2.8 * k, d.B - 3]], gola, 1.5);
			faixa(ctx, [[2.6 * k, d.T - 0.4], [0.5, d.T + 4.4]], gola, 1.5);
		}
	},

	// Túnica longa de mago (a barra sai em parteDeBaixo, o cordão no acabamento)
	tunica: {
		frente(ctx, q, d) {
			const k = d.k;
			decoteV(ctx, q, d, 1.7 * k, 4.2);
			traco(ctx, -1.7 * k, d.T + 0.2, 0.2, d.T + 4.3, DOURADO, 0.7);
			traco(ctx, 2.3 * k, d.T + 0.2, 0.4, d.T + 4.3, DOURADO, 0.7);
			const luz = '#f4d35e';
			estrela(ctx, -3.8 * k, d.T + 7.4, 1, luz);
			estrela(ctx, 3.8 * k, d.T + 10.4, 0.9, luz);
		},
		costas(ctx, q, d) {
			costasLisas(ctx, q, d);
			estrela(ctx, -3 * d.k, d.T + 6.6, 0.9, '#f4d35e');
			estrela(ctx, 3.4 * d.k, d.T + 10.4, 1, '#f4d35e');
		}
	},

	// Corpo de placas metálicas, painel no peito com 3 luzinhas
	robo: {
		frente(ctx, q, d) {
			const k = d.k;
			const luz = extraOu(q, '#22c7e0');
			forma(ctx, caixa(ctx, -3 * k, d.T + 2.6, 6.6 * k, 5, 1), tom(d.cor, 0.7), 0.6);
			const pisca = Math.sin(q.t * 4) > 0.2 ? 1 : 0.35;
			const xs = [-1.7 * k, 0.3, 2.3 * k];
			for (let i = 0; i < 3; i++) {
				ctx.globalAlpha = i === 1 ? pisca : 1;
				ponto(ctx, xs[i], d.T + 5.1, 0.8, i === 2 ? '#ffd35a' : luz);
			}
			ctx.globalAlpha = 1;
			for (const y of [d.T + 9.2, d.T + 10.4]) traco(ctx, -1.6 * k, y, 2.2 * k, y, tom(d.cor, 0.66), 0.55);
			traco(ctx, -d.W, d.B - 3.4, d.W, d.B - 3.4, tom(d.cor, 0.7), 0.6);
			for (const [x, y] of [[-d.W + 1.4, d.T + 1.6], [d.W - 1.2, d.T + 1.6], [-d.W + 1.4, d.B - 1.6], [d.W - 1.2, d.B - 1.6]] as const)
				ponto(ctx, x, y, 0.45, tom(d.cor, 0.58));
			traco(ctx, -d.W + 1.1, d.T + 3, -d.W + 1.1, d.B - 4.6, 'rgba(255,255,255,0.4)', 0.9);
		},
		costas(ctx, _q, d) {
			forma(ctx, caixa(ctx, -2.6 * d.k, d.T + 3, 5.6 * d.k, 6, 0.8), tom(d.cor, 0.78), 0.6);
			for (const y of [d.T + 4.6, d.T + 6, d.T + 7.4]) traco(ctx, -1.6 * d.k, y, 1.6 * d.k, y, tom(d.cor, 0.6), 0.5);
			traco(ctx, -d.W, d.B - 3.4, d.W, d.B - 3.4, tom(d.cor, 0.7), 0.6);
		}
	},

	// ------------------------------------------- segunda rodada (refs. 18 a 55)

	// Vestido envelope sem manga, justo em cima; a saia transpassada sai em parteDeBaixo (ref. 37)
	vestidoEnvelope: {
		frente(ctx, q, d) {
			cavas(ctx, q, d, d.T + 1.5);
			// Franzido do corpete puxando para a cintura
			const y = d.fem ? d.cinto : d.B - 3;
			traco(ctx, -d.W + 1.2, y - 3.2, 0.8, y - 0.2, d.esc, 0.55);
			traco(ctx, -d.W + 1.6, y - 1.4, 2.4 * d.k, y + 0.4, d.esc, 0.55);
			traco(ctx, 1.2 * d.k, y - 2.6, d.W - 0.8, y - 0.6, d.esc, 0.5);
		},
		costas(ctx, q, d) {
			cavas(ctx, q, d, d.T + 0.9);
			traco(ctx, 0.3, d.T + 1.4, 0.3, d.B - 0.5, costura(d.cor), 0.55);
		}
	},

	// Blusa transpassada curta, gola de camisa e decote em V; o laço sai no acabamento (ref. 38)
	blusaEnvelope: {
		frente(ctx, q, d) {
			const k = d.k;
			decoteV(ctx, q, d, 1.6 * k, 5.4);
			const gola = tom(d.cor, 1.16);
			forma(ctx, poligono(ctx, [[-1.6 * k, d.T - 0.3], [-3.9 * k, d.T + 2.2], [-1.2 * k, d.T + 2.6]]), gola, 0.55);
			forma(ctx, poligono(ctx, [[2.2 * k, d.T - 0.3], [4.5 * k, d.T + 2.2], [1.8 * k, d.T + 2.6]]), gola, 0.55);
			// A aba de cima cruza em diagonal, do decote até a cintura do outro lado
			riscar(ctx, () => {
				ctx.moveTo(0.3, d.T + 5.4);
				ctx.quadraticCurveTo(2.2 * k, d.cinto - 2.4, d.W + 0.6, d.cinto + 0.2);
			}, CONTORNO, 0.6);
			traco(ctx, -d.W + 1.2, d.T + 6, -0.6, d.cinto - 0.4, d.esc, 0.5);
			traco(ctx, 1.4 * k, d.T + 8, d.W - 0.4, d.cinto - 1.6, d.esc, 0.45);
		}
	},

	// Trench curto até a cintura, aberto, com gola alta canelada marrom por dentro (ref. 39)
	trenchCurto: {
		frente(ctx, q, d) {
			const k = d.k;
			const dentro = '#5a3a2a';
			forma(ctx, poligono(ctx, [[-2.3 * k, d.T - 0.2], [2.9 * k, d.T - 0.2], [2.7 * k, d.B + 1], [-2.1 * k, d.B + 1]]), dentro, 0.6);
			for (const x of [-1 * k, 0.3, 1.6 * k]) traco(ctx, x, d.T + 2.2, x, d.B, tom(dentro, 0.78), 0.4);
			forma(ctx, caixa(ctx, -2 * k, d.T - 1.1, 4 * k + 0.6, 2.3, 0.9), tom(dentro, 1.12), 0.6);
			// Corrente fina com pingente
			ctx.beginPath();
			ctx.arc(0.3, d.T + 1.2, 1.8 * k, 0.15 * Math.PI, 0.85 * Math.PI);
			ctx.strokeStyle = '#d9a73a';
			ctx.lineWidth = 0.45;
			ctx.stroke();
			ponto(ctx, 0.3, d.T + 1.6 + 1.8 * k, 0.55, DOURADO);
			// Gola larga e lapelas
			const gola = tom(d.cor, 1.06);
			forma(ctx, poligono(ctx, [[-2.3 * k, d.T - 0.2], [-2.1 * k, d.T + 6.2], [-3.9 * k, d.T + 5], [-5.8 * k, d.T + 1.4], [-4.3 * k, d.T - 0.2]]), gola, 0.6);
			forma(ctx, poligono(ctx, [[2.9 * k, d.T - 0.2], [2.7 * k, d.T + 6.2], [4.5 * k, d.T + 5], [6.4 * k, d.T + 1.4], [4.9 * k, d.T - 0.2]]), gola, 0.6);
			traco(ctx, -2.1 * k, d.T + 6.2, -2.1 * k, d.B, costura(d.cor), 0.5);
			traco(ctx, 2.7 * k, d.T + 6.2, 2.7 * k, d.B, costura(d.cor), 0.5);
			forma(ctx, oval(ctx, 3.8 * k, d.B - 2.6, 0.6, 0.6), '#4a3a2a', 0.4);
			// Ombreiras
			forma(ctx, caixa(ctx, -d.W + 0.4, d.T + 0.5, 2.8 * k, 1.1, 0.4), d.cor, 0.5);
			forma(ctx, caixa(ctx, d.W - 0.4 - 2.8 * k, d.T + 0.5, 2.8 * k, 1.1, 0.4), d.cor, 0.5);
		},
		costas(ctx, _q, d) {
			traco(ctx, -d.W, d.T + 4.4, d.W, d.T + 4.4, costura(d.cor), 0.55);
			traco(ctx, 0, d.T + 4.4, 0, d.B - 0.5, 'rgba(0,0,0,0.2)', 0.8);
			forma(ctx, caixa(ctx, -d.W + 0.4, d.T + 0.5, 2.8 * d.k, 1.1, 0.4), d.cor, 0.5);
			forma(ctx, caixa(ctx, d.W - 0.4 - 2.8 * d.k, d.T + 0.5, 2.8 * d.k, 1.1, 0.4), d.cor, 0.5);
		}
	},

	// Casaco de lã comprido, trespassado, botões grandes, gola redonda (ref. 49); a barra sai em parteDeBaixo
	casacoLongo: {
		frente(ctx, q, d) {
			const k = d.k;
			decote(ctx, q, d, 2.3 * k, 1.6);
			riscar(ctx, () => {
				ctx.moveTo(-2.7 * k, d.T + 0.2);
				ctx.quadraticCurveTo(0.3, d.T + 3.6, 3.3 * k, d.T + 0.2);
			}, d.esc, 0.7);
			// Borda do trespasse e as duas fileiras de botões
			riscar(ctx, () => {
				ctx.moveTo(2.4 * k, d.T + 1.6);
				ctx.quadraticCurveTo(2.5 * k, d.T + 3.6, 2.1 * k, d.T + 5);
				ctx.lineTo(2.1 * k, d.B + 1);
			}, costura(d.cor), 0.6);
			for (const y of [d.T + 4.6, d.T + 8.6, d.T + 12.6]) if (y < d.B - 1.2) for (const x of [-1.5 * k, 3.7 * k]) botao(ctx, x, y, 0.8);
		},
		costas(ctx, q, d) {
			costasLisas(ctx, q, d);
			traco(ctx, -2.6 * d.k, d.cinto, 2.6 * d.k, d.cinto, d.esc, 0.6);
		}
	},

	// Camisa de botão de manga curta, por dentro da calça com cinto (refs. 22, 23 e 27):
	// o peito é o da camisa de manga dobrada; muda a manga (mangaDe)
	camisaCurta: {
		frente: (ctx, q, d) => ROUPAS.camisaDobrada.frente(ctx, q, d),
		costas: (ctx, q, d) => ROUPAS.camisaDobrada.costas?.(ctx, q, d)
	},

	// Camisa xadrez aberta e solta, camiseta clara em V por dentro (ref. 36)
	xadrezAberta: {
		frente(ctx, q, d) {
			const k = d.k;
			xadrezEm(ctx, d.cor, -d.W - 1, d.T - 1, d.W + 1, d.B + 1);
			forma(ctx, poligono(ctx, [[-2.3 * k, d.T - 0.2], [2.9 * k, d.T - 0.2], [3.5 * k, d.B + 1], [-2.9 * k, d.B + 1]]), '#efe9df', 0.6);
			forma(ctx, poligono(ctx, [[-1.3 * k, d.T - 0.2], [1.9 * k, d.T - 0.2], [0.3, d.T + 2.6]]), q.pele, 0.6);
			// Gola aberta caindo para os lados
			const gola = tom(d.cor, 0.86);
			forma(ctx, poligono(ctx, [[-2.3 * k, d.T - 0.3], [-4.6 * k, d.T + 2.4], [-2.6 * k, d.T + 3.6]]), gola, 0.55);
			forma(ctx, poligono(ctx, [[2.9 * k, d.T - 0.3], [5.2 * k, d.T + 2.4], [3.2 * k, d.T + 3.6]]), gola, 0.55);
			for (const f of [0.35, 0.6, 0.85]) ponto(ctx, -2.3 * k - 0.9 - f * 0.6 * k, d.T + (d.B - d.T) * f, 0.42, '#f4f1eb');
			// Bolso no peito (só a costura da aba)
			traco(ctx, -d.W + 1, d.T + 5.6, -d.W + 1 + 2.4 * k, d.T + 5.6, tom(d.cor, 0.6), 0.6);
		},
		costas(ctx, q, d) {
			xadrezEm(ctx, d.cor, -d.W - 1, d.T - 1, d.W + 1, d.B + 1);
			forma(ctx, caixa(ctx, -3 * d.k, d.T - 0.6, 6.6 * d.k, 1.8, 0.7), tom(d.cor, 0.86), 0.55);
			costasLisas(ctx, q, d);
		}
	},

	// Camisa listrada de manga curta, aberta sobre camiseta branca (ref. 41)
	camisaListrada: {
		frente(ctx, q, d) {
			const k = d.k;
			listrasVerticais(ctx, q, d);
			forma(ctx, poligono(ctx, [[-2.1 * k, d.T - 0.2], [2.7 * k, d.T - 0.2], [2.9 * k, d.B + 1], [-2.3 * k, d.B + 1]]), '#f4f4f2', 0.6);
			decote(ctx, q, d, 1.8 * k, 1.2);
			forma(ctx, poligono(ctx, [[-2.1 * k, d.T - 0.3], [-4.2 * k, d.T + 2.6], [-2.3 * k, d.T + 3.4]]), d.cor, 0.55);
			forma(ctx, poligono(ctx, [[2.7 * k, d.T - 0.3], [4.8 * k, d.T + 2.6], [2.9 * k, d.T + 3.4]]), d.cor, 0.55);
			for (const f of [0.35, 0.6, 0.85]) ponto(ctx, -2.1 * k - 0.8 - f * 0.2 * k, d.T + (d.B - d.T) * f, 0.42, '#ffffff');
		},
		costas(ctx, q, d) {
			listrasVerticais(ctx, q, d);
			forma(ctx, caixa(ctx, -3 * d.k, d.T - 0.6, 6.6 * d.k, 1.8, 0.7), d.cor, 0.55);
			costasLisas(ctx, q, d);
		}
	},

	// Jaqueta curta com capuz caído atrás, bolsos de lapela e ribana; camisa xadrez na cor de destaque por dentro (ref. 20)
	jaquetaCapuz: {
		frente(ctx, q, d) {
			const k = d.k;
			const camisa = extraOu(q, '#3b6ea8');
			const x0 = -2 * k;
			const x1 = 2.6 * k;
			const vao = poligono(ctx, [[x0, d.T - 0.2], [x1, d.T - 0.2], [x1 - 0.2, d.B + 1], [x0 + 0.2, d.B + 1]]);
			forma(ctx, vao, camisa, 0.6);
			dentroDe(ctx, vao, () => {
				ctx.globalAlpha = 0.75;
				for (let x = x0 + 0.9; x < x1; x += 1.7) traco(ctx, x, d.T, x, d.B + 1, tom(camisa, 1.55), 0.75);
				for (let y = d.T + 2.4; y < d.B + 1; y += 1.7) traco(ctx, x0, y, x1, y, tom(camisa, 1.55), 0.75);
				ctx.globalAlpha = 1;
			});
			forma(ctx, poligono(ctx, [[-1.2 * k, d.T - 0.2], [1.8 * k, d.T - 0.2], [0.3, d.T + 2]]), q.pele, 0.55);
			forma(ctx, poligono(ctx, [[-1.6 * k, d.T - 0.3], [0.1, d.T + 2], [-1.6 * k, d.T + 2.6]]), tom(camisa, 1.2), 0.5);
			forma(ctx, poligono(ctx, [[2.2 * k, d.T - 0.3], [0.5, d.T + 2], [2.2 * k, d.T + 2.6]]), tom(camisa, 1.2), 0.5);
			const bw = 2.6 * k;
			bolsoDeLapela(ctx, -d.W + 0.9, d.T + 4.6, bw, d.cor);
			bolsoDeLapela(ctx, d.W - 0.7 - bw, d.T + 4.6, bw, d.cor);
			caneladoAberto(ctx, d, d.B - 2.4, 2.6, ribanaDe(d.cor), x0, x1);
		},
		costas(ctx, _q, d) {
			capuzNasCostas(ctx, d, tom(d.cor, 0.94));
			canelado(ctx, d, d.B - 2.4, 2.6, ribanaDe(d.cor));
		}
	},

	// Jaqueta de sarja aberta, bolsos de lapela, suéter claro com zíper; a gola de pelúcia sai no acabamento (ref. 28)
	jaquetaPelucia: {
		frente(ctx, _q, d) {
			const k = d.k;
			const sueter = '#e6dccb';
			const x0 = -2.2 * k;
			const x1 = 2.8 * k;
			forma(ctx, poligono(ctx, [[x0, d.T - 0.2], [x1, d.T - 0.2], [x1 - 0.2, d.B + 1], [x0 + 0.2, d.B + 1]]), sueter, 0.6);
			traco(ctx, 0.3, d.T + 0.4, 0.3, d.T + 4.6, '#9a8f7e', 0.6);
			forma(ctx, caixa(ctx, -0.1, d.T + 4.4, 0.8, 1.4, 0.3), '#c9ced6', 0.4);
			forma(ctx, caixa(ctx, x0 + 0.2, d.B - 2.6, x1 - x0 - 0.4, 2, 0.4), tom(sueter, 0.9), 0.5);
			const bw = 2.6 * k;
			bolsoDeLapela(ctx, -d.W + 0.9, d.T + 5, bw, d.cor);
			bolsoDeLapela(ctx, d.W - 0.7 - bw, d.T + 5, bw, d.cor);
			for (const y of [d.T + 9.4, d.T + 12.4]) {
				ponto(ctx, x0 - 0.8, y, 0.45, '#3a2a1e');
				ponto(ctx, x1 + 0.8, y, 0.45, '#3a2a1e');
			}
			barraAberta(ctx, d, d.B - 1.9, 1.9, tom(d.cor, 0.86), x0, x1);
		},
		costas(ctx, q, d) {
			traco(ctx, -d.W, d.T + 4.6, d.W, d.T + 4.6, costura(d.cor), 0.55);
			costasLisas(ctx, q, d);
			barraAberta(ctx, d, d.B - 1.9, 1.9, tom(d.cor, 0.86), 0, 0);
		}
	},

	// Jaqueta acolchoada em gomos, aberta sobre suéter branco; a gola alta e o capuz saem no acabamento (ref. 42)
	puffer: {
		frente(ctx, q, d) {
			const k = d.k;
			const x0 = -2 * k;
			const x1 = 2.6 * k;
			forma(ctx, poligono(ctx, [[x0, d.T - 0.2], [x1, d.T - 0.2], [x1, d.B + 1], [x0, d.B + 1]]), '#f4f4f2', 0.6);
			decote(ctx, q, d, 1.7 * k, 1.1);
			gomos(ctx, d, x0, x1);
			traco(ctx, x0 - 0.4, d.T + 1, x0 - 0.4, d.B, '#c9ced6', 0.45);
			traco(ctx, x1 + 0.4, d.T + 1, x1 + 0.4, d.B, '#c9ced6', 0.45);
		},
		costas(ctx, _q, d) {
			gomos(ctx, d, 0, 0);
			capuzNasCostas(ctx, d, tom(d.cor, 0.94));
		}
	},

	// Casacão aberto sobre camisa clara, vivo de pelúcia na abertura (ref. 25, sem marca nem escrita);
	// a gola larga sai no acabamento, a barra (com pelúcia) em parteDeBaixo
	casacoPele: {
		frente(ctx, q, d) {
			const k = d.k;
			const x0 = -2.4 * k;
			const x1 = 3 * k;
			forma(ctx, poligono(ctx, [[x0, d.T - 0.2], [x1, d.T - 0.2], [x1 - 0.2, d.B + 1], [x0 + 0.2, d.B + 1]]), '#efe6d2', 0.6);
			decoteV(ctx, q, d, 1.1 * k, 2.6);
			// Calça e cinto aparecem no vão do casaco aberto
			forma(ctx, caixa(ctx, x0 + 0.2, d.B - 2.4, x1 - x0 - 0.4, 4, 0), q.corBaixo, 0);
			forma(ctx, caixa(ctx, x0 + 0.2, d.B - 2.6, x1 - x0 - 0.4, 1.5, 0.3), '#6b4a2e', 0.5);
			forma(ctx, oval(ctx, 0.3, d.B - 1.85, 0.8, 0.8), '#c9ced6', 0.4);
			forma(ctx, caixa(ctx, x0 - 1.4, d.T + 5, 1.6, d.B - d.T - 4, 0.6), PELUCIA, 0.5);
			forma(ctx, caixa(ctx, x1 - 0.2, d.T + 5, 1.6, d.B - d.T - 4, 0.6), PELUCIA, 0.5);
		}
	},

	// Cardigã de tricô abotoado em V, punho e barra canelados, bolsinhos, gola da camisa clara (ref. 50)
	cardiga: {
		frente(ctx, q, d) {
			const k = d.k;
			const fundo = d.T + (d.fem ? 6.4 : 7.6);
			const camisa = '#f6f3ec';
			forma(ctx, poligono(ctx, [[-2.6 * k, d.T - 0.2], [3.2 * k, d.T - 0.2], [0.3, fundo]]), camisa, 0.6);
			forma(ctx, poligono(ctx, [[-1.1 * k, d.T - 0.2], [1.7 * k, d.T - 0.2], [0.3, d.T + 1.8]]), q.pele, 0.5);
			forma(ctx, poligono(ctx, [[-2.6 * k, d.T - 0.4], [0.1, d.T + 1.8], [-2.1 * k, d.T + 2.8]]), camisa, 0.5);
			forma(ctx, poligono(ctx, [[3.2 * k, d.T - 0.4], [0.5, d.T + 1.8], [2.7 * k, d.T + 2.8]]), camisa, 0.5);
			// Borda canelada do V, abotoadura e botões
			const borda = tom(d.cor, 0.82);
			riscar(ctx, () => {
				ctx.moveTo(-3.3 * k, d.T - 0.2);
				ctx.lineTo(0.3, fundo + 0.9);
				ctx.lineTo(3.9 * k, d.T - 0.2);
			}, borda, 1.1);
			traco(ctx, 0.3, fundo + 0.9, 0.3, d.B, borda, 1.1);
			for (let y = fundo + 2.2; y < d.B - 2.8; y += 2.6) ponto(ctx, 0.3, y, 0.5, tom(d.cor, 0.55));
			forma(ctx, caixa(ctx, -d.W + 1.2, d.B - 6, 2.4 * k, 2.1, 0.4), tom(d.cor, 0.93), 0.45);
			forma(ctx, caixa(ctx, d.W - 1 - 2.4 * k, d.B - 6, 2.4 * k, 2.1, 0.4), tom(d.cor, 0.93), 0.45);
			canelado(ctx, d, d.B - 2.3, 2.6, tom(d.cor, 0.88));
		},
		costas(ctx, _q, d) {
			forma(ctx, caixa(ctx, -3 * d.k, d.T - 0.6, 6.6 * d.k, 1.8, 0.7), tom(d.cor, 0.88), 0.55);
			canelado(ctx, d, d.B - 2.3, 2.6, tom(d.cor, 0.88));
		}
	},

	// Colete de tricô em V sem manga sobre camisa clara de manga longa (ref. 52)
	colete: {
		frente(ctx, q, d) {
			const k = d.k;
			ctx.fillStyle = CAMISA_CLARA;
			ctx.fillRect(-20, -45, 40, 40);
			const fundo = d.T + (d.fem ? 6.6 : 8);
			forma(ctx, poligono(ctx, [[-1.3 * k, d.T - 0.2], [1.9 * k, d.T - 0.2], [0.3, d.T + 1.6]]), q.pele, 0.5);
			forma(ctx, poligono(ctx, [[-2.4 * k, d.T - 0.4], [0.1, d.T + 1.7], [-1.9 * k, d.T + 2.8]]), '#f8f5ee', 0.5);
			forma(ctx, poligono(ctx, [[3 * k, d.T - 0.4], [0.5, d.T + 1.7], [2.5 * k, d.T + 2.8]]), '#f8f5ee', 0.5);
			traco(ctx, 0.3, d.T + 2, 0.3, fundo, tom(CAMISA_CLARA, 0.8), 0.45);
			const W = d.W + 1.4;
			forma(ctx, () => {
				ctx.moveTo(-3.5 * k, d.T - 0.4);
				ctx.lineTo(-2.4 * k, d.T - 0.4);
				ctx.lineTo(0.3, fundo);
				ctx.lineTo(3 * k, d.T - 0.4);
				ctx.lineTo(4.1 * k, d.T - 0.4);
				ctx.quadraticCurveTo(4.3 * k, d.T + 5.6, W, d.T + 8);
				ctx.lineTo(W, d.B + 2);
				ctx.lineTo(-W, d.B + 2);
				ctx.lineTo(-W, d.T + 8);
				ctx.quadraticCurveTo(-3.7 * k, d.T + 5.6, -3.5 * k, d.T - 0.4);
				ctx.closePath();
			}, d.cor, 0.7);
			riscar(ctx, () => {
				ctx.moveTo(-2.9 * k, d.T);
				ctx.lineTo(0.3, fundo + 1);
				ctx.lineTo(3.5 * k, d.T);
			}, tom(d.cor, 0.84), 0.9);
			canelado(ctx, d, d.B - 2.3, 2.6, tom(d.cor, 0.86));
		},
		costas(ctx, _q, d) {
			const k = d.k;
			ctx.fillStyle = CAMISA_CLARA;
			ctx.fillRect(-20, -45, 40, 40);
			forma(ctx, caixa(ctx, -3 * k, d.T - 0.8, 6.6 * k, 1.8, 0.7), '#f8f5ee', 0.5);
			const W = d.W + 1.4;
			forma(ctx, () => {
				ctx.moveTo(-3.9 * k, d.T + 0.4);
				ctx.quadraticCurveTo(0, d.T + 1.4, 3.9 * k, d.T + 0.4);
				ctx.quadraticCurveTo(4.2 * k, d.T + 5.6, W, d.T + 8);
				ctx.lineTo(W, d.B + 2);
				ctx.lineTo(-W, d.B + 2);
				ctx.lineTo(-W, d.T + 8);
				ctx.quadraticCurveTo(-4.2 * k, d.T + 5.6, -3.9 * k, d.T + 0.4);
				ctx.closePath();
			}, d.cor, 0.7);
			canelado(ctx, d, d.B - 2.3, 2.6, tom(d.cor, 0.86));
		}
	},

	// Tricô grosso e largo, gola redonda canelada, tranças em V (ref. 53)
	trico: {
		frente(ctx, q, d) {
			const k = d.k;
			const gola = tom(d.cor, 0.88);
			forma(ctx, oval(ctx, 0.3, d.T - 0.1, 3.5 * k, 2.5), gola, 0.6);
			decote(ctx, q, d, 2.3 * k, 1.5);
			tranca(ctx, d, [-3.5 * k, 0.3, 4.1 * k]);
			canelado(ctx, d, d.B - 2.2, 2.4, gola);
		},
		costas(ctx, _q, d) {
			const gola = tom(d.cor, 0.88);
			forma(ctx, oval(ctx, 0, d.T - 0.4, 3.5 * d.k, 2), gola, 0.6);
			tranca(ctx, d, [-3.2 * d.k, 0, 3.2 * d.k]);
			canelado(ctx, d, d.B - 2.2, 2.4, gola);
		}
	},

	// Camisa de time com listras largas, gola e punho na cor de destaque; sem escudo, número nem marca (ref. 51)
	camisaFutebol: {
		frente(ctx, q, d) {
			listrasDeTime(ctx, d);
			forma(ctx, oval(ctx, 0.3, d.T - 0.1, 3 * d.k, 2.1), extraOu(q, '#1c2534'), 0.6);
			decote(ctx, q, d, 2.1 * d.k, 1.3);
		},
		costas(ctx, q, d) {
			listrasDeTime(ctx, d);
			forma(ctx, caixa(ctx, -3 * d.k, d.T - 0.7, 6.6 * d.k, 1.7, 0.7), extraOu(q, '#1c2534'), 0.55);
		}
	},

	// Farda camuflada: gola, dois bolsos no peito e cinto tático; sem bandeira, nome nem insígnia (ref. 47)
	camuflado: {
		frente(ctx, _q, d) {
			const k = d.k;
			camuflar(ctx, d.cor, -d.W - 1, d.T - 1, d.W * 2 + 2, d.B - d.T + 2);
			forma(ctx, poligono(ctx, [[-1.2 * k, d.T - 0.2], [1.8 * k, d.T - 0.2], [0.3, d.T + 2.4]]), tom(d.cor, 0.62), 0.5);
			const gola = tom(d.cor, 0.9);
			forma(ctx, poligono(ctx, [[-1.6 * k, d.T - 0.4], [0, d.T + 2.6], [-3.6 * k, d.T + 2.2]]), gola, 0.55);
			forma(ctx, poligono(ctx, [[2.2 * k, d.T - 0.4], [0.6, d.T + 2.6], [4.2 * k, d.T + 2.2]]), gola, 0.55);
			traco(ctx, 0.3, d.T + 2.6, 0.3, d.B, costura(d.cor), 0.55);
			const bw = 2.7 * k;
			bolsoDeLapela(ctx, -d.W + 0.8, d.T + 4.2, bw, d.cor);
			bolsoDeLapela(ctx, d.W - 0.6 - bw, d.T + 4.2, bw, d.cor);
			cintoTatico(ctx, d);
		},
		costas(ctx, q, d) {
			camuflar(ctx, d.cor, -d.W - 1, d.T - 1, d.W * 2 + 2, d.B - d.T + 2);
			costasLisas(ctx, q, d);
			cintoTatico(ctx, d);
		}
	},

	// Haori aberto sobre quimono escuro (ref. 32, sem símbolo); a corda da cintura sai no
	// acabamento e as placas do ombro no braço
	haori: {
		frente(ctx, q, d) {
			const k = d.k;
			xadrezGrande(ctx, d);
			const x0 = -2.4 * k;
			const x1 = 3 * k;
			forma(ctx, poligono(ctx, [[x0, d.T - 0.2], [x1, d.T - 0.2], [x1 - 0.3, d.B + 1], [x0 + 0.3, d.B + 1]]), QUIMONO_ESCURO, 0.6);
			decoteV(ctx, q, d, 1.2 * k, 3.4);
			traco(ctx, -1.2 * k, d.T - 0.1, 0.3, d.T + 3.4, '#4a505b', 0.9);
			traco(ctx, 1.8 * k, d.T - 0.1, 0.5, d.T + 2.2, '#4a505b', 0.9);
			// A gola comprida do haori, ao longo da abertura
			const gola = golaDoHaori(d.cor);
			forma(ctx, poligono(ctx, [[x0 - 1.3, d.T - 0.2], [x0, d.T - 0.2], [x0 + 0.3, d.B + 1], [x0 - 1, d.B + 1]]), gola, 0.5);
			forma(ctx, poligono(ctx, [[x1, d.T - 0.2], [x1 + 1.3, d.T - 0.2], [x1 + 1, d.B + 1], [x1 - 0.3, d.B + 1]]), gola, 0.5);
		},
		costas(ctx, q, d) {
			xadrezGrande(ctx, d);
			costasLisas(ctx, q, d);
		}
	},

	// A jaqueta jeans original, aberta no peito, no gigante e no forte (ref. 13)
	jeans: {
		frente(ctx, q, d) {
			const k = d.k;
			forma(ctx, poligono(ctx, [[-2.6 * k, d.T - 0.2], [3.2 * k, d.T - 0.2], [2.6 * k, d.B + 1], [-2 * k, d.B + 1]]), q.pele, 0.6);
			const risco = tom(q.pele, 0.72);
			ctx.beginPath();
			ctx.moveTo(-2 * k, d.T + 6.6);
			ctx.quadraticCurveTo(-0.6, d.T + 8, 0.3, d.T + 6.8);
			ctx.quadraticCurveTo(1.2, d.T + 8, 2.6 * k, d.T + 6.6);
			ctx.strokeStyle = risco;
			ctx.lineWidth = 0.6;
			ctx.stroke();
			for (const y of [d.T + 10.2, d.T + 12.8]) traco(ctx, -0.8, y, 1.4, y, risco, 0.5);
			const gola = tom(DENIM, 1.18);
			forma(ctx, poligono(ctx, [[-2.6 * k, d.T - 0.2], [-2 * k, d.T + 5.4], [-4.6 * k, d.T + 3.4], [-4.4 * k, d.T - 0.2]]), gola, 0.6);
			forma(ctx, poligono(ctx, [[3.2 * k, d.T - 0.2], [2.6 * k, d.T + 5.4], [5.2 * k, d.T + 3.4], [5 * k, d.T - 0.2]]), gola, 0.6);
			for (const x of [-d.W + 1.2, d.W - 1.2 - 3 * k]) {
				forma(ctx, caixa(ctx, x, d.T + 6, 3 * k, 2.8, 0.5), tom(DENIM, 0.86), 0.5);
				ponto(ctx, x + 1.5 * k, d.T + 7.4, 0.4, '#c9ced6');
			}
			for (const y of [d.T + 9.6, d.T + 13]) {
				ponto(ctx, -2.4 * k, y, 0.38, '#c9ced6');
				ponto(ctx, 3 * k, y, 0.38, '#c9ced6');
			}
			traco(ctx, -d.W, d.B - 1.6, -2.2 * k, d.B - 1.6, '#8aa6d2', 0.6);
			traco(ctx, 2.8 * k, d.B - 1.6, d.W, d.B - 1.6, '#8aa6d2', 0.6);
		},
		costas(ctx, q, d) {
			traco(ctx, -d.W, d.T + 5, d.W, d.T + 5, '#8aa6d2', 0.6);
			traco(ctx, -d.W, d.B - 1.6, d.W, d.B - 1.6, '#8aa6d2', 0.6);
			costasLisas(ctx, q, d);
		}
	}
};

/** Regata: ombros de pele, alças e cava. `fundo` = onde termina o decote. */
function regata(ctx: C, q: Quadro, d: Molde, fundo: number) {
	ctx.fillStyle = q.pele;
	ctx.fillRect(-20, -45, 40, 40);
	const k = d.k;
	const T = d.T;
	const W = d.W + 1.4;
	forma(ctx, () => {
		ctx.moveTo(-3.9 * k, T - 0.4);
		ctx.lineTo(-1.9 * k, T - 0.4);
		ctx.quadraticCurveTo(0.3, fundo + 0.8, 2.5 * k, T - 0.4);
		ctx.lineTo(4.5 * k, T - 0.4);
		ctx.quadraticCurveTo(4.6 * k, T + 5.4, W, T + 7.6);
		ctx.lineTo(W, d.B + 2);
		ctx.lineTo(-W, d.B + 2);
		ctx.lineTo(-W, T + 7.6);
		ctx.quadraticCurveTo(-4 * k, T + 5.4, -3.9 * k, T - 0.4);
		ctx.closePath();
	}, d.cor, 0.7);
}

/** Top esportivo: pele e a faixa do top no peito. */
function top(ctx: C, q: Quadro, d: Molde, frente: boolean) {
	ctx.fillStyle = q.pele;
	ctx.fillRect(-20, -45, 40, 40);
	const k = d.k;
	const T = d.T;
	const W = d.W + 1.4;
	const fim = d.fem ? -22.8 : d.T + 8.6;
	forma(ctx, () => {
		ctx.moveTo(-W, T + 3.2);
		ctx.quadraticCurveTo(-3.4 * k, T + 2.6, -3.2 * k, T - 0.4);
		ctx.lineTo(-1.6 * k, T - 0.4);
		if (frente) ctx.quadraticCurveTo(0.3, T + 3.6, 2.2 * k, T - 0.4);
		else ctx.quadraticCurveTo(0.3, T + 1.4, 2.2 * k, T - 0.4);
		ctx.lineTo(3.8 * k, T - 0.4);
		ctx.quadraticCurveTo(4 * k, T + 2.6, W, T + 3.2);
		ctx.lineTo(W, fim);
		ctx.lineTo(-W, fim);
		ctx.closePath();
	}, d.cor, 0.7);
	forma(ctx, caixa(ctx, -W, fim - 1.2, W * 2, 1.3, 0.3), dobra(d.cor), 0.5);
	if (frente) ponto(ctx, 0.4, d.B - 1.7, 0.35, tom(q.pele, 0.6));
}

/** Cinto do herói, na cor de destaque, com fivela dourada. */
function heroiCinto(ctx: C, q: Quadro, d: Molde) {
	const y = d.fem ? d.B - 1.6 : d.B - 2.3;
	forma(ctx, caixa(ctx, -d.W - 1.5, y, d.W * 2 + 3, 1.8, 0.5), extraOu(q, '#f2c230'), 0.6);
	if (q.deFrente) forma(ctx, caixa(ctx, -0.7, y - 0.2, 2, 2.2, 0.4), DOURADO, 0.5);
}

// ------------------------------------------- ajudantes das roupas da segunda rodada

/** Vestido sem manga: ombro de pele, cava funda e decote redondo alto (`fundo` = fim do decote). */
function cavas(ctx: C, q: Quadro, d: Molde, fundo: number) {
	ctx.fillStyle = q.pele;
	ctx.fillRect(-20, -45, 40, 40);
	const k = d.k;
	const T = d.T;
	const W = d.W + 1.4;
	forma(ctx, () => {
		ctx.moveTo(-4.3 * k, T - 0.4);
		ctx.lineTo(-1.8 * k, T - 0.4);
		ctx.quadraticCurveTo(0.3, fundo + 0.7, 2.4 * k, T - 0.4);
		ctx.lineTo(4.9 * k, T - 0.4);
		ctx.quadraticCurveTo(4.7 * k, T + 4.4, W, T + 6.2);
		ctx.lineTo(W, d.B + 2);
		ctx.lineTo(-W, d.B + 2);
		ctx.lineTo(-W, T + 6.2);
		ctx.quadraticCurveTo(-4.1 * k, T + 4.4, -4.3 * k, T - 0.4);
		ctx.closePath();
	}, d.cor, 0.7);
}

/** Peito nu de bicho: pelo com a barriga clara em oval, sem os traços de músculo. */
function peitoDePelo(ctx: C, q: Quadro, d: Molde, frente: boolean) {
	ctx.fillStyle = q.pele;
	ctx.fillRect(-20, -45, 40, 40);
	if (!frente || !q.bicho) return;
	forma(ctx, oval(ctx, 0.3, (d.T + d.B) / 2 + 1.4, d.W * 0.6, (d.B - d.T) * 0.42), q.bicho.claro, 0);
}

/** Listras verticais finas e claras da camisa listrada. */
function listrasVerticais(ctx: C, q: Quadro, d: Molde) {
	const cor = q.clara ? 'rgba(255,255,255,0.85)' : tom(d.cor, 1.45);
	for (let x = -d.W - 0.2; x < d.W + 1; x += 1.8) traco(ctx, x, d.T - 1, x, d.B + 1, cor, 0.45);
}

/** Três listras largas brancas da camisa de time (sem escudo nem número). */
function listrasDeTime(ctx: C, d: Molde) {
	const l = 2.3 * d.k;
	ctx.fillStyle = '#f6f6f2';
	for (const cx of [-4.3 * d.k, 0.3, 4.9 * d.k]) ctx.fillRect(cx - l / 2, d.T - 1, l, d.B - d.T + 3);
}

/** Ribana do punho e da barra: mais escura, ou mais clara quando a peça já é escura. */
const ribanaDe = (cor: string) => (escura(cor) ? tom(cor, 1.28) : tom(cor, 0.82));

/** Barra canelada só dos dois lados da abertura (jaqueta aberta). */
function caneladoAberto(ctx: C, d: Molde, y: number, alt: number, cor: string, xEsq: number, xDir: number) {
	ctx.save();
	ctx.beginPath();
	ctx.rect(-30, y - 1, xEsq + 30, alt + 2);
	ctx.rect(xDir, y - 1, 30, alt + 2);
	ctx.clip();
	canelado(ctx, d, y, alt, cor);
	ctx.restore();
}

/** Barra lisa de jaqueta, dos dois lados da abertura (de costas, xEsq = xDir = 0: inteira). */
function barraAberta(ctx: C, d: Molde, y: number, alt: number, cor: string, xEsq: number, xDir: number) {
	if (xEsq === xDir) {
		forma(ctx, caixa(ctx, -d.W - 1.5, y, d.W * 2 + 3, alt, 0.6), cor, 0.6);
		return;
	}
	forma(ctx, caixa(ctx, -d.W - 1.5, y, xEsq + d.W + 1.5, alt, 0.6), cor, 0.6);
	forma(ctx, caixa(ctx, xDir, y, d.W + 1.5 - xDir, alt, 0.6), cor, 0.6);
}

/** Capuz caído nas costas (jaqueta com capuz, acolchoada), de costas, dentro do recorte do tronco. */
function capuzNasCostas(ctx: C, d: Molde, cor: string) {
	const k = d.k;
	forma(ctx, () => {
		ctx.moveTo(-4.4 * k, d.T - 0.8);
		ctx.quadraticCurveTo(-5 * k, d.T + 5.4, 0, d.T + 7.4);
		ctx.quadraticCurveTo(5 * k, d.T + 5.4, 4.4 * k, d.T - 0.8);
		ctx.closePath();
	}, cor, 0.7);
	forma(ctx, () => {
		ctx.moveTo(-3 * k, d.T - 0.6);
		ctx.quadraticCurveTo(0, d.T + 3.6, 3 * k, d.T - 0.6);
		ctx.closePath();
	}, tom(cor, 0.62), 0.5);
}

/** Costuras dos gomos da jaqueta acolchoada (dos lados da abertura), com o brilho de cada gomo. */
function gomos(ctx: C, d: Molde, xEsq: number, xDir: number) {
	const linha = luzDe(d.cor) < 80 ? tom(d.cor, 1.35) : tom(d.cor, 0.7);
	for (let y = d.T + 4.2; y < d.B - 0.6; y += 3.6) {
		riscar(ctx, () => {
			ctx.moveTo(-d.W - 1, y + 0.5);
			ctx.quadraticCurveTo(-d.W * 0.5, y - 0.4, xEsq, y);
			ctx.moveTo(xDir, y);
			ctx.quadraticCurveTo(d.W * 0.55, y - 0.4, d.W + 1, y + 0.5);
		}, linha, 0.6);
		traco(ctx, -d.W + 1, y - 2.2, -d.W + 3, y - 2.5, 'rgba(255,255,255,0.22)', 0.9);
	}
}

/** Tranças do tricô: colunas de "V". */
function tranca(ctx: C, d: Molde, xs: number[]) {
	ctx.beginPath();
	for (const x of xs)
		for (let y = d.T + 3.2; y < d.B - 2.6; y += 1.7) {
			ctx.moveTo(x - 0.9, y);
			ctx.lineTo(x, y + 0.9);
			ctx.lineTo(x + 0.9, y);
		}
	ctx.strokeStyle = tom(d.cor, 0.78);
	ctx.lineWidth = 0.55;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.stroke();
}

/** Cinto tático escuro da farda, com fivela e duas bolsinhas. */
function cintoTatico(ctx: C, d: Molde) {
	const y = d.cinto - 0.4;
	forma(ctx, caixa(ctx, -d.W - 1, y, d.W * 2 + 2, 2.2, 0.5), '#24272b', 0.6);
	forma(ctx, caixa(ctx, -d.W + 0.6, y - 0.5, 2.2, 3.2, 0.5), '#2f3237', 0.5);
	forma(ctx, caixa(ctx, d.W - 2.6, y - 0.5, 2.2, 3.2, 0.5), '#2f3237', 0.5);
	forma(ctx, caixa(ctx, -0.6, y - 0.2, 1.8, 2.6, 0.4), '#3a3d44', 0.5);
}

/** Xadrez grande e discreto do haori (blocos, não textura). */
function xadrezGrande(ctx: C, d: Molde) {
	const cor = luzDe(d.cor) < 80 ? tom(d.cor, 1.5) : tom(d.cor, 0.6);
	ctx.globalAlpha = 0.28;
	for (let y = d.T + 2.6; y < d.B; y += 5.2) traco(ctx, -d.W - 1, y, d.W + 1, y, cor, 1.8);
	for (let x = -d.W + 2.2; x < d.W + 1; x += 5.2) traco(ctx, x, d.T - 1, x, d.B + 1, cor, 1.8);
	ctx.globalAlpha = 1;
}

/** A gola comprida do haori (e a barra da manga): um tom acima ou abaixo da cor. */
const golaDoHaori = (cor: string) => (luzDe(cor) < 80 ? tom(cor, 1.3) : tom(cor, 0.72));

// ================================================================= acabamento

/**
 * Por cima do contorno do tronco: o pescoço grosso do gigante, o cós da calça
 * (camisa por dentro, peito nu), faixas e cordões, corrente, lenço e, de
 * costas, a capa, as asas e a cauda.
 */
export function acabamento(ctx: C, q: Quadro): void {
	const p = plano(q);
	const g = p.g;
	const a = q.a;
	if (p.porte === 'gigante') pescocoGigante(ctx, q, g);
	if (q.feminino && POR_DENTRO.has(a.roupa)) cosDela(ctx, q, p);
	if (a.roupa === 'semCamisa') cosPeitoNu(ctx, q, p);
	if (a.roupa === 'quimono') faixaQuimono(ctx, q, p);
	if (a.roupa === 'tunica') cordaoTunica(ctx, q, p);
	acabamentoDaRoupa(ctx, q, p);
	if (a.detalhes.length) {
		if (q.deFrente && temDetalhe(q, 'corrente')) corrente(ctx, q, g);
		if (q.deFrente && temDetalhe(q, 'lenco')) lenco(ctx, q, g);
		if (temDetalhe(q, 'suspensorio')) suspensorio(ctx, q, g);
		if (temDetalhe(q, 'cracha')) cracha(ctx, q, g);
		if (q.deFrente && temDetalhe(q, 'perolas')) perolas(ctx, g, q.feminino);
		if (temDetalhe(q, 'mochila')) mochila(ctx, q, g);
		if (temDetalhe(q, 'cachecol')) cachecol(ctx, q, g);
		if (temDetalhe(q, 'espada')) (q.deFrente ? caboDaEspada : espadaDeCostas)(ctx, q, g);
		if (temDetalhe(q, 'capa')) (q.deFrente ? fechoCapa : capaDeCostas)(ctx, q, g);
		if (!q.deFrente && temDetalhe(q, 'asas')) asas(ctx, q, g);
		if (!q.deFrente && temDetalhe(q, 'cauda')) cauda(ctx, q, false);
		if (!q.deFrente && temDetalhe(q, 'rabo')) rabo(ctx, q, false);
	}
}

/**
 * O que as roupas da segunda rodada põem por cima do tronco: capuz caído e
 * gola alta, gola de pelúcia, o cinto pendurado do trench curto, o laço da
 * blusa transpassada, a corda do haori e o peitilho da jardineira.
 */
function acabamentoDaRoupa(ctx: C, q: Quadro, p: Plano) {
	const r = q.a.roupa;
	const g = p.g;
	if (r === 'jaquetaCapuz' || r === 'puffer') capuzCaido(ctx, q, g);
	if (r === 'puffer') golaEmPe(ctx, q, g);
	if (r === 'jaquetaPelucia' || r === 'casacoPele') golaPelucia(ctx, q, g, r === 'casacoPele');
	if (r === 'trenchCurto') cintoPendurado(ctx, q, p);
	if (r === 'blusaEnvelope' && q.deFrente) lacoNaCintura(ctx, q, p);
	if (r === 'haori') cordaHaori(ctx, q, p);
	if (p.baixo === 'jardineira') peitilho(ctx, q, p);
}

/** De frente, o capuz caído aparece dos dois lados do pescoço (de costas ele sai na roupa). */
function capuzCaido(ctx: C, q: Quadro, g: Geo) {
	if (!q.deFrente) return;
	const T = g.topo;
	const k = g.k;
	forma(ctx, () => {
		ctx.moveTo(-4.8 * k, T + 1.2);
		ctx.quadraticCurveTo(-5 * k, T - 2.4, 0.3, T - 2.6);
		ctx.quadraticCurveTo(5.6 * k, T - 2.4, 5.4 * k, T + 1.2);
		ctx.quadraticCurveTo(0.3, T - 0.4, -4.8 * k, T + 1.2);
		ctx.closePath();
	}, tom(q.roupa, 0.92), 0.7);
}

/** Gola alta da jaqueta acolchoada, aberta na frente. */
function golaEmPe(ctx: C, q: Quadro, g: Geo) {
	const T = g.topo;
	const k = g.k;
	if (!q.deFrente) {
		forma(ctx, caixa(ctx, -3.6 * k, T - 2.4, 7.2 * k, 3.2, 1.2), q.roupa, 0.7);
		return;
	}
	forma(ctx, caixa(ctx, -4.6 * k, T - 2.6, 2.7 * k, 3.6, 1.2), q.roupa, 0.7);
	forma(ctx, caixa(ctx, 1.9 * k + 0.6, T - 2.6, 2.7 * k, 3.6, 1.2), q.roupa, 0.7);
}

/**
 * Gola larga de pelúcia com a borda em bolinhas: sherpa caramelo na jaqueta do
 * urso (contrasta com o suéter claro, ref. 28), creme e mais larga no casacão.
 * As bolinhas vêm antes da gola e ela as cobre por dentro: só a borda de fora
 * fica ondulada.
 */
function golaPelucia(ctx: C, q: Quadro, g: Geo, larga: boolean) {
	const T = g.topo;
	const k = g.k;
	const o = g.ombro;
	const e = larga ? 1 : 0;
	const cor = larga ? PELUCIA : '#d4b483';
	const bolinhas = (pts: [number, number][], r: number) => {
		for (const [x, y] of pts) forma(ctx, oval(ctx, x, y, r, r), cor, 0.6);
	};
	if (!q.deFrente) {
		const pts: [number, number][] = [];
		for (let x = -(4.2 + e) * k; x < (4.6 + e) * k; x += 1.5) pts.push([x, T + 1.6 + e]);
		bolinhas(pts, 0.85);
		forma(ctx, caixa(ctx, -(4.8 + e) * k, T - 1.4, (9.6 + 2 * e) * k, 3 + e, 1.6), cor, 0);
		riscar(ctx, () => {
			ctx.moveTo(-(4.8 + e) * k, T + 0.4);
			ctx.quadraticCurveTo(-(4.8 + e) * k, T - 1.4, -(3.4 + e) * k, T - 1.4);
			ctx.lineTo((3.4 + e) * k, T - 1.4);
			ctx.quadraticCurveTo((4.8 + e) * k, T - 1.4, (4.8 + e) * k, T + 0.4);
		}, CONTORNO, 0.7);
		return;
	}
	for (const lado of [-1, 1]) {
		const x = (n: number) => 0.3 + lado * n;
		const gola: [number, number][] = [
			[x(1.9 * k), T - 1.6],
			[x(5.2 * k), T - 1],
			[x(o + 0.2 + e * 0.6), T + 2.4 + e],
			[x(4.2 * k), T + 5 + e],
			[x(2.8 * k), T + 7.4 + e * 2],
			[x(2.2 * k), T + 1]
		];
		// Bolinhas ao longo da borda de fora (do ombro até a ponta da lapela)
		const borda: [number, number][] = [];
		for (let i = 1; i < 4; i++) {
			const [x0, y0] = gola[i];
			const [x1, y1] = gola[i + 1];
			for (let t = 0; t < 1; t += 0.34) borda.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
		}
		borda.push(gola[4]);
		bolinhas(borda, 0.85);
		forma(ctx, poligono(ctx, gola), cor, 0);
		riscar(ctx, () => {
			ctx.moveTo(gola[4][0], gola[4][1]);
			ctx.lineTo(gola[5][0], gola[5][1]);
			ctx.lineTo(gola[0][0], gola[0][1]);
			ctx.lineTo(gola[1][0], gola[1][1]);
		}, CONTORNO, 0.7);
		traco(ctx, x(3.2 * k), T + 1.4, x(4 * k), T + 3.4, tom(cor, 0.82), 0.5);
	}
}

/** O cinto do trench curto, solto e pendurado dos dois lados, com a fivela (ref. 39). */
function cintoPendurado(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const B = q.feminino ? (p.longo ? g.baseLonga : g.base) : g.base;
	const w = q.feminino ? g.cintura + 0.4 : g.larguraBase;
	const s = q.andando ? Math.sin(q.fase) * 0.5 : 0;
	const cor = tom(q.roupa, 0.9);
	faixa(ctx, [[-w + 0.2, B - 1.4], [-w - 0.4 + s, B + 1.4], [-w + 0.2 + s, B + 3.6]], cor, 1.2);
	faixa(ctx, [[w - 0.2, B - 1.4], [w + 0.6 + s, B + 1.2], [w + 0.2 + s, B + 3]], cor, 1.2);
	if (q.deFrente) forma(ctx, caixa(ctx, w - 0.7 + s, B + 0.4, 1.8, 1.8, 0.3), '#9aa0aa', 0.5);
}

/** Laço da blusa transpassada na cintura, com as pontas caindo sobre a saia (ref. 38). */
function lacoNaCintura(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const y = q.feminino ? g.cinturaY + 0.8 : g.base - 1.6;
	const x = q.feminino ? -1.6 : -2.4;
	const cor = q.roupa;
	const s = q.andando ? Math.sin(q.fase) * 0.4 : 0;
	faixa(ctx, [[x - 0.2, y + 0.6], [x - 1.2 + s, y + 4.6], [x - 0.8 + s, y + 7.4]], cor, 1.3);
	faixa(ctx, [[x + 0.4, y + 0.6], [x + 0.8 + s, y + 4], [x + 1.6 + s, y + 6.6]], cor, 1.3);
	forma(ctx, oval(ctx, x - 1.8, y - 0.1, 1.9, 1.1, 0.35), cor, 0.6);
	forma(ctx, oval(ctx, x + 1.9, y - 0.1, 1.9, 1.1, -0.35), cor, 0.6);
	forma(ctx, oval(ctx, x + 0.1, y, 0.9, 0.9), tom(cor, 0.85), 0.55);
}

/** Faixa de corda trançada do haori na cintura, com o nó e as borlas (ref. 32). */
function cordaHaori(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const y = q.feminino ? g.cinturaY + 0.6 : g.base - 2.6;
	const w = q.feminino ? g.cintura + 1.2 : g.larguraBase + 0.6;
	const cor = extraOu(q, '#c9a86a');
	const corda = caixa(ctx, -w, y - 1.2, w * 2, 2.4, 1);
	forma(ctx, corda, cor, 0.7);
	dentroDe(ctx, corda, () => {
		for (let x = -w; x < w + 2; x += 1.3) traco(ctx, x, y + 1.3, x + 1.1, y - 1.3, tom(cor, 0.7), 0.5);
	});
	if (!q.deFrente) return;
	const s = q.andando ? Math.sin(q.fase) * 0.6 : 0;
	const x = -2.4 * g.k;
	faixa(ctx, [[x, y + 0.6], [x - 0.6 + s, y + 5.6]], cor, 0.9);
	faixa(ctx, [[x + 0.8, y + 0.6], [x + 1 + s, y + 6.4]], cor, 0.9);
	forma(ctx, oval(ctx, x + 0.3, y, 1.4, 1.2), tom(cor, 1.1), 0.6);
	forma(ctx, caixa(ctx, x - 1.3 + s, y + 5.4, 1.4, 2, [0.4, 0.4, 0.2, 0.2]), tom(cor, 0.85), 0.5);
	forma(ctx, caixa(ctx, x + 0.3 + s, y + 6.2, 1.4, 2, [0.4, 0.4, 0.2, 0.2]), tom(cor, 0.85), 0.5);
}

/** Jardineira: peitilho com bolso e as duas alças com botão; de costas, as alças em X (ref. 53). */
function peitilho(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const cor = p.corPerna;
	const T = g.topo;
	const k = g.k;
	const yCos = q.feminino ? g.cinturaY + 0.4 : g.base - 1.6;
	const topo = T + (q.feminino ? 6 : 6.8);
	const w = 3.2 * k;
	const ombro = g.ombro - 2.2;
	const cos = () => {
		if (q.feminino) forma(ctx, caixa(ctx, -g.cintura - 0.5, yCos - 0.6, g.cintura * 2 + 1.6, 2.4, 0.4), cor, 0.7);
	};
	if (!q.deFrente) {
		faixa(ctx, [[-ombro, T - 0.2], [ombro * 0.55, yCos - 0.8]], cor, 1.1);
		faixa(ctx, [[ombro + 0.6, T - 0.2], [-ombro * 0.55, yCos - 0.8]], cor, 1.1);
		cos();
		return;
	}
	for (const lado of [-1, 1]) faixa(ctx, [[lado * (w - 0.6) + 0.3, topo + 0.6], [lado * ombro + 0.3, T - 0.2]], cor, 1.1);
	cos();
	const c = caixa(ctx, -w + 0.3, topo, w * 2, yCos - topo + 1.2, [0.8, 0.8, 0, 0]);
	forma(ctx, c, cor);
	sombraDireita(ctx, c, w * 0.4 + 0.3);
	forma(ctx, caixa(ctx, -w * 0.55 + 0.3, topo + 1.4, w * 1.1, 2.6, 0.4), tom(cor, 0.9), 0.5);
	for (const lado of [-1, 1]) ponto(ctx, lado * (w - 0.9) + 0.3, topo + 0.9, 0.5, '#c9ced6');
}

/** Suspensório solto, as alças caindo dos lados da cintura até a coxa (ref. 26). */
function suspensorio(ctx: C, q: Quadro, g: Geo) {
	const cor = extraOu(q, '#c98a3a');
	const B = q.feminino ? g.cinturaY + 1 : g.base - 2;
	const w = q.feminino ? g.cintura + 0.2 : g.larguraBase - 0.6;
	const s = q.andando ? Math.sin(q.fase) * 0.8 : 0;
	const fim = q.sentado ? B + 3.4 : B + 8.4;
	for (const lado of [-1, 1]) {
		const x = lado * w + 0.3;
		faixa(ctx, [[x, B - 0.6], [x + lado * 0.6 + s * 0.4, (B + fim) / 2], [x + lado * 0.2 + s, fim]], cor, 1.2);
		forma(ctx, caixa(ctx, x + lado * 0.2 + s - 0.8, fim - 0.4, 1.6, 1.4, 0.3), '#b9bec8', 0.45);
		ponto(ctx, x, B - 0.4, 0.5, tom(cor, 0.6));
	}
}

/** Crachá: cordão escuro em V e cartão branco liso com uma faixinha de cor; sem escrita, foto nem logo (refs. 44 e 45). */
function cracha(ctx: C, q: Quadro, g: Geo) {
	const T = g.topo;
	const cordao = '#1f2230';
	if (!q.deFrente) {
		riscar(ctx, () => {
			ctx.moveTo(-2.6, T + 0.2);
			ctx.quadraticCurveTo(0, T + 1.4, 2.6, T + 0.2);
		}, cordao, 0.7);
		return;
	}
	const y = T + (q.feminino ? 5.8 : 7.2);
	riscar(ctx, () => {
		ctx.moveTo(-2, T - 0.4);
		ctx.lineTo(0, y - 0.4);
		ctx.moveTo(2.6, T - 0.4);
		ctx.lineTo(0.6, y - 0.4);
	}, cordao, 0.75);
	forma(ctx, caixa(ctx, -0.1, y - 0.9, 0.8, 1, 0.2), '#c9ced6', 0.4);
	forma(ctx, caixa(ctx, -1.6, y, 3.8, 4.8, 0.5), '#fbfaf6', 0.6);
	forma(ctx, caixa(ctx, -1.6, y + 3.4, 3.8, 1.4, [0, 0, 0.5, 0.5]), extraOu(q, '#3b6ef6'), 0);
}

/** Colar de pérolas: nove bolinhas brancas no colo (ref. 49). */
function perolas(ctx: C, g: Geo, feminino: boolean) {
	const r = feminino ? 3.2 : 3.8;
	const n = 9;
	for (let i = 0; i < n; i++) {
		const a = Math.PI * (0.12 + (0.76 * i) / (n - 1));
		forma(ctx, oval(ctx, 0.3 + Math.cos(a) * r, g.topo - 0.9 + Math.sin(a) * r * 0.9, 0.62, 0.62), '#f8f6f0', 0.35);
	}
}

/** Mochila: de frente, as alças sobre os ombros; de costas, a mochila inteira (ref. 52). */
function mochila(ctx: C, q: Quadro, g: Geo) {
	const T = g.topo;
	const o = g.ombro;
	const cor = '#2f333b';
	const alca = '#1c1e24';
	if (q.deFrente) {
		for (const lado of [-1, 1]) {
			const x0 = lado * (o - 2.3) + 0.3;
			faixa(ctx, [[x0, T - 0.3], [x0 + lado * 0.5, T + 4.4], [lado * (o - 0.4) + 0.3, T + 8.6]], alca, 1.2);
			forma(ctx, caixa(ctx, x0 + lado * 0.4 - 0.7, T + 4.6, 1.4, 1, 0.3), '#8a909b', 0.4);
		}
		return;
	}
	const w = Math.min(o - 0.7, 6.2 * g.k);
	const y0 = T + 1.2;
	const h = 11.4;
	for (const lado of [-1, 1]) faixa(ctx, [[lado * (w - 1.6), y0 + 1.4], [lado * (o - 2), T - 0.4]], alca, 1.2);
	const c = caixa(ctx, -w, y0, w * 2, h, [2.6, 2.6, 1.6, 1.6]);
	forma(ctx, c, cor);
	sombraDireita(ctx, c, w * 0.35);
	forma(ctx, caixa(ctx, -w * 0.68, y0 + 5.4, w * 1.36, h - 6.2, [1.4, 1.4, 1, 1]), tom(cor, 1.25), 0.6);
	riscar(ctx, () => {
		ctx.moveTo(-w + 1.4, y0 + 2.6);
		ctx.quadraticCurveTo(0, y0 + 0.6, w - 1.4, y0 + 2.6);
	}, '#8a909b', 0.5);
	forma(ctx, caixa(ctx, w - 2, y0 + 2, 0.8, 1.4, 0.3), '#c9ced6', 0.4);
}

/** Cachecol xadrez na cor de destaque: a volta no pescoço e as duas pontas caindo até a barriga (ref. 34). */
function cachecol(ctx: C, q: Quadro, g: Geo) {
	const T = g.topo;
	const k = g.k;
	const cor = extraOu(q, '#a8643a');
	const xadrezinho = (f: () => void) => {
		dentroDe(ctx, f, () => {
			ctx.globalAlpha = 0.7;
			for (let x = -8; x < 9; x += 1.7) traco(ctx, x, T - 4, x, T + 14, tom(cor, 0.6), 0.55);
			for (let y = T - 3; y < T + 14; y += 1.7) traco(ctx, -8, y, 9, y, tom(cor, 1.4), 0.5);
			ctx.globalAlpha = 1;
		});
		riscar(ctx, f, CONTORNO, 0.7);
	};
	if (q.deFrente) {
		const pontas: [number, number][][] = [
			[[-1.8, T + 0.4], [0.4, T + 0.4], [0, T + 11], [-2.2, T + 10.6]],
			[[0.9, T + 0.4], [3.1, T + 0.4], [3.4, T + 9.4], [1.2, T + 9.6]]
		];
		for (const pts of pontas) {
			const c = poligono(ctx, pts);
			forma(ctx, c, cor, 0.6);
			xadrezinho(c);
			// Franja
			const [, , [xa, ya], [xb, yb]] = pts;
			for (let i = 0; i < 3; i++) {
				const t = (i + 0.5) / 3;
				const x = xb + (xa - xb) * t;
				const y = yb + (ya - yb) * t;
				traco(ctx, x, y, x, y + 1, tom(cor, 0.8), 0.45);
			}
		}
	}
	const volta = () => {
		ctx.moveTo(-4.4 * k, T + 0.6);
		ctx.quadraticCurveTo(-4.8 * k, T - 2.4, 0.3, T - 2.4);
		ctx.quadraticCurveTo(5.4 * k, T - 2.4, 5 * k, T + 0.6);
		ctx.quadraticCurveTo(0.3, T + 3.4, -4.4 * k, T + 0.6);
		ctx.closePath();
	};
	forma(ctx, volta, cor, 0.7);
	xadrezinho(volta);
}

// ===================================================================== espada

const BAINHA = '#1f2128';
const GUARDA = '#b89a5a';
/** Altura da cintura onde a espada atravessa. */
const yEspada = (q: Quadro, g: Geo) => (q.feminino ? g.cinturaY + 1.8 : g.base - 2.2);

/** De frente, atrás de tudo: a bainha sai atrás do quadril, para baixo e para trás (ref. 32). */
function bainhaAtras(ctx: C, q: Quadro, g: Geo) {
	const y = yEspada(q, g);
	faixa(ctx, [[-2, y], [-13.6, y + 6.4]], BAINHA, 1.8);
	traco(ctx, -12.6, y + 5.6, -13.8, y + 6.4, GUARDA, 1.1);
}

/** De frente, por cima da roupa: a boca da bainha na cintura, a guarda e o cabo trançado (sempre embainhada). */
function caboDaEspada(ctx: C, q: Quadro, g: Geo) {
	const y = yEspada(q, g);
	faixa(ctx, [[-3, y + 0.8], [0.8, y - 0.8]], BAINHA, 1.8);
	forma(ctx, oval(ctx, 1.3, y - 1.1, 1.7, 0.8, 1.16), GUARDA, 0.5);
	faixa(ctx, [[2, y - 1.4], [6.6, y - 3.4]], '#2a2d35', 1.4);
	for (const t of [0.25, 0.5, 0.75]) ponto(ctx, 2 + 4.6 * t, y - 1.4 - 2 * t, 0.4, '#d9c9a0');
	ponto(ctx, 6.8, y - 3.5, 0.6, GUARDA);
}

/** De costas: a bainha atravessada na lombar. */
function espadaDeCostas(ctx: C, q: Quadro, g: Geo) {
	const y = yEspada(q, g);
	faixa(ctx, [[3.2, y - 0.6], [-13.4, y + 5.8]], BAINHA, 1.8);
	traco(ctx, -12.4, y + 5.2, -13.6, y + 5.9, GUARDA, 1.1);
	faixa(ctx, [[4.4, y - 1.1], [6.6, y - 2]], '#2a2d35', 1.4);
}

// ====================================================================== rabo

type Ponto = [number, number];

/** Ponto e normal de uma curva quadrática (p0 → p1 → p2) em t. */
function naCurva(p0: Ponto, p1: Ponto, p2: Ponto, t: number) {
	const u = 1 - t;
	const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
	const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
	const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
	const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
	const len = Math.hypot(dx, dy) || 1;
	return { x, y, nx: -dy / len, ny: dx / len, ang: Math.atan2(dy, dx) };
}

/**
 * Contorno de rabo ao longo de uma curva: nasce fino (r0), engorda até rMax
 * e termina redondo (rPonta). Serve do rabo de gato ao de guaxinim.
 */
function contornoRabo(ctx: C, p0: Ponto, p1: Ponto, p2: Ponto, r0: number, rMax: number, rPonta: number) {
	const N = 12;
	const esq: Ponto[] = [];
	const dir: Ponto[] = [];
	for (let i = 0; i <= N; i++) {
		const t = i / N;
		const c = naCurva(p0, p1, p2, t);
		const r = t < 0.6 ? r0 + (rMax - r0) * Math.sin(((t / 0.6) * Math.PI) / 2) : rMax + (rPonta - rMax) * ((t - 0.6) / 0.4);
		esq.push([c.x + c.nx * r, c.y + c.ny * r]);
		dir.push([c.x - c.nx * r, c.y - c.ny * r]);
	}
	const fim = naCurva(p0, p1, p2, 1).ang;
	return () => {
		ctx.moveTo(esq[0][0], esq[0][1]);
		for (const [x, y] of esq) ctx.lineTo(x, y);
		ctx.arc(p2[0], p2[1], rPonta, fim + Math.PI / 2, fim - Math.PI / 2, true);
		for (let i = N; i >= 0; i--) ctx.lineTo(dir[i][0], dir[i][1]);
		ctx.closePath();
	};
}

/** Faixas escuras atravessadas no rabo (anéis do guaxinim, listras do tigre); quem chama já recortou. */
function aneis(ctx: C, p0: Ponto, p1: Ponto, p2: Ponto, ts: number[], cor: string, lw: number) {
	for (const t of ts) {
		const c = naCurva(p0, p1, p2, t);
		traco(ctx, c.x + c.nx * 4, c.y + c.ny * 4, c.x - c.nx * 4, c.y - c.ny * 4, cor, lw);
	}
}

/**
 * Rabo do bicho de roupa: de frente sai atrás do corpo, para o lado (camada
 * de trás); de costas nasce no meio do quadril, por cima da calça. Peludo e
 * com anéis (guaxinim), cheio (lobo), fino listrado (tigre), fino (gato),
 * longo e enrolado na ponta (macaco), abanando (cachorro), pompom (coelho),
 * curtinho (urso). Balança andando. Sem bicho, nada (refs. 30, 54 e 55).
 */
function rabo(ctx: C, q: Quadro, deFrente: boolean) {
	const b = q.bicho;
	if (!b?.forma) return;
	const bal = q.andando ? Math.sin(q.fase) * 1.4 : Math.sin(q.t * 1.6) * 0.4;
	ctx.save();
	if (!deFrente) ctx.translate(2.9, -0.2);
	const o: Ponto = [-2.6, -15.2];
	switch (b.forma) {
		case 'coelho':
		case 'urso': {
			const coelho = b.forma === 'coelho';
			const r = coelho ? 2.1 : 1.6;
			const [x, y] = deFrente ? [-6.6, -14.8] : [-2.6, -15.4];
			forma(ctx, oval(ctx, x, y, r, r), coelho ? b.claro : b.pelo, 0.7);
			ponto(ctx, x - r * 0.35, y - r * 0.35, r * 0.35, 'rgba(255,255,255,0.5)');
			break;
		}
		case 'guaxinim':
		case 'lobo': {
			const lobo = b.forma === 'lobo';
			const meio: Ponto = [-11.6, -13];
			const ponta: Ponto = [-10.4 + bal * 0.5, lobo ? -4 : -3.4];
			const c = contornoRabo(ctx, o, meio, ponta, 0.9, lobo ? 2.8 : 2.5, lobo ? 1.5 : 1.7);
			forma(ctx, c, b.pelo);
			dentroDe(ctx, c, () => {
				if (lobo) {
					ctx.fillStyle = tom(b.pelo, 0.72);
					ctx.beginPath();
					ctx.arc(ponta[0], ponta[1], 3.2, 0, Math.PI * 2);
					ctx.fill();
					ctx.fillStyle = 'rgba(16, 20, 32, 0.16)';
					ctx.fillRect(meio[0] - 6, -20, 6, 20);
				} else aneis(ctx, o, meio, ponta, [0.36, 0.56, 0.76, 0.98], b.escuro, 1.4);
			});
			riscar(ctx, c, CONTORNO, LW);
			break;
		}
		case 'felino': {
			const meio: Ponto = [-11.4, -13.4 + bal];
			const ponta: Ponto = [-10.2, -22 + bal];
			const c = contornoRabo(ctx, o, meio, ponta, 0.8, 0.9, 0.8);
			forma(ctx, c, b.pelo);
			if (b.id === 'tigre')
				dentroDe(ctx, c, () => {
					aneis(ctx, o, meio, ponta, [0.42, 0.62, 0.8], b.escuro, 0.8);
					ctx.fillStyle = b.escuro;
					ctx.fillRect(ponta[0] - 2, ponta[1] - 2, 4, 2.2);
				});
			riscar(ctx, c, CONTORNO, LW);
			break;
		}
		case 'macaco': {
			const meio: Ponto = [-12, -16.4];
			const ponta: Ponto = [-9.6, -24 + bal];
			const c = contornoRabo(ctx, o, meio, ponta, 0.75, 0.8, 0.75);
			forma(ctx, c, b.pelo);
			// A ponta enrolada
			ctx.beginPath();
			ctx.arc(ponta[0] + 1.3, ponta[1] - 0.2, 1.3, Math.PI, Math.PI * 2.55);
			ctx.lineCap = 'round';
			ctx.strokeStyle = CONTORNO;
			ctx.lineWidth = 2.6;
			ctx.stroke();
			ctx.strokeStyle = b.pelo;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			break;
		}
		case 'cachorro': {
			const abana = q.andando ? Math.sin(q.fase * 2) * 1.2 : Math.sin(q.t * 7) * 1;
			const meio: Ponto = [-8.6, -16.4];
			const ponta: Ponto = [-9.8 + abana * 0.4, -22 + abana];
			const c = contornoRabo(ctx, o, meio, ponta, 1, 1.4, 0.6);
			forma(ctx, c, b.pelo);
			if (b.id === 'dalmata')
				dentroDe(ctx, c, () => {
					ponto(ctx, -8.2, -17.6, 0.8, b.escuro);
					ponto(ctx, -9.4, -20.4 + abana * 0.6, 0.6, b.escuro);
				});
			riscar(ctx, c, CONTORNO, LW);
			break;
		}
	}
	ctx.restore();
}

/** Trapézio grosso que liga a cabeça (que sobe) aos ombros do gigante. */
function pescocoGigante(ctx: C, q: Quadro, g: Geo) {
	const T = g.topo;
	const sobe = g.m.ergue ?? 0;
	const meia = q.feminino ? 3 : 4.2;
	const c = () => {
		ctx.moveTo(-meia - 1.4, T + 0.3);
		ctx.quadraticCurveTo(-meia + 0.2, T - 1, -meia + 0.8, T - sobe - 1.4);
		ctx.lineTo(meia - 0.2, T - sobe - 1.4);
		ctx.quadraticCurveTo(meia + 0.8, T - 1, meia + 2, T + 0.3);
		ctx.quadraticCurveTo(0.3, T + 1.6, -meia - 1.4, T + 0.3);
		ctx.closePath();
	};
	forma(ctx, c, q.pele);
	sombraDireita(ctx, c, 2, 'rgba(120, 60, 30, 0.12)');
}

/** Cós da calça ou da saia por cima da camisa dela (camisa por dentro). */
function cosDela(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const y = g.cinturaY + 0.2;
	const w = g.cintura + 0.5;
	const cor = q.corBaixo;
	forma(ctx, () => {
		ctx.moveTo(-w, y);
		ctx.lineTo(w, y);
		ctx.lineTo(w + 0.4, g.base + 0.4);
		ctx.lineTo(-w - 0.4, g.base + 0.4);
		ctx.closePath();
	}, cor, 0.7);
	traco(ctx, -w, y + 1.1, w, y + 1.1, tom(cor, 0.82), 0.45);
	if (q.deFrente) ponto(ctx, 0.3, y + 1.6, 0.45, tom(cor, 0.6));
}

/** Peito nu: o alto da calça (ou a faixa) passa por cima do fim do tronco. */
function cosPeitoNu(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const B = g.base;
	const w = q.feminino ? g.cintura + 0.6 : g.larguraBase + 0.5;
	const y = B - 2.6;
	const cor = p.corPerna;
	forma(ctx, caixa(ctx, -w, y, w * 2, B - y + 0.8, [0.8, 0.8, 1.6, 1.6]), cor, LW);
	sombraDireita(ctx, caixa(ctx, -w, y, w * 2, B - y + 0.8, [0.8, 0.8, 1.6, 1.6]), w * 0.45);
	if (p.baixo === 'bufante') {
		// Faixa larga amarrada (sem emblema)
		const faixaCor = extraOu(q, '#1f2230');
		forma(ctx, caixa(ctx, -w - 0.3, y - 0.4, w * 2 + 0.6, 2.4, 0.8), faixaCor, 0.7);
		if (q.deFrente) {
			forma(ctx, oval(ctx, -2.2, y + 0.8, 1.3, 1.1), tom(faixaCor, 1.3), 0.6);
			faixa(ctx, [[-2.6, y + 1.6], [-3.6, y + 5]], faixaCor, 1.1);
		}
	} else if (p.baixo === 'bermudaRasgada') {
		// Cordão de corda amarrado na frente
		traco(ctx, -w + 0.4, y + 0.9, w - 0.4, y + 0.9, '#c9a46a', 0.9);
		if (q.deFrente) {
			forma(ctx, oval(ctx, 0.3, y + 1, 0.9, 0.7), '#c9a46a', 0.5);
			faixa(ctx, [[0, y + 1.4], [-0.8, y + 4]], '#c9a46a', 0.6);
			faixa(ctx, [[0.6, y + 1.4], [1.6, y + 3.8]], '#c9a46a', 0.6);
		}
	} else traco(ctx, -w + 0.3, y + 1.1, w - 0.3, y + 1.1, tom(cor, 0.78), 0.5);
}

/** Faixa do quimono na cintura, com o nó e as pontas caindo de lado. */
function faixaQuimono(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const cor = extraOu(q, tom(q.roupa, 0.55));
	const B = q.feminino ? g.cinturaY + 2.2 : g.base - 2.4;
	const w = q.feminino ? g.cintura + 1.2 : g.larguraBase + 0.6;
	forma(ctx, caixa(ctx, -w, B - 1.4, w * 2, 2.6, 0.6), cor, 0.7);
	if (!q.deFrente) return;
	const x = -2.6 * g.k;
	faixa(ctx, [[x, B + 0.6], [x - 1.2, B + 5]], cor, 1.3);
	faixa(ctx, [[x + 0.6, B + 0.6], [x + 0.9, B + 4.6]], cor, 1.3);
	forma(ctx, oval(ctx, x + 0.2, B - 0.1, 1.4, 1.1), tom(cor, 1.15), 0.6);
}

/** Cordão de corda da túnica, com borlas. */
function cordaoTunica(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const y = q.feminino ? g.cinturaY + 0.6 : g.base - 2.2;
	const w = q.feminino ? g.cintura + 0.5 : g.larguraBase + 0.4;
	const cor = '#d9b46a';
	faixa(ctx, [[-w, y], [0.3, y + 0.8], [w, y]], cor, 1.1);
	if (!q.deFrente) return;
	const s = q.andando ? Math.sin(q.fase) * 0.6 : 0;
	faixa(ctx, [[-1.6, y + 0.8], [-2 + s, y + 5.4]], cor, 0.7);
	faixa(ctx, [[-0.8, y + 0.8], [-0.4 + s, y + 6.2]], cor, 0.7);
	forma(ctx, oval(ctx, -1.2, y + 0.8, 1, 0.8), cor, 0.6);
	forma(ctx, caixa(ctx, -2.7 + s, y + 5.2, 1.4, 1.6, 0.5), cor, 0.5);
	forma(ctx, caixa(ctx, -1.1 + s, y + 6, 1.4, 1.6, 0.5), cor, 0.5);
}

/** Corrente grossa prateada com pingente (ref. 13). */
function corrente(ctx: C, q: Quadro, g: Geo) {
	const T = g.topo;
	const r = q.feminino ? 3.4 : 4.2;
	ctx.beginPath();
	ctx.arc(0.3, T - r + 3.6, r, 0.16 * Math.PI, 0.84 * Math.PI);
	ctx.strokeStyle = CONTORNO;
	ctx.lineWidth = 2;
	ctx.stroke();
	ctx.strokeStyle = '#d3d9e1';
	ctx.lineWidth = 1.1;
	ctx.setLineDash([0.9, 0.5]);
	ctx.stroke();
	ctx.setLineDash([]);
	forma(ctx, caixa(ctx, -0.6, T + 3.3, 1.8, 2.2, 0.5), '#d3d9e1', 0.6);
	ponto(ctx, 0, T + 3.9, 0.3, '#ffffff');
}

/** Lenço amarrado no pescoço, com as pontas para o lado (ref. 3). */
function lenco(ctx: C, q: Quadro, g: Geo) {
	const T = g.topo;
	const cor = q.clara ? tom(q.roupa, 0.7) : tom(q.roupa, 1.45);
	forma(ctx, () => {
		ctx.moveTo(-2.8, T - 0.6);
		ctx.quadraticCurveTo(0.3, T + 2.4, 3.4, T - 0.6);
		ctx.lineTo(3.6, T + 0.8);
		ctx.quadraticCurveTo(0.3, T + 3.6, -2.8, T + 0.8);
		ctx.closePath();
	}, cor, 0.6);
	forma(ctx, poligono(ctx, [[2.2, T + 1.2], [4.8, T + 4.6], [3.2, T + 4.8]]), cor, 0.55);
	forma(ctx, poligono(ctx, [[2.4, T + 1.2], [5.6, T + 3.4], [4.8, T + 4.4]]), tom(cor, 0.9), 0.55);
	forma(ctx, oval(ctx, 2.4, T + 1.2, 1.1, 0.9), tom(cor, 0.92), 0.5);
}

// ====================================================================== capa

/** Capa de vampiro (de quem tem caninos): preta por fora, forro e gola alta. */
const deVampiro = (q: Quadro) => temDetalhe(q, 'caninos');

function coresDaCapa(q: Quadro): { fora: string; forro: string } {
	if (deVampiro(q)) {
		const forro = q.extra && !escura(q.extra) ? q.extra : '#8c1f33';
		return { fora: '#1f2128', forro };
	}
	const fora = extraOu(q, '#c62828');
	return { fora, forro: tom(fora, 0.7) };
}

/** Quanto a capa vai para trás ao andar (o boneco olha para +x). */
function vento(q: Quadro) {
	return q.andando ? -1.8 + Math.sin(q.fase * 2) * 0.5 : Math.sin(q.t * 1.3) * 0.25;
}

/** De frente: a capa atrás de tudo (aparece o forro em volta do corpo). */
function capaDeFrente(ctx: C, q: Quadro, g: Geo) {
	const { fora, forro } = coresDaCapa(q);
	const T = g.topo;
	const o = g.ombro;
	const v = vento(q);
	const barra = -3.4;
	const c = () => {
		ctx.moveTo(-o + 1.2, T + 1.4);
		ctx.lineTo(o - 1.2, T + 1.4);
		ctx.quadraticCurveTo(o + 2.6, -16, o + 3.4 + v * 0.4, barra);
		ctx.quadraticCurveTo(o * 0.5 + v, barra + 1.3, v * 0.8, barra);
		ctx.quadraticCurveTo(-o * 0.5 + v, barra + 1.3, -o - 3.6 + v * 1.2, barra);
		ctx.quadraticCurveTo(-o - 2.6, -16, -o + 1.2, T + 1.4);
		ctx.closePath();
	};
	forma(ctx, c, forro);
	// Barra virada: um pouco do lado de fora aparece embaixo
	ctx.save();
	ctx.beginPath();
	c();
	ctx.clip();
	ctx.fillStyle = fora;
	ctx.fillRect(-20, barra - 1.4, 40, 3);
	ctx.restore();
	riscar(ctx, c);
	if (deVampiro(q)) golaVampiro(ctx, g, fora, forro);
}

/** Gola alta da capa de vampiro, atrás da cabeça. */
function golaVampiro(ctx: C, g: Geo, fora: string, forro: string) {
	const T = g.topo;
	for (const lado of [-1, 1]) {
		const x = (n: number) => 0.3 + lado * n;
		forma(ctx, poligono(ctx, [[x(2.6), T + 0.6], [x(9.4), T - 9.6], [x(8.4), T - 4.6], [x(6.6), T + 1]]), fora, 0.8);
		forma(ctx, poligono(ctx, [[x(3.6), T + 0.2], [x(8.6), T - 8], [x(7.6), T - 4.2], [x(6.2), T + 0.6]]), forro, 0);
	}
}

/** De frente, por cima da roupa: o fecho da capa nos ombros. */
function fechoCapa(ctx: C, q: Quadro, g: Geo) {
	const { fora } = coresDaCapa(q);
	const T = g.topo;
	const o = g.ombro;
	for (const lado of [-1, 1]) {
		const x = lado * (o - 1.6) + 0.3;
		forma(ctx, poligono(ctx, [[x - lado * 1.2, T + 0.2], [x + lado * 1.8, T + 0.6], [x + lado * 1.6, T + 2.6]]), fora, 0.6);
	}
	traco(ctx, -o + 2.4, T + 1.6, o - 1.8, T + 1.6, DOURADO, 0.6);
	forma(ctx, oval(ctx, -o + 2.2, T + 1.6, 0.9, 0.9), DOURADO, 0.5);
	forma(ctx, oval(ctx, o - 1.6, T + 1.6, 0.9, 0.9), DOURADO, 0.5);
}

/** De costas: a capa cobre as costas, do ombro até o joelho. */
function capaDeCostas(ctx: C, q: Quadro, g: Geo) {
	const { fora, forro } = coresDaCapa(q);
	const T = g.topo;
	const o = g.ombro;
	const s = q.andando ? Math.sin(q.fase * 2) * 0.6 : Math.sin(q.t * 1.3) * 0.25;
	const barra = -3.2;
	const c = () => {
		ctx.moveTo(-o + 0.6, T - 0.2);
		ctx.lineTo(o - 0.6, T - 0.2);
		ctx.quadraticCurveTo(o + 1.6, T + 1, o + 1.8, T + 5);
		ctx.quadraticCurveTo(o + 2.6, -12, o + 3.4 + s, barra);
		ctx.quadraticCurveTo(o * 0.5, barra + 1.2 + s, 0.3, barra + 0.2);
		ctx.quadraticCurveTo(-o * 0.5, barra + 1.2 - s, -o - 3.4 - s, barra);
		ctx.quadraticCurveTo(-o - 2.6, -12, -o - 1.8, T + 5);
		ctx.quadraticCurveTo(-o - 1.6, T + 1, -o + 0.6, T - 0.2);
		ctx.closePath();
	};
	forma(ctx, c, fora);
	sombraDireita(ctx, c, o * 0.5);
	traco(ctx, -2.4, T + 7, -3.6, barra - 1, tom(fora, escura(fora) ? 1.5 : 0.78), 0.6);
	traco(ctx, 3, T + 7, 4.2, barra - 1, tom(fora, escura(fora) ? 1.5 : 0.78), 0.6);
	riscar(ctx, c);
	if (deVampiro(q)) golaVampiro(ctx, g, fora, forro);
}

// ===================================================================== asas

/** Asas brancas de penas, batendo devagar. De frente ficam atrás do corpo (atras), de costas por cima (acabamento). */
function asas(ctx: C, q: Quadro, g: Geo) {
	const T = g.topo;
	const bate = Math.sin(q.t * 2.2) * 0.12;
	const pena = '#fbfaf6';
	const risco = '#c9cfdc';
	for (const lado of [-1, 1]) {
		ctx.save();
		// Presas no meio das costas e abertas para os lados: as penas aparecem
		// além do braço, abaixo do cabelo (cabelo volumoso cobriria a asa alta)
		ctx.translate(lado * 2.6 + 0.3, T + 7);
		ctx.rotate(-lado * bate);
		ctx.scale(lado, 1);
		const c = () => {
			ctx.moveTo(0, -1);
			ctx.quadraticCurveTo(5, -8.4, 13.6, -7);
			ctx.quadraticCurveTo(12.4, -4, 13.2, -1.8);
			ctx.quadraticCurveTo(10.8, -1.4, 11.2, 1.2);
			ctx.quadraticCurveTo(8.6, 1.2, 8.8, 4);
			ctx.quadraticCurveTo(6, 3.6, 5.8, 6.4);
			ctx.quadraticCurveTo(3, 5.8, 0.6, 7.6);
			ctx.closePath();
		};
		forma(ctx, c, pena);
		ctx.beginPath();
		ctx.moveTo(3, -2.6);
		ctx.quadraticCurveTo(7.4, -5.2, 12, -4.2);
		ctx.moveTo(2.8, 1);
		ctx.quadraticCurveTo(6.4, -0.6, 10, -0.6);
		ctx.moveTo(2.6, 4);
		ctx.quadraticCurveTo(5, 2.8, 7.4, 2.8);
		ctx.strokeStyle = risco;
		ctx.lineWidth = 0.6;
		ctx.stroke();
		ctx.restore();
	}
}

// ==================================================================== cauda

/** Cauda fina de pele com ponta de seta. De frente sai atrás, de costas cai sobre a calça. */
function cauda(ctx: C, q: Quadro, deFrente: boolean) {
	const balanca = Math.sin(q.t * 3) * 1.2;
	const pts: [number, number][] = deFrente
		? [[-3, -15], [-11.2, -14 + balanca], [-10.2, -22.4 + balanca]]
		: [[0.3, -15.4], [7.4, -7.2 + balanca], [9.6, -14.4 + balanca]];
	faixa(ctx, pts, q.pele, 1.3);
	const [x, y] = pts[2];
	const [cx, cy] = pts[1];
	const ang = Math.atan2(y - cy, x - cx);
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(ang);
	forma(ctx, poligono(ctx, [[2.6, 0], [-0.4, -1.8], [0.4, 0], [-0.4, 1.8]]), q.pele, 0.8);
	ctx.restore();
}

// ===================================================================== atrás

/**
 * Antes de tudo, no referencial do quadril: aura (sempre) e, de frente, a
 * capa, as asas e a cauda, que ficam atrás do corpo.
 */
export function atras(ctx: C, q: Quadro): void {
	if (!q.a.detalhes.length) return;
	const g = plano(q).g;
	if (temDetalhe(q, 'aura')) aura(ctx, q);
	if (!q.deFrente) return;
	if (temDetalhe(q, 'capa')) capaDeFrente(ctx, q, g);
	if (temDetalhe(q, 'asas')) asas(ctx, q, g);
	if (temDetalhe(q, 'cauda')) cauda(ctx, q, true);
	if (temDetalhe(q, 'rabo')) rabo(ctx, q, true);
	if (temDetalhe(q, 'espada')) bainhaAtras(ctx, q, g);
}

/** Brilho suave em volta do corpo, pulsando (o único gradiente do boneco). */
function aura(ctx: C, q: Quadro) {
	// Violeta mágico; roupa clara e colorida empresta a própria cor
	const base = luzDe(q.roupa) > 150 ? q.roupa : '#a57cff';
	const alfa = 0.22 + Math.sin(q.t * 2.4) * 0.08;
	ctx.save();
	ctx.translate(0, -25);
	ctx.scale(0.62, 1);
	const gr = ctx.createRadialGradient(0, 0, 4, 0, 0, 27);
	gr.addColorStop(0, rgba(base, alfa));
	gr.addColorStop(0.7, rgba(base, alfa * 0.6));
	gr.addColorStop(1, rgba(base, 0));
	ctx.fillStyle = gr;
	ctx.beginPath();
	ctx.arc(0, 0, 27, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
	// Três faíscas girando em volta (atrás do corpo, somem quando passam por trás)
	for (let i = 0; i < 3; i++) {
		const ang = q.t * 0.9 + i * 2.1;
		ctx.globalAlpha = 0.45 + Math.sin(q.t * 3.1 + i * 2) * 0.35;
		estrela(ctx, Math.sin(ang) * 11.5, -27 + Math.cos(ang * 1.3) * 13, 1.3, '#efe4ff');
	}
	ctx.globalAlpha = 1;
}

// ===================================================================== braço

type Manga =
	| 'longa'
	| 'curta'
	| 'nenhuma'
	| 'dobrada'
	| 'ampla'
	| 'amplaLonga'
	| 'canelada'
	| 'larga'
	| 'cano'
	| 'bufante'
	// Segunda rodada
	| 'bufanteLonga'
	| 'gomos'
	| 'haori';

type DesenhoManga = {
	tipo: Manga;
	cor: string;
	punho?: string;
	faixa?: string;
	/** Estampa da manga (xadrez, listras, tricô, camuflado). */
	estampa?: 'xadrez' | 'listras' | 'trico' | 'camuflado';
	/** Tira com fivela perto do punho (trench curto). */
	tira?: boolean;
	/** Punho de pelúcia (casacão). */
	pelucia?: boolean;
};

/** Mangas que cobrem o braço inteiro (o antebraço não aparece). */
const MANGA_INTEIRA = new Set<Manga>(['longa', 'canelada', 'larga', 'cano', 'amplaLonga', 'bufanteLonga', 'gomos', 'haori']);

/** A manga de cada roupa (nova ou original) e a cor dela. */
function mangaDe(q: Quadro, p: Plano): DesenhoManga {
	const r = q.a.roupa;
	const cor = q.roupa;
	switch (r) {
		// Segunda rodada
		case 'vestidoEnvelope':
			return { tipo: 'nenhuma', cor };
		case 'blusaEnvelope':
			return { tipo: 'bufanteLonga', cor, punho: tom(cor, 0.9) };
		case 'trenchCurto':
			return { tipo: 'longa', cor, punho: tom(cor, 0.86), tira: true };
		case 'casacoLongo':
			return { tipo: 'longa', cor, punho: tom(cor, 0.9) };
		case 'camisaCurta':
			return { tipo: 'curta', cor, punho: escura(cor) ? tom(cor, 1.25) : tom(cor, 0.92) };
		case 'xadrezAberta':
			return { tipo: 'dobrada', cor, estampa: 'xadrez' };
		case 'camisaListrada':
			return { tipo: 'curta', cor, estampa: 'listras' };
		case 'jaquetaCapuz':
			return { tipo: 'canelada', cor, punho: ribanaDe(cor) };
		case 'jaquetaPelucia':
			return { tipo: 'longa', cor, punho: tom(cor, 0.86) };
		case 'puffer':
			return { tipo: 'gomos', cor, punho: ribanaDe(cor) };
		case 'casacoPele':
			return { tipo: 'longa', cor, punho: PELUCIA, pelucia: true };
		case 'cardiga':
			return { tipo: 'canelada', cor, punho: tom(cor, 0.86) };
		case 'colete':
			return { tipo: 'longa', cor: CAMISA_CLARA, punho: tom(CAMISA_CLARA, 0.92) };
		case 'trico':
			return { tipo: 'canelada', cor, punho: tom(cor, 0.88), estampa: 'trico' };
		case 'camisaFutebol':
			return { tipo: 'curta', cor, punho: extraOu(q, '#1c2534') };
		case 'camuflado':
			return { tipo: 'longa', cor, punho: tom(cor, 0.86), estampa: 'camuflado' };
		case 'haori':
			return { tipo: 'haori', cor };
		// Primeira rodada e originais
		case 'ternoColete':
		case 'smoking':
			return { tipo: 'longa', cor, punho: '#f4f1eb' };
		case 'sobretudo':
			return { tipo: 'longa', cor, punho: dobra(cor) };
		case 'trench':
			return { tipo: 'longa', cor, punho: tom(cor, 0.85) };
		case 'camisaDobrada':
			return { tipo: 'dobrada', cor };
		case 'blusaAmpla':
			return { tipo: 'ampla', cor };
		case 'jaleco':
			return { tipo: 'longa', cor, punho: tom(cor, 0.9) };
		case 'sueter':
			return { tipo: 'canelada', cor, punho: tom(cor, 0.86) };
		case 'bomber':
			return { tipo: 'canelada', cor, punho: escura(cor) ? tom(cor, 1.28) : tom(cor, 0.8), faixa: extraOu(q, '#d93a3a') };
		case 'jaquetaCurta':
			return { tipo: 'longa', cor, punho: tom(cor, 0.86) };
		case 'regata':
		case 'top':
		case 'semCamisa':
		case 'vestido':
			if (r === 'vestido' && q.feminino) return { tipo: 'bufante', cor };
			return { tipo: 'nenhuma', cor };
		case 'macacao':
			return { tipo: 'longa', cor, faixa: extraOu(q, '#ff6f00') };
		case 'uniformeHeroi':
			return { tipo: 'longa', cor, punho: extraOu(q, '#f2c230') };
		case 'quimono':
			return { tipo: 'larga', cor };
		case 'tunica':
			return { tipo: 'amplaLonga', cor };
		case 'robo':
			return { tipo: 'cano', cor };
		case 'camiseta':
		case 'polo':
			return { tipo: 'curta', cor };
		case 'jeans':
			if (!q.feminino && (p.porte === 'gigante' || p.porte === 'forte')) return { tipo: 'dobrada', cor: DENIM };
			return { tipo: 'longa', cor: DENIM };
		default:
			return { tipo: 'longa', cor };
	}
}

/**
 * Um braço, com o contexto já no ombro e girado (ombro em 0,0; a mão em
 * 0, q.m.braco). true = desenhei; senão sai o braço padrão.
 */
export function braco(ctx: C, q: Quadro, lado: -1 | 1): boolean {
	const p = plano(q);
	if (!p.braco) return false;
	// Braços cruzados: os dois saem juntos em naMao('frente'), por cima do peito
	if (q.a.naMao === 'bracosCruzados') return true;
	// Braço de trás abre em volta da barriga ou do músculo (o da frente abre por
	// medidas().anguloMao, para o item na mão acompanhar a mão)
	if (lado === -1 && p.g.abre) {
		ctx.save();
		ctx.rotate(p.g.abre);
		desenharBraco(ctx, q, p, lado);
		ctx.restore();
	} else desenharBraco(ctx, q, p, lado);
	return true;
}

function desenharBraco(ctx: C, q: Quadro, p: Plano, lado: -1 | 1) {
	const g = p.g;
	const L = q.m.braco;
	const w = g.bracoL;
	const fim = L - 0.2;
	const m = mangaDe(q, p);
	const pele = q.pele;
	const nu = () => forma(ctx, capsula(ctx, 0, 0, fim, w * 0.9), pele);
	switch (m.tipo) {
		case 'nenhuma':
			if (p.porte === 'gigante' || p.porte === 'forte') {
				// Bíceps marcado no braço de fora
				forma(ctx, capsula(ctx, 0, 0, fim, w * 0.88), pele);
				forma(ctx, oval(ctx, 0, L * 0.3, w * 0.56, L * 0.28), pele);
			} else nu();
			break;
		case 'curta': {
			nu();
			const s = capsula(ctx, 0, -0.2, 5.6, w + 0.2);
			forma(ctx, s, m.cor);
			if (m.estampa) estampaNaManga(ctx, s, m, w, 5.6);
			if (m.punho) forma(ctx, caixa(ctx, -w / 2 - 0.2, 4.2, w + 0.4, 1.5, 0.6), m.punho, 0.55);
			break;
		}
		case 'bufante':
			forma(ctx, capsula(ctx, 0, 0, fim, w * 0.84), pele);
			forma(ctx, oval(ctx, 0, 1.4, w * 0.74, 2.5), m.cor);
			break;
		case 'dobrada': {
			nu();
			const s = capsula(ctx, 0, -0.2, 6.6, w + 0.1);
			forma(ctx, s, m.cor);
			if (m.estampa) estampaNaManga(ctx, s, m, w, 6.6);
			sombraDireita(ctx, s, w * 0.2);
			forma(ctx, caixa(ctx, -w / 2 - 0.3, 5.2, w + 0.6, 1.9, 0.8), tom(m.cor, 1.1), 0.6);
			break;
		}
		case 'bufanteLonga': {
			// Manga longa bufante, cheia embaixo, presa num punho (ref. 38)
			const s = () => {
				ctx.moveTo(-w / 2, 1);
				ctx.quadraticCurveTo(-w / 2, -1, 0, -1);
				ctx.quadraticCurveTo(w / 2, -1, w / 2, 1);
				ctx.quadraticCurveTo(w / 2 + 1.7, L * 0.62, w / 2 + 0.1, fim - 1.8);
				ctx.lineTo(-w / 2 - 0.1, fim - 1.8);
				ctx.quadraticCurveTo(-w / 2 - 1.5, L * 0.62, -w / 2, 1);
				ctx.closePath();
			};
			forma(ctx, s, m.cor);
			sombraDireita(ctx, s, w * 0.25);
			traco(ctx, -w * 0.2, L * 0.45, -w * 0.05, fim - 2.4, tom(m.cor, 0.8), 0.45);
			forma(ctx, caixa(ctx, -w / 2 + 0.1, fim - 2.4, w - 0.2, 1.6, 0.5), m.punho ?? tom(m.cor, 0.9), 0.55);
			break;
		}
		case 'gomos': {
			// Manga acolchoada, mais gorda, em gomos (ref. 42)
			const s = capsula(ctx, 0, 0, fim, w * 1.16);
			forma(ctx, s, m.cor);
			sombraDireita(ctx, s, w * 0.2);
			const linha = luzDe(m.cor) < 80 ? tom(m.cor, 1.35) : tom(m.cor, 0.7);
			for (const y of [L * 0.3, L * 0.58]) traco(ctx, -w * 0.56, y, w * 0.56, y + 0.4, linha, 0.55);
			traco(ctx, -w * 0.3, L * 0.08, -w * 0.3, L * 0.22, 'rgba(255,255,255,0.22)', 0.8);
			forma(ctx, caixa(ctx, -w / 2 + 0.1, fim - 2.4, w - 0.2, 1.8, 0.6), m.punho ?? tom(m.cor, 0.8), 0.55);
			break;
		}
		case 'haori': {
			// Manga larga e quadrada que cai abaixo do pulso, com placas no ombro (ref. 32)
			const s = () => {
				ctx.moveTo(-w / 2 - 0.2, 0.6);
				ctx.quadraticCurveTo(-w / 2, -1, 0.3, -1);
				ctx.quadraticCurveTo(w / 2 + 0.8, -1, w / 2 + 1.2, 1.4);
				ctx.lineTo(w / 2 + 2.6, L + 0.8);
				ctx.quadraticCurveTo(0, L + 2.2, -w / 2 - 1.6, L + 1.6);
				ctx.closePath();
			};
			forma(ctx, s, m.cor);
			sombraDireita(ctx, s, w * 0.3);
			dentroDe(ctx, s, () => {
				ctx.fillStyle = QUIMONO_ESCURO;
				ctx.fillRect(-w, L - 0.4, w * 2.4, 1.3);
			});
			traco(ctx, -w / 2 - 1.2, L - 0.6, w / 2 + 2.2, L - 0.8, golaDoHaori(m.cor), 0.7);
			const placa = tom(m.cor, 0.62);
			for (let i = 0; i < 3; i++) {
				const y = 0.4 + i * 1.7;
				forma(ctx, caixa(ctx, -w / 2 - 0.5, y, w + 1.2, 1.5, 0.5), placa, 0.5);
				ponto(ctx, 0.3, y + 0.75, 0.3, tom(placa, 1.6));
			}
			break;
		}
		case 'ampla': {
			nu();
			const s = () => {
				ctx.moveTo(-w / 2, 1);
				ctx.quadraticCurveTo(-w / 2, -1, 0, -1);
				ctx.quadraticCurveTo(w / 2, -1, w / 2 + 0.2, 1);
				ctx.lineTo(w / 2 + 2.4, 7.6);
				ctx.quadraticCurveTo(0.3, 8.8, -w / 2 - 1.6, 7.4);
				ctx.closePath();
			};
			forma(ctx, s, m.cor);
			sombraDireita(ctx, s, w * 0.3);
			break;
		}
		case 'amplaLonga': {
			const s = () => {
				ctx.moveTo(-w / 2, 1);
				ctx.quadraticCurveTo(-w / 2, -1, 0, -1);
				ctx.quadraticCurveTo(w / 2, -1, w / 2 + 0.2, 1);
				ctx.lineTo(w / 2 + 2, L - 1);
				ctx.quadraticCurveTo(0.3, L + 0.6, -w / 2 - 1.6, L - 1.2);
				ctx.closePath();
			};
			forma(ctx, s, m.cor);
			sombraDireita(ctx, s, w * 0.3);
			traco(ctx, -w / 2 - 1.2, L - 1.9, w / 2 + 1.6, L - 1.7, DOURADO, 0.6);
			break;
		}
		case 'larga': {
			const s = poligono(ctx, [[-w / 2, 0], [w / 2, 0], [w / 2 + 0.9, fim - 0.6], [-w / 2 - 0.7, fim - 0.6]]);
			forma(ctx, s, m.cor);
			sombraDireita(ctx, s, w * 0.25);
			break;
		}
		case 'cano': {
			const metal = m.cor;
			forma(ctx, capsula(ctx, 0, 0, fim, w * 0.72), tom(metal, 0.86));
			for (const y of [L * 0.42, L * 0.72]) forma(ctx, caixa(ctx, -w * 0.48, y, w * 0.96, 1.4, 0.5), metal, 0.6);
			forma(ctx, oval(ctx, 0, 0.8, w * 0.62, w * 0.62), metal, 0.8);
			ponto(ctx, -w * 0.18, 0.4, 0.5, 'rgba(255,255,255,0.6)');
			break;
		}
		default: {
			// Longa (e canelada: longa com punho de ribana)
			const s = capsula(ctx, 0, 0, fim, w);
			forma(ctx, s, m.cor);
			if (m.estampa) estampaNaManga(ctx, s, m, w, fim);
			sombraDireita(ctx, s, w * 0.18);
			if (m.faixa) forma(ctx, caixa(ctx, -w / 2 + 0.3, 1.4, 1.2, fim - 4.4, 0.4), m.faixa, 0.4);
			if (m.tira) {
				forma(ctx, caixa(ctx, -w / 2 - 0.3, fim - 4, w + 0.6, 1.1, 0.4), tom(m.cor, 0.84), 0.5);
				ponto(ctx, w * 0.15, fim - 3.45, 0.38, '#9aa0aa');
			}
			if (m.pelucia) {
				forma(ctx, caixa(ctx, -w / 2 - 0.8, fim - 3.4, w + 1.6, 2.8, 1.2), PELUCIA, 0.6);
				felpa(ctx, [[-w / 2 - 0.5, fim - 0.8], [0, fim - 0.5], [w / 2 + 0.5, fim - 0.8]], 0.6);
			} else if (m.punho) {
				const alt = m.tipo === 'canelada' ? 1.9 : 1.2;
				forma(ctx, caixa(ctx, -w / 2 - 0.1, fim - alt - 0.6, w + 0.2, alt, 0.5), m.punho, 0.55);
			}
		}
	}
	// Antebraço à mostra: as listras do tigre e a tatuagem
	if (!MANGA_INTEIRA.has(m.tipo)) {
		if (q.bicho?.id === 'tigre') listrasNoBraco(ctx, w, L, q.bicho.escuro, 0.75);
		if (temDetalhe(q, 'tatuagem')) tatuagem(ctx, w, L);
	}
	const luvas = temDetalhe(q, 'luvas');
	if (!luvas && q.bicho) pata(ctx, q, 0, L, g.mao);
	else forma(ctx, oval(ctx, 0, L, g.mao, g.mao), luvas ? '#2b2e36' : pele);
	if (luvas) traco(ctx, -g.mao * 0.6, L - g.mao * 0.9, g.mao * 0.6, L - g.mao * 0.9, '#4a505b', 0.6);
	const pulso = L - g.mao - 0.4;
	if (temDetalhe(q, 'pulseiras')) pulseiras(ctx, q, p, w, pulso);
	if (lado === 1 && temDetalhe(q, 'relogio')) {
		forma(ctx, caixa(ctx, -w / 2 - 0.2, pulso - 1.2, w + 0.4, 1.3, 0.4), '#2a2d35', 0.5);
		forma(ctx, oval(ctx, 0.2, pulso - 0.55, 0.95, 0.95), '#e8ecf2', 0.5);
	}
}

/** Pulseiras: munhequeira larga (forte e gigante), argolas douradas (dela), couro (dele). */
function pulseiras(ctx: C, q: Quadro, p: Plano, w: number, pulso: number) {
	if (p.porte === 'forte' || p.porte === 'gigante') {
		const cor = extraOu(q, '#1f2230');
		forma(ctx, caixa(ctx, -w / 2 - 0.4, pulso - 4.2, w + 0.8, 4.4, 0.6), cor, 0.7);
		for (const y of [pulso - 4.2, pulso - 0.6]) forma(ctx, caixa(ctx, -w / 2 - 0.5, y, w + 1, 0.9, 0.4), DOURADO, 0.45);
		return;
	}
	if (q.feminino) {
		for (const y of [pulso - 1.8, pulso - 0.6]) forma(ctx, caixa(ctx, -w / 2 - 0.3, y, w + 0.6, 0.8, 0.4), DOURADO, 0.4);
		return;
	}
	forma(ctx, caixa(ctx, -w / 2 - 0.3, pulso - 1.6, w + 0.6, 1.5, 0.5), '#2a2420', 0.5);
	ponto(ctx, 0, pulso - 0.85, 0.3, '#c9ced6');
}

/** Estampa da manga (xadrez, listras, tranças do tricô, camuflado), recortada nela. */
function estampaNaManga(ctx: C, s: () => void, m: DesenhoManga, w: number, fim: number) {
	dentroDe(ctx, s, () => {
		switch (m.estampa) {
			case 'xadrez':
				xadrezEm(ctx, m.cor, -w, -1, w, fim, 2.6, 0.9);
				break;
			case 'listras': {
				const cor = luzDe(m.cor) > 150 ? 'rgba(255,255,255,0.85)' : tom(m.cor, 1.45);
				for (let x = -w * 0.5 + 0.6; x < w * 0.6; x += 1.8) traco(ctx, x, -1, x, fim, cor, 0.45);
				break;
			}
			case 'trico':
				ctx.beginPath();
				for (let y = 2; y < fim - 2.6; y += 1.7) {
					ctx.moveTo(-0.8, y);
					ctx.lineTo(0, y + 0.8);
					ctx.lineTo(0.8, y);
				}
				ctx.strokeStyle = tom(m.cor, 0.78);
				ctx.lineWidth = 0.5;
				ctx.stroke();
				break;
			case 'camuflado':
				camuflar(ctx, m.cor, -w, 0, w * 2, fim, 0.8);
				break;
		}
	});
}

/** Listras escuras do tigre no antebraço à mostra (ref. 33). */
function listrasNoBraco(ctx: C, w: number, L: number, cor: string, lw: number) {
	for (const f of [0.5, 0.64, 0.78]) {
		const y = L * f;
		riscar(ctx, () => {
			ctx.moveTo(-w * 0.48, y);
			ctx.quadraticCurveTo(-w * 0.1, y + 0.2, w * 0.15, y + 0.9);
		}, cor, lw);
	}
}

/** Tatuagem: traços escuros finos e abstratos no antebraço (nada de desenho reconhecível) (ref. 24). */
function tatuagem(ctx: C, w: number, L: number) {
	ctx.save();
	ctx.globalAlpha = 0.5;
	riscar(ctx, () => {
		ctx.moveTo(-w * 0.35, L * 0.52);
		ctx.quadraticCurveTo(w * 0.1, L * 0.56, -w * 0.05, L * 0.64);
		ctx.quadraticCurveTo(-w * 0.3, L * 0.7, w * 0.2, L * 0.76);
		ctx.moveTo(-w * 0.3, L * 0.81);
		ctx.lineTo(w * 0.25, L * 0.84);
	}, '#1f2a3a', 0.55);
	ctx.restore();
}

/** Mão de bicho: pata um pouco maior na cor q.bicho.mao, com três risquinhos de dedo (para +y). */
function pata(ctx: C, q: Quadro, x: number, y: number, r: number) {
	const b = q.bicho;
	if (!b) return;
	forma(ctx, oval(ctx, x, y, r * 1.1, r * 1.06), b.mao);
	const risco = luzDe(b.mao) < 70 ? tom(b.mao, 1.6) : tom(b.mao, 0.62);
	for (const dx of [-0.5, 0, 0.5]) traco(ctx, x + dx * r, y + r * 0.35, x + dx * r * 1.1, y + r * 0.85, risco, 0.45);
}

// ===================================================================== pernas

/** Largura da perna de cada parte de baixo (calça reta = g.pernaL). */
function largura(p: Plano) {
	const g = p.g;
	switch (p.baixo) {
		case 'legging':
			return g.pernaL * 0.82;
		case 'robo':
			return g.pernaL * 0.78;
		case 'cargo':
		case 'camuflado':
			return g.pernaL * 1.16;
		case 'quimono':
			return g.pernaL * 1.18;
		case 'calcaMoletom':
			return g.pernaL * 1.2;
		case 'calcaLarga':
			return g.pernaL * 1.18;
		case 'jardineira':
			return g.pernaL * 1.12;
		case 'hakama':
			return g.pernaL * 1.26;
		default:
			return g.pernaL;
	}
}

/**
 * Pernas e pés (em pé, andando e sentado: as canelas). true = desenhei.
 */
export function pernas(ctx: C, q: Quadro): boolean {
	const p = plano(q);
	if (!p.pernas) return false;
	if (q.sentado) canelas(ctx, q, p);
	else emPe(ctx, q, p);
	return true;
}

function emPe(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const { passo, sobe, pe } = q.passada;
	const amp = q.feminino ? 2.2 : 2.4;
	const fundo = q.feminino ? -1.8 : -2.4;
	const lista: [number, number][] = [
		[-g.pernaX + passo * amp, Math.max(0, passo) * pe],
		[g.pernaX - passo * amp, Math.max(0, -passo) * pe]
	];
	for (const [px, ergue] of lista) perna(ctx, q, p, px, g.quadril - sobe, -ergue, fundo);
}

/** Uma perna em pé: do quadril (`topo`) ao pé (`chao`, 0 ou negativo erguendo). */
function perna(ctx: C, q: Quadro, p: Plano, px: number, topo: number, chao: number, fundo: number) {
	const g = p.g;
	const cor = p.corPerna;
	const w = largura(p);
	const pele = q.pele;
	switch (p.baixo) {
		case 'pantalona': {
			q.sapato(px, chao);
			const baixo = chao - 0.8;
			const b = w * 0.86;
			const c = () => {
				ctx.moveTo(px - w * 0.52, topo);
				ctx.lineTo(px + w * 0.52, topo);
				ctx.lineTo(px + b + 0.2, baixo);
				ctx.quadraticCurveTo(px, baixo + 0.6, px - b, baixo);
				ctx.closePath();
			};
			forma(ctx, c, cor);
			sombraDireita(ctx, c, px + w * 0.25);
			traco(ctx, px + 0.2, topo + 3, px + 0.3, baixo - 0.6, tom(cor, 0.82), 0.5);
			if (cor === JEANS || cor === '#3d5a80') traco(ctx, px - b + 0.4, baixo - 1, px + b - 0.2, baixo - 1, '#8aa6d2', 0.55);
			return;
		}
		case 'bufante': {
			q.sapato(px, chao);
			const meio = topo + (chao - 6 - topo) * 0.6;
			const largo = w * 1.12 + 0.6;
			const c = () => {
				ctx.moveTo(px - w * 0.5, topo);
				ctx.lineTo(px + w * 0.5, topo);
				ctx.quadraticCurveTo(px + largo + 0.6, meio, px + w * 0.42, chao - 6.6);
				ctx.lineTo(px - w * 0.42, chao - 6.6);
				ctx.quadraticCurveTo(px - largo - 0.6, meio, px - w * 0.5, topo);
				ctx.closePath();
			};
			forma(ctx, c, cor);
			sombraDireita(ctx, c, px + w * 0.3);
			traco(ctx, px - w * 0.3, meio - 2, px - w * 0.6, meio + 2, tom(cor, 0.8), 0.55);
			traco(ctx, px + w * 0.2, meio - 1, px + w * 0.5, meio + 3, tom(cor, 0.8), 0.55);
			forma(ctx, caixa(ctx, px - w * 0.46, chao - 7.4, w * 0.92, 1.8, 0.7), tom(cor, 0.86), 0.6);
			return;
		}
		case 'quimono': {
			const c = poligono(ctx, [[px - w * 0.5, topo], [px + w * 0.5, topo], [px + w * 0.58, chao - 3.4], [px - w * 0.58, chao - 3.4]]);
			forma(ctx, c, cor);
			sombraDireita(ctx, c, px + w * 0.2);
			forma(ctx, caixa(ctx, px - w * 0.4, chao - 4.6, w * 0.8, 2.6, 0.6), tom(cor, escura(cor) ? 1.25 : 0.7), 0.55);
			q.sapato(px, chao);
			return;
		}
		case 'calcaLarga':
		case 'hakama': {
			// Calça larga reta até o chão, quase cobrindo o tênis, com a barra dobrada (refs. 39 a 41);
			// hakama: plissada e bem aberta embaixo, o tornozelo aparece (ref. 32)
			const hakama = p.baixo === 'hakama';
			if (!hakama) q.sapato(px, chao);
			const baixo = chao - (hakama ? 2 : 0.9);
			const b = w * (hakama ? 0.86 : 0.58);
			const t = w * 0.5;
			const c = () => {
				ctx.moveTo(px - t, topo);
				ctx.lineTo(px + t, topo);
				ctx.lineTo(px + b + 0.2, baixo);
				ctx.quadraticCurveTo(px, baixo + 0.5, px - b, baixo);
				ctx.closePath();
			};
			forma(ctx, c, cor);
			sombraDireita(ctx, c, px + w * 0.22);
			if (hakama) {
				const prega = escura(cor) ? tom(cor, 1.45) : tom(cor, 0.72);
				traco(ctx, px - b * 0.3, topo + 3.4, px - b * 0.5, baixo - 0.4, prega, 0.5);
				traco(ctx, px + b * 0.25, topo + 3.4, px + b * 0.45, baixo - 0.4, prega, 0.5);
				q.sapato(px, chao);
			} else {
				forma(ctx, caixa(ctx, px - b - 0.1, baixo - 1.9, b * 2 + 0.4, 1.9, 0.5), escura(cor) ? tom(cor, 1.25) : tom(cor, 1.1), 0.55);
				traco(ctx, px + 0.2, topo + 3, px + 0.4, baixo - 2.4, tom(cor, 0.82), 0.5);
			}
			return;
		}
		case 'calcaMoletom':
		case 'jardineira': {
			// Larga e caída, presa num punho no tornozelo (moletom, ref. 24) ou de barra
			// dobrada mostrando o forro (jardineira, ref. 53)
			const jardineira = p.baixo === 'jardineira';
			const fim = chao - (jardineira ? 2.6 : 2.2);
			const meio = topo + (fim - topo) * 0.5;
			const largo = w * 0.58;
			const c = () => {
				ctx.moveTo(px - w * 0.5, topo);
				ctx.lineTo(px + w * 0.5, topo);
				ctx.quadraticCurveTo(px + largo + 0.4, meio, px + w * 0.42, fim);
				ctx.lineTo(px - w * 0.42, fim);
				ctx.quadraticCurveTo(px - largo - 0.4, meio, px - w * 0.5, topo);
				ctx.closePath();
			};
			forma(ctx, c, cor);
			sombraDireita(ctx, c, px + w * 0.2);
			traco(ctx, px - w * 0.18, meio - 1.6, px - w * 0.34, meio + 1.8, tom(cor, escura(cor) ? 1.35 : 0.8), 0.5);
			const punho = jardineira ? '#b9b4a6' : escura(cor) ? tom(cor, 1.25) : tom(cor, 0.84);
			forma(ctx, caixa(ctx, px - w * 0.46, fim - 0.8, w * 0.92, 2.1, 0.7), punho, 0.6);
			q.sapato(px, chao);
			return;
		}
		case 'tunica':
		case 'saiaLonga':
		case 'saiaFlorida': {
			// A barra cobre a perna; só o pé (e o tornozelo) aparece
			forma(ctx, capsula(ctx, px, chao - 7, chao + fundo, g.pernaPele * 0.9), p.baixo === 'tunica' ? tom(q.roupa, 0.7) : pele);
			q.sapato(px, chao);
			return;
		}
		case 'bermuda':
		case 'bermudaRasgada':
		case 'lapis':
		case 'evase':
		case 'rodada':
		case 'saiaMidi':
		case 'saiaEnvelope':
		case 'calcao':
		case 'pele': {
			const nua = capsula(ctx, px, topo, chao + fundo, g.pernaPele);
			forma(ctx, nua, pele);
			if (p.porte !== 'padrao') sombraDireita(ctx, nua, px + g.pernaPele * 0.25, 'rgba(120, 60, 30, 0.12)');
			q.sapato(px, chao);
			if (p.baixo === 'calcao') {
				// Calção curto de futebol, acima do joelho, com faixa lateral na cor de destaque (ref. 51)
				const fimC = q.feminino ? -11.6 : -10.8;
				const s = caixa(ctx, px - w * 0.6, topo, w * 1.2, fimC - topo, [w * 0.5, w * 0.5, 0.6, 0.6]);
				forma(ctx, s, cor);
				sombraDireita(ctx, s, px + w * 0.2);
				const fora = px < 0 ? -1 : 1;
				// A faixa precisa aparecer: na mesma cor do calção, sai branca
				const extra = extraOu(q, '#1c2534');
				const faixaCor = Math.abs(luzDe(extra) - luzDe(cor)) < 40 ? '#f6f6f2' : extra;
				forma(ctx, caixa(ctx, px + fora * (w * 0.6 - 0.6) - 0.5, topo + 1.4, 1, fimC - topo - 1.8, 0.3), faixaCor, 0.35);
			} else if (p.baixo === 'bermuda') {
				const s = caixa(ctx, px - w * 0.56, topo, w * 1.12, -8.6 - topo, [w * 0.5, w * 0.5, 0.8, 0.8]);
				forma(ctx, s, cor);
				sombraDireita(ctx, s, px + w * 0.2);
				traco(ctx, px - w * 0.5, -9.8, px + w * 0.5, -9.8, tom(cor, escura(cor) ? 1.4 : 0.78), 0.5);
			} else if (p.baixo === 'bermudaRasgada') {
				const fim = -7.8;
				const meia = w * 0.6;
				const c = () => {
					ctx.moveTo(px - meia, topo + 1);
					ctx.quadraticCurveTo(px - meia, topo - 0.4, px, topo - 0.4);
					ctx.quadraticCurveTo(px + meia, topo - 0.4, px + meia, topo + 1);
					ctx.lineTo(px + meia + 0.3, fim);
					const n = 4;
					for (let i = 1; i <= n; i++) {
						const x = px + meia + 0.3 - ((meia * 2 + 0.6) * i) / n;
						ctx.lineTo(x + (meia * 2 + 0.6) / n / 2, fim + (i % 2 ? 1.6 : 0.8));
						ctx.lineTo(x, fim + (i % 2 ? 0 : 0.4));
					}
					ctx.closePath();
				};
				forma(ctx, c, cor);
				sombraDireita(ctx, c, px + meia * 0.3);
			}
			return;
		}
		default: {
			// Calça reta, legging, cargo (e a camuflada da farda), jeans rasgado, macacão e perna de robô
			const cargo = p.baixo === 'cargo' || p.baixo === 'camuflado';
			const fim = cargo ? chao - 3.6 : chao + fundo;
			const c = capsula(ctx, px, topo, fim, w);
			forma(ctx, c, cor);
			if (p.baixo === 'camuflado') dentroDe(ctx, c, () => camuflar(ctx, cor, px - w, topo, w * 2, fim - topo, 0.85));
			sombraDireita(ctx, c, px + w * 0.17);
			if (p.baixo === 'jeansRasgado') rasgos(ctx, q, px, topo, fim, w, cor);
			if (cargo) {
				forma(ctx, caixa(ctx, px - w * 0.44, chao - 5.2, w * 0.88, 2.2, 0.8), tom(cor, escura(cor) ? 1.2 : 0.86), 0.6);
				const fora = px < 0 ? -1 : 1;
				const x = fora < 0 ? px - w * 0.56 : px + w * 0.08;
				const y = topo + (fim - topo) * 0.42;
				forma(ctx, caixa(ctx, x, y, w * 0.48, 3.4, 0.4), tom(cor, escura(cor) ? 1.18 : 0.9), 0.5);
				traco(ctx, x, y + 1, x + w * 0.48, y + 1, tom(cor, escura(cor) ? 1.4 : 0.72), 0.45);
			} else if (p.baixo === 'macacao') {
				const fora = px < 0 ? -1 : 1;
				forma(ctx, caixa(ctx, px + fora * (w * 0.5 - 1) - 0.55, topo + 3, 1.1, fim - topo - 4, 0.4), extraOu(q, '#ff6f00'), 0.4);
			} else if (p.baixo === 'robo') {
				const joelho = topo + (fim - topo) * 0.5;
				forma(ctx, caixa(ctx, px - w * 0.62, joelho - 0.8, w * 1.24, 1.8, 0.6), tom(cor, 1.15), 0.6);
				traco(ctx, px - w * 0.18, topo + 2, px - w * 0.18, joelho - 1.4, 'rgba(255,255,255,0.4)', 0.6);
			} else if (cor === JEANS && q.feminino) traco(ctx, px - 1.7, chao - 3.9, px + 1.7, chao - 3.9, '#8aa6d2', 0.7);
			q.sapato(px, chao);
		}
	}
}

/** Sentado: as canelas descem do joelho (na beira do sofá) até o pé, no chão. */
function canelas(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const xs = q.feminino ? [-g.pernaX, g.pernaX] : [-g.pernaX * 0.9, g.pernaX * 0.9];
	const fator = q.feminino ? 3.6 / 4.2 : 4.6 / 5.2;
	const w = g.pernaL * fator;
	const cor = p.corPerna;
	for (const px of xs) {
		switch (p.baixo) {
			case 'pantalona': {
				q.sapato(px, 0);
				const c = poligono(ctx, [[px - w * 0.55, -13.4], [px + w * 0.55, -13.4], [px + w * 0.95, -0.8], [px - w * 0.95, -0.8]]);
				forma(ctx, c, cor);
				sombraDireita(ctx, c, px + w * 0.25);
				break;
			}
			case 'bufante': {
				q.sapato(px, 0);
				forma(ctx, oval(ctx, px, -10.4, w * 0.95, 3.6), cor);
				forma(ctx, caixa(ctx, px - w * 0.5, -8.2, w, 1.6, 0.6), tom(cor, 0.86), 0.6);
				break;
			}
			case 'calcaLarga':
			case 'hakama': {
				const hakama = p.baixo === 'hakama';
				if (!hakama) q.sapato(px, 0);
				const fim = hakama ? -2 : -0.9;
				const c = poligono(ctx, [[px - w * 0.6, -13.4], [px + w * 0.6, -13.4], [px + w * (hakama ? 1.05 : 0.8), fim], [px - w * (hakama ? 1.05 : 0.8), fim]]);
				forma(ctx, c, cor);
				sombraDireita(ctx, c, px + w * 0.25);
				if (hakama) q.sapato(px, 0);
				else forma(ctx, caixa(ctx, px - w * 0.85, fim - 1.8, w * 1.7, 1.8, 0.5), escura(cor) ? tom(cor, 1.25) : tom(cor, 1.1), 0.55);
				break;
			}
			case 'calcaMoletom':
			case 'jardineira': {
				const larg = w * 1.18;
				const c = capsula(ctx, px, -13.4, -1.6, larg);
				forma(ctx, c, cor);
				sombraDireita(ctx, c, px + 0.6);
				const punho = p.baixo === 'jardineira' ? '#b9b4a6' : escura(cor) ? tom(cor, 1.25) : tom(cor, 0.84);
				forma(ctx, caixa(ctx, px - larg * 0.5, -4.4, larg, 2.1, 0.7), punho, 0.6);
				q.sapato(px, 0);
				break;
			}
			case 'bermuda':
			case 'bermudaRasgada':
			case 'lapis':
			case 'evase':
			case 'rodada':
			case 'saiaMidi':
			case 'saiaEnvelope':
			case 'calcao':
			case 'pele':
				forma(ctx, capsula(ctx, px, -13.4, -1.8, w), q.pele);
				q.sapato(px, 0);
				break;
			default: {
				const corCanela = p.baixo === 'saiaLonga' || p.baixo === 'saiaFlorida' ? q.corBaixo : p.baixo === 'tunica' ? q.roupa : cor;
				const cargo = p.baixo === 'cargo' || p.baixo === 'camuflado';
				const larg = cargo || p.baixo === 'quimono' ? w * 1.14 : p.baixo === 'legging' ? w * 0.86 : w;
				const c = capsula(ctx, px, -13.4, -1.8, larg);
				forma(ctx, c, corCanela);
				if (p.baixo === 'camuflado') dentroDe(ctx, c, () => camuflar(ctx, cor, px - larg, -13.4, larg * 2, 11.6, 0.85));
				sombraDireita(ctx, c, px + 0.6);
				if (p.baixo === 'jeansRasgado') forma(ctx, caixa(ctx, px - larg * 0.52, -4.2, larg * 1.04, 1.8, 0.6), tom(cor, 1.12), 0.55);
				if (cargo) forma(ctx, caixa(ctx, px - larg * 0.46, -4.6, larg * 0.92, 2, 0.8), tom(cor, escura(cor) ? 1.2 : 0.86), 0.6);
				if (p.baixo === 'robo') forma(ctx, caixa(ctx, px - larg * 0.62, -12.2, larg * 1.24, 1.6, 0.6), tom(cor, 1.15), 0.6);
				q.sapato(px, 0);
			}
		}
	}
}

/**
 * Sentado e de frente: as coxas (o colo) indo do quadril até o joelho, e a
 * barra de saia, casaco ou túnica caindo na frente da canela. true = desenhei.
 */
export function colo(ctx: C, q: Quadro): boolean {
	const p = plano(q);
	if (!p.colo) return false;
	const g = p.g;
	const xs = q.feminino ? [-g.pernaX, g.pernaX] : [-g.pernaX * 0.9, g.pernaX * 0.9];
	const saia = SAIAS.has(p.baixo);
	// O casaco longo é fechado: sentado, as coxas ficam cobertas por ele
	const fechado = p.barra === 'casacoLongo';
	const cor = p.baixo === 'tunica' || fechado ? q.roupa : saia ? corDaSaia(q, p) : p.corPerna;
	const larg = g.pernaL * (q.feminino ? 4.4 / 4.2 : 5.4 / 5.2) * (COXA_LARGA.has(p.baixo) ? 1.12 : 1);
	const yQuadril = Math.min(g.quadril - 0.4, -15.6);
	if (p.barra && p.barra !== 'tunica' && !fechado) barraSentado(ctx, q, p);
	const joelhos: [number, number][] = [];
	for (const px of xs) {
		const joelho = { x: px + RECUO_SENTADO + 0.6, y: -13.2 - ABAIXA_SENTADO };
		const quadril = { x: px - 0.4, y: yQuadril };
		joelhos.push([joelho.x, joelho.y]);
		const coxa = (ate: number, largura: number) => () => {
			const fim = ate === 1 ? joelho : { x: quadril.x + (joelho.x - quadril.x) * ate, y: quadril.y + (joelho.y - quadril.y) * ate };
			const ang = Math.atan2(joelho.y - quadril.y, joelho.x - quadril.x);
			const r = largura / 2;
			ctx.arc(quadril.x, quadril.y, r, ang + Math.PI / 2, ang - Math.PI / 2);
			ctx.arc(fim.x, fim.y, r, ang - Math.PI / 2, ang + Math.PI / 2);
			ctx.closePath();
		};
		if (p.baixo === 'calcao' && !fechado) {
			// Calção curto: a coxa é de pele perto do joelho
			forma(ctx, coxa(1, larg * 0.9), q.pele);
			forma(ctx, coxa(0.62, larg * 1.08), cor);
		} else forma(ctx, coxa(1, larg), cor);
		if (p.baixo === 'bermudaRasgada')
			for (let i = 0; i < 3; i++) forma(ctx, poligono(ctx, [[joelho.x + 1.4, joelho.y - 2 + i * 1.4], [joelho.x + 2.8, joelho.y - 1.3 + i * 1.4], [joelho.x + 1.4, joelho.y - 0.6 + i * 1.4]]), cor, 0.5);
		if (p.baixo === 'jeansRasgado' && !fechado) {
			forma(ctx, oval(ctx, joelho.x - 0.4, joelho.y, larg * 0.3, 1.1, 0.3), '#eef2f6', 0.45);
			forma(ctx, oval(ctx, joelho.x - 0.4, joelho.y, larg * 0.18, 0.45, 0.3), q.pele, 0);
		}
	}
	if (!saia && p.baixo !== 'tunica' && !fechado) traco(ctx, 0.2, -16, 1.4, -13.8, tom(cor, 0.7), 0.6);
	// Barra que cai na frente da canela
	const [esq, dir] = [joelhos[0][0] - larg * 0.6, joelhos[1][0] + larg * 0.6];
	const yJ = joelhos[0][1] - larg * 0.4;
	const caiAte: Partial<Record<Baixo, number>> = {
		saiaMidi: -7.4,
		saiaLonga: -3.4,
		rodada: -10.4,
		evase: -10.6,
		lapis: -11.8,
		tunica: -2.8,
		saiaFlorida: -3.2,
		saiaEnvelope: -6.6
	};
	const ate = fechado ? -6.2 : caiAte[p.baixo];
	if (ate !== undefined) {
		const s = (x0: number, x1: number) => () => {
			ctx.moveTo(x0, yJ);
			ctx.lineTo(x1, yJ);
			ctx.lineTo(x1 + 0.8, ate);
			ctx.quadraticCurveTo((x0 + x1) / 2, ate + 0.9, x0 - 0.6, ate);
			ctx.closePath();
		};
		forma(ctx, s(esq, dir), cor);
		if (p.baixo === 'saiaFlorida' && !fechado)
			dentroDe(ctx, s(esq, dir), () => {
				for (const [fx, fy] of [[0.2, 0.3], [0.7, 0.45], [0.4, 0.75], [0.9, 0.85]] as const) florzinha(ctx, esq + (dir - esq) * fx, yJ + (ate - yJ) * fy, cor);
			});
		if (fechado) {
			traco(ctx, (esq + dir) / 2 + 0.6, yJ + 0.6, (esq + dir) / 2 + 0.9, ate - 0.4, costura(cor), 0.6);
			botao(ctx, (esq + dir) / 2 + 1.9, yJ + 1.8, 0.75);
		}
		sombraDireita(ctx, s(esq, dir), (esq + dir) / 2 + 1);
	}
	return true;
}

/** Partes de baixo largas: sentado, a coxa também é mais larga. */
const COXA_LARGA = new Set<Baixo>(['cargo', 'pantalona', 'bufante', 'camuflado', 'calcaLarga', 'hakama', 'calcaMoletom', 'jardineira']);

/** Cor da saia: a do vestido envelope é a da roupa; as outras, a cor de baixo. */
const corDaSaia = (q: Quadro, p: Plano) => (p.baixo === 'saiaEnvelope' ? q.roupa : q.corBaixo);

/** Florzinha clara da saia florida: quatro pétalas em volta de um miolo. */
function florzinha(ctx: C, x: number, y: number, cor: string) {
	const petala = tom(cor, 1.4);
	for (const [dx, dy] of [[0, -0.6], [0.6, 0], [0, 0.6], [-0.6, 0]] as const) ponto(ctx, x + dx, y + dy, 0.5, petala);
	ponto(ctx, x, y, 0.35, tom(cor, 0.75));
}

/** Jeans rasgado: rasgo claro no joelho (com a pele aparecendo), outro na coxa e a barra dobrada (ref. 18). */
function rasgos(ctx: C, q: Quadro, px: number, topo: number, fim: number, w: number, cor: string) {
	const fiapo = '#eef2f6';
	const joelho = topo + (fim - topo) * 0.56;
	forma(ctx, oval(ctx, px - w * 0.05, joelho, w * 0.34, 1.2), fiapo, 0.45);
	forma(ctx, oval(ctx, px - w * 0.05, joelho, w * 0.2, 0.45), q.pele, 0);
	if (px > 0) {
		const coxa = topo + 3.2;
		forma(ctx, oval(ctx, px + w * 0.1, coxa, w * 0.24, 0.8), fiapo, 0.4);
		traco(ctx, px - w * 0.05, coxa, px + w * 0.25, coxa, q.pele, 0.4);
	}
	forma(ctx, caixa(ctx, px - w * 0.52, fim - 2.1, w * 1.04, 1.8, 0.6), tom(cor, 1.12), 0.55);
}

/** Sentado: a barra do casaco cai do fim do tronco sobre o sofá, atrás das coxas. */
function barraSentado(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const w = q.feminino ? (p.longo ? g.quadrilL + 1.8 : g.cintura + 0.6) : g.larguraBase;
	const y0 = (q.feminino ? (p.longo ? g.baseLonga : g.base) : g.base) - 0.4;
	const fim = p.barra === 'jaleco' || p.barra === 'haori' ? -10.6 : -8.4;
	const c = () => {
		ctx.moveTo(-w - 0.2, y0);
		ctx.lineTo(w + 0.2, y0);
		ctx.lineTo(w + 1.4, fim);
		ctx.quadraticCurveTo(0.3, fim + 0.7, -w - 1.4, fim);
		ctx.closePath();
	};
	forma(ctx, c, q.roupa);
	sombraDireita(ctx, c, w * 0.35);
	if (p.barra === 'casacoPele') barraDePelucia(ctx, -w - 1.6, w + 1.6, fim + 0.3);
}

/** Barra de pelúcia creme, com a borda de baixo em bolinhas (casacão). `y` = onde termina. */
function barraDePelucia(ctx: C, x0: number, x1: number, y: number) {
	forma(ctx, caixa(ctx, x0, y - 2.4, x1 - x0, 2.6, 1.2), PELUCIA, 0.6);
	const pts: [number, number][] = [];
	for (let x = x0 + 0.8; x < x1 - 0.4; x += 1.6) pts.push([x, y]);
	felpa(ctx, pts, 0.65);
}

// ============================================================ parte de baixo

/**
 * Em pé, por cima do alto das pernas: quadril da calça e saia (dela), saia
 * dele, e a barra comprida do sobretudo, do trench, do jaleco e da túnica.
 */
export function parteDeBaixo(ctx: C, q: Quadro): boolean {
	const p = plano(q);
	if (!p.parteDeBaixo) return false;
	// Dela: o quadril da calça ou a saia (a túnica e a meia-calça do casaco longo não têm)
	if (q.feminino && p.baixo !== 'tunica' && p.baixo !== 'pele') quadrilDela(ctx, q, p);
	else if (!q.feminino && SAIAS.has(p.baixo)) saia(ctx, q, p, p.g.larguraBase, p.g.base - 1.6);
	if (p.barra) barraComprida(ctx, q, p);
	return true;
}

/** Calças largas: o quadril dela também abre um pouco. */
const QUADRIL_LARGO = new Set<Baixo>(['bufante', 'pantalona', 'calcaLarga', 'hakama', 'calcaMoletom', 'jardineira']);

/** O quadril da calça (ou a saia) dela, na largura do porte. */
function quadrilDela(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	if (SAIAS.has(p.baixo)) {
		saia(ctx, q, p, g.quadrilL, g.base - 1.2);
		return;
	}
	const cor = p.corPerna;
	const k = g.quadrilL / 4.7;
	const y0 = g.base - 1.2;
	const y1 = g.quadril + 4;
	const largo = QUADRIL_LARGO.has(p.baixo) ? 0.5 : 0;
	const c = () => {
		ctx.moveTo(-4.7 * k, y0);
		ctx.lineTo(4.7 * k, y0);
		ctx.quadraticCurveTo(6.2 * k + largo, (y0 + y1) / 2, 4.4 * k + largo, y1);
		ctx.lineTo(-4.4 * k - largo, y1);
		ctx.quadraticCurveTo(-6.2 * k - largo, (y0 + y1) / 2, -4.7 * k, y0);
		ctx.closePath();
	};
	forma(ctx, c, cor, 0);
	sombraDireita(ctx, c, 2.2 * k);
	riscar(ctx, () => {
		ctx.moveTo(4.7 * k, y0);
		ctx.quadraticCurveTo(6.2 * k + largo, (y0 + y1) / 2, 4.4 * k + largo, y1);
		ctx.moveTo(-4.7 * k, y0);
		ctx.quadraticCurveTo(-6.2 * k - largo, (y0 + y1) / 2, -4.4 * k - largo, y1);
	});
	if (p.baixo !== 'legging') traco(ctx, 0, y1 - 2.8, 0, y1, tom(cor, 0.76), 0.6);
}

/**
 * Saia: lápis, evasê e rodada (as originais, na largura do porte), midi
 * (rodada até o meio da canela, botões e fenda, ref. 2) e longa (até o
 * tornozelo, balançando ao andar).
 */
function saia(ctx: C, q: Quadro, p: Plano, cintura: number, y0: number) {
	const cor = corDaSaia(q, p);
	const dob = tom(cor, 0.76);
	const k = cintura / 4.7;
	const s = q.andando ? Math.sin(q.fase) : 0;
	let c: () => void;
	switch (p.baixo) {
		case 'lapis':
			c = poligono(ctx, [[-4.7 * k, y0], [4.7 * k, y0], [6.4 * k, y0 + 6], [5.3 * k, y0 + 10.8], [-5.3 * k, y0 + 10.8], [-6.4 * k, y0 + 6]]);
			break;
		case 'evase':
			c = () => {
				ctx.moveTo(-4.7 * k, y0);
				ctx.lineTo(4.7 * k, y0);
				ctx.lineTo(8.6 * k, y0 + 10);
				ctx.quadraticCurveTo(0, y0 + 11.6, -8.6 * k, y0 + 10);
				ctx.closePath();
			};
			break;
		case 'saiaMidi': {
			const fim = -5.6;
			c = () => {
				ctx.moveTo(-4.7 * k, y0);
				ctx.lineTo(4.7 * k, y0);
				ctx.quadraticCurveTo(7.6 * k, y0 + 4, 8.6 * k + s * 0.6, fim);
				ctx.quadraticCurveTo(0.3, fim + 1.3, -8.4 * k + s * 0.6, fim);
				ctx.quadraticCurveTo(-7.4 * k, y0 + 4, -4.7 * k, y0);
				ctx.closePath();
			};
			break;
		}
		case 'saiaLonga': {
			const fim = -2.6;
			c = () => {
				ctx.moveTo(-4.7 * k, y0);
				ctx.lineTo(4.7 * k, y0);
				ctx.quadraticCurveTo(6.8 * k, y0 + 6, 8 * k + s * 0.9, fim);
				ctx.quadraticCurveTo(4 * k, fim + 0.9, 0.3 + s * 0.4, fim + 0.1);
				ctx.quadraticCurveTo(-4 * k, fim + 0.9, -7.8 * k + s * 0.9, fim);
				ctx.quadraticCurveTo(-6.6 * k, y0 + 6, -4.7 * k, y0);
				ctx.closePath();
			};
			break;
		}
		case 'saiaFlorida': {
			// Longa e bem rodada até o tornozelo; a barra balança andando (ref. 38)
			const fim = -2.4;
			c = () => {
				ctx.moveTo(-4.7 * k, y0);
				ctx.lineTo(4.7 * k, y0);
				ctx.quadraticCurveTo(7.6 * k, y0 + 6, 9.2 * k + s * 1.1, fim);
				ctx.quadraticCurveTo(4.6 * k, fim + 1.1, 0.3 + s * 0.5, fim + 0.2);
				ctx.quadraticCurveTo(-4.4 * k, fim + 1.1, -8.8 * k + s * 1.1, fim);
				ctx.quadraticCurveTo(-7.4 * k, y0 + 6, -4.7 * k, y0);
				ctx.closePath();
			};
			break;
		}
		case 'saiaEnvelope': {
			// Saia do vestido envelope: justa, transpassada, até o meio da canela (ref. 37)
			const fim = -6.2;
			c = () => {
				ctx.moveTo(-4.7 * k, y0);
				ctx.lineTo(4.7 * k, y0);
				ctx.quadraticCurveTo(6.6 * k, y0 + 4, 5.6 * k + s * 0.3, fim);
				ctx.quadraticCurveTo(0.3, fim + 0.8, -5.4 * k + s * 0.3, fim);
				ctx.quadraticCurveTo(-6.4 * k, y0 + 4, -4.7 * k, y0);
				ctx.closePath();
			};
			break;
		}
		default:
			c = () => {
				ctx.moveTo(-4.7 * k, y0);
				ctx.lineTo(4.7 * k, y0);
				ctx.quadraticCurveTo(7.4 * k, y0 + 4.8, 9.8 * k, y0 + 10.2);
				ctx.quadraticCurveTo(7.4 * k, y0 + 11.8, 4.9 * k, y0 + 10.8);
				ctx.quadraticCurveTo(2.4 * k, y0 + 12, 0, y0 + 11);
				ctx.quadraticCurveTo(-2.4 * k, y0 + 12, -4.9 * k, y0 + 10.8);
				ctx.quadraticCurveTo(-7.4 * k, y0 + 11.8, -9.8 * k, y0 + 10.2);
				ctx.quadraticCurveTo(-7.4 * k, y0 + 4.8, -4.7 * k, y0);
				ctx.closePath();
			};
	}
	forma(ctx, c, cor);
	sombraDireita(ctx, c, 2.5 * k);
	if (p.baixo === 'saiaMidi') {
		if (q.deFrente) {
			for (let y = y0 + 2.4; y < -8; y += 2.6) ponto(ctx, 0.9, y, 0.45, tom(cor, 0.55));
			traco(ctx, 0.9, -8.2, 1.1, -5.2, dob, 0.7);
		}
		traco(ctx, -3 * k, y0 + 3, -5.4 * k, -6, dob, 0.6);
		traco(ctx, 3.6 * k, y0 + 3, 6 * k, -6, dob, 0.6);
	} else if (p.baixo === 'saiaLonga') {
		traco(ctx, -2 * k, y0 + 4, -4 * k + s * 0.5, -3.4, dob, 0.6);
		traco(ctx, 2.6 * k, y0 + 4, 4.6 * k + s * 0.5, -3.4, dob, 0.6);
	} else if (p.baixo === 'saiaFlorida') {
		// Florzinhas claras espalhadas (poucas e grandes o bastante para ler em 54 px)
		const flores: [number, number][] = [[-0.55, 0.22], [0.4, 0.16], [0.02, 0.42], [-0.72, 0.62], [0.62, 0.55], [-0.24, 0.8], [0.3, 0.86], [0.82, 0.86]];
		dentroDe(ctx, c, () => {
			for (const [fx, fy] of flores) {
				const y = y0 + (-2.4 - y0) * fy;
				const meia = 4.7 * k + (9 * k - 4.7 * k) * fy;
				florzinha(ctx, 0.3 + fx * meia + s * fy, y, cor);
			}
		});
		traco(ctx, -2.4 * k, y0 + 5, -4.6 * k + s * 0.6, -3.6, dob, 0.55);
		traco(ctx, 3 * k, y0 + 5, 5.4 * k + s * 0.6, -3.6, dob, 0.55);
	} else if (p.baixo === 'saiaEnvelope') {
		if (q.deFrente) {
			// A fenda na frente (a perna aparece) e a aba que cruza em diagonal, franzida no quadril
			forma(ctx, poligono(ctx, [[0.2, -12.4], [-1.8 + s * 0.3, -6.1], [1.8 + s * 0.3, -6.1]]), q.pele, 0.6);
			riscar(ctx, () => {
				ctx.moveTo(4.6 * k, y0 + 0.6);
				ctx.quadraticCurveTo(1.6, -14.6, -1.9 + s * 0.3, -6.2);
			}, CONTORNO, 0.7);
			traco(ctx, 4 * k, y0 + 1.6, 0.9, -13.4, dob, 0.55);
			traco(ctx, 4.4 * k, y0 + 3.6, 1.8, -11.6, dob, 0.55);
		} else traco(ctx, 0, y0 + 1, 0, -6.6, dob, 0.6);
	} else if (p.baixo === 'lapis') traco(ctx, 2.8 * k, y0 + 10.6, 2.6 * k, y0 + 8.4, dob, 0.7);
	else {
		traco(ctx, -1.8 * k, y0 + 3, -3.6 * k, y0 + 10.2, dob, 0.7);
		traco(ctx, 2.2 * k, y0 + 3, 4.2 * k, y0 + 10.2, dob, 0.7);
	}
}

/**
 * Barra comprida, em pé: sobretudo e jaleco abertos (a calça aparece no
 * meio), trench fechado com o trespasse, túnica até o pé. Balança ao andar.
 */
function barraComprida(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const cor = q.roupa;
	const s = q.andando ? Math.sin(q.fase) * 0.9 : 0;
	const w = q.feminino ? (p.longo ? g.quadrilL + 1.8 : g.cintura + 0.4) : g.larguraBase;
	const y0 = q.feminino ? (p.longo ? g.baseLonga - 2 : g.cinturaY + 1) : g.base - 2.4;
	if (p.barra === 'tunica') {
		const fim = -2.4;
		const c = () => {
			ctx.moveTo(-w, y0);
			ctx.lineTo(w, y0);
			ctx.quadraticCurveTo(w + 1.6, -10, w + 2.6 + s, fim);
			ctx.quadraticCurveTo(w * 0.5 + s, fim + 1.1, 0.3 + s * 0.5, fim + 0.2);
			ctx.quadraticCurveTo(-w * 0.5 + s, fim + 1.1, -w - 2.4 + s, fim);
			ctx.quadraticCurveTo(-w - 1.4, -10, -w, y0);
			ctx.closePath();
		};
		forma(ctx, c, cor);
		sombraDireita(ctx, c, w * 0.3);
		traco(ctx, -w - 2 + s, fim - 1, w + 2.2 + s, fim - 1, DOURADO, 0.6);
		traco(ctx, -2.4, y0 + 3, -3.6 + s * 0.5, fim - 1.6, tom(cor, escura(cor) ? 1.4 : 0.78), 0.6);
		traco(ctx, 3, y0 + 3, 4.2 + s * 0.5, fim - 1.6, tom(cor, escura(cor) ? 1.4 : 0.78), 0.6);
		estrela(ctx, -3.6, -9, 0.9, '#f4d35e');
		estrela(ctx, 4.2, -6, 0.8, '#f4d35e');
		return;
	}
	const fim = p.barra === 'jaleco' ? -9 : p.barra === 'haori' ? -8.2 : p.barra === 'casacoLongo' ? -4.6 : -5.4;
	const abre = w + 1.6;
	if (p.barra === 'trench' || p.barra === 'casacoLongo' || !q.deFrente) {
		const c = () => {
			ctx.moveTo(-w, y0);
			ctx.lineTo(w, y0);
			ctx.lineTo(abre + s * 0.6, fim);
			ctx.quadraticCurveTo(0.3, fim + 0.8, -abre + s * 0.6, fim);
			ctx.closePath();
		};
		forma(ctx, c, cor);
		sombraDireita(ctx, c, w * 0.35);
		if (p.barra === 'casacoLongo' && q.deFrente) {
			// O trespasse continua até a barra, com mais um par de botões
			traco(ctx, 2.1 * g.k, y0 + 0.4, 2.3 * g.k + s * 0.3, fim + 0.3, costura(cor), 0.6);
			for (const x of [-1.5 * g.k, 3.7 * g.k]) botao(ctx, x + s * 0.1, y0 + 2.4, 0.8);
		} else if (q.deFrente) traco(ctx, 1.9 * g.k, y0 + 0.4, 2.2 * g.k + s * 0.3, fim + 0.3, costura(cor), 0.6);
		else traco(ctx, 0.3, fim - 4, 0.3, fim + 0.4, costura(cor), 0.6);
		if (p.barra === 'casacoPele') barraDePelucia(ctx, -abre - 0.2 + s * 0.6, abre + 0.2 + s * 0.6, fim + 0.5);
		return;
	}
	// Aberto: duas abas com a calça no meio
	const meio = p.barra === 'jaleco' ? [-1.8 * g.k, 2.4 * g.k] : p.barra === 'haori' ? [-2.1 * g.k, 2.7 * g.k] : [-2.2 * g.k, 2.8 * g.k];
	const abas: [number, number, number][] = [
		[-w, meio[0], -1],
		[meio[1], w, 1]
	];
	for (const [x0, x1, lado] of abas) {
		const c = () => {
			ctx.moveTo(x0, y0);
			ctx.lineTo(x1, y0);
			if (lado < 0) {
				ctx.lineTo(x1 - 0.4 + s * 0.6, fim);
				ctx.lineTo(-abre + s * 0.6, fim + 0.2);
			} else {
				ctx.lineTo(abre + s * 0.6, fim + 0.2);
				ctx.lineTo(x0 + 0.4 + s * 0.6, fim);
			}
			ctx.closePath();
		};
		forma(ctx, c, cor);
		sombraDireita(ctx, c, lado < 0 ? x1 - 1.4 : x0 + (w - x0) * 0.4);
	}
	if (p.barra === 'jaleco') {
		forma(ctx, caixa(ctx, -w + 0.6, y0 + 2.2, 2.6 * g.k, 2.4, 0.4), tom(cor, 0.93), 0.5);
		forma(ctx, caixa(ctx, w - 0.6 - 2.6 * g.k, y0 + 2.2, 2.6 * g.k, 2.4, 0.4), tom(cor, 0.93), 0.5);
	}
	// Vivo da abertura: pelúcia no casacão, a gola comprida no haori
	if (p.barra === 'casacoPele' || p.barra === 'haori') {
		const pelucia = p.barra === 'casacoPele';
		const l = pelucia ? 1.6 : 1.3;
		const corVivo = pelucia ? PELUCIA : golaDoHaori(cor);
		const m = s * 0.6;
		forma(ctx, poligono(ctx, [[meio[0] - l, y0], [meio[0], y0], [meio[0] - 0.4 + m, fim], [meio[0] - 0.4 - l + m, fim]]), corVivo, 0.5);
		forma(ctx, poligono(ctx, [[meio[1], y0], [meio[1] + l, y0], [meio[1] + 0.4 + l + m, fim], [meio[1] + 0.4 + m, fim]]), corVivo, 0.5);
		if (pelucia) {
			forma(ctx, caixa(ctx, -w + 0.4 + m * 0.5, y0 + 2.4, 3 * g.k, 2.8, 0.5), tom(cor, 0.92), 0.5);
			forma(ctx, caixa(ctx, w - 0.4 - 3 * g.k + m * 0.5, y0 + 2.4, 3 * g.k, 2.8, 0.5), tom(cor, 0.92), 0.5);
			barraDePelucia(ctx, -abre - 0.2 + m, meio[0] - 0.4 + m, fim + 0.5);
			barraDePelucia(ctx, meio[1] + 0.4 + m, abre + 0.2 + m, fim + 0.5);
		}
	}
}

// ===================================================================== sapato

/**
 * Um pé, com o chão do pé em y (0, ou negativo quando ergue o pé) e o meio em
 * px; o bico aponta para +x. true = desenhei; senão sai o sapato padrão.
 */
export function sapato(ctx: C, q: Quadro, px: number, y: number): boolean {
	const desenho = SAPATOS[q.a.sapato];
	if (!desenho) return false;
	const k = plano(q).g.pe;
	ctx.save();
	ctx.translate(px, y);
	if (k !== 1) ctx.scale(k, k);
	desenho(ctx, q, q.feminino);
	ctx.restore();
	return true;
}

/** Silhueta do pé dela (bico fino), para scarpin, sandália e plataforma. */
function peDela(ctx: C) {
	ctx.moveTo(-1.9, -3.1);
	ctx.lineTo(-0.4, -2.9);
	ctx.quadraticCurveTo(2.2, -2.4, 3.9, -0.9);
	ctx.lineTo(3.7, -0.2);
	ctx.lineTo(-0.6, -0.5);
	ctx.lineTo(-0.9, 0);
	ctx.lineTo(-1.9, 0);
	ctx.closePath();
}

const SAPATOS: Record<string, (ctx: C, q: Quadro, fem: boolean) => void> = {
	// Salto com tiras, pé de pele aparecendo
	sandalia(ctx, q, fem) {
		const cor = extraOu(q, '#c9a46a');
		if (fem) {
			forma(ctx, () => peDela(ctx), q.pele, 0.7);
			forma(ctx, caixa(ctx, -1.9, -1.6, 1.1, 1.7, 0.3), cor, 0.5);
			traco(ctx, -0.4, -0.35, 3.6, -0.35, cor, 0.8);
			traco(ctx, 0.9, -2.7, 1.6, -0.9, cor, 0.8);
			traco(ctx, -1.9, -3.5, -0.3, -2.9, cor, 0.8);
			return;
		}
		forma(ctx, caixa(ctx, -2.4, -2.8, 6.4, 2.8, [1.4, 2.2, 0.8, 0.8]), q.pele, 0.8);
		forma(ctx, caixa(ctx, -2.6, -0.9, 6.8, 0.9, 0.4), '#5a3d26', 0.5);
		traco(ctx, 0.6, -2.6, 0.4, -1, cor, 0.9);
		traco(ctx, 2.2, -2.4, 2.2, -1, cor, 0.9);
	},

	// Cano alto até o joelho (de herói), punho claro; escura ganha punho dourado
	botaAlta(ctx, q, fem) {
		const cor = extraOu(q, '#2a2d35');
		const punho = escura(cor) ? DOURADO : tom(cor, 1.3);
		if (fem) {
			const cano = caixa(ctx, -2.1, -10.6, 4.4, 10.2, [1.4, 1.4, 0.6, 0.6]);
			forma(ctx, cano, cor, 0.8);
			sombraDireita(ctx, cano, 0.9);
			forma(ctx, caixa(ctx, -2.1, -3, 6, 3, [1.2, 2.2, 0.8, 0.8]), cor, 0.8);
			forma(ctx, caixa(ctx, -2.4, -11, 5, 1.6, 0.6), punho, 0.6);
			forma(ctx, caixa(ctx, -2.1, -1.2, 1.3, 1.2, 0.3), tom(cor, 0.7), 0.4);
			return;
		}
		const cano = caixa(ctx, -2.9, -9.2, 5.8, 8.8, [1.8, 1.8, 0.8, 0.8]);
		forma(ctx, cano, cor);
		sombraDireita(ctx, cano, 1);
		forma(ctx, caixa(ctx, -2.9, -3.4, 7.4, 3.4, [1.6, 2.6, 1, 1]), cor);
		forma(ctx, caixa(ctx, -3.2, -9.8, 6.4, 1.9, 0.7), punho, 0.6);
		traco(ctx, -2.4, -0.6, 3.9, -0.6, tom(cor, 0.6), 1);
	},

	// Tênis de cano alto vermelho, branco e preto, sola grossa, sem logo (refs. 13 e 14)
	tenisVermelho(ctx, _q, fem) {
		ctx.save();
		if (fem) ctx.scale(0.86, 0.86);
		const corpo = () => {
			ctx.moveTo(-2.8, -1);
			ctx.lineTo(-2.8, -5.6);
			ctx.quadraticCurveTo(-2.8, -6.4, -2, -6.4);
			ctx.lineTo(0.9, -6.2);
			ctx.lineTo(1.4, -3.8);
			ctx.quadraticCurveTo(4.4, -3.6, 4.6, -1.6);
			ctx.lineTo(4.6, -1);
			ctx.closePath();
		};
		forma(ctx, corpo, '#d6332f');
		forma(ctx, caixa(ctx, -2.8, -6.4, 3.6, 1.5, [0.8, 0.8, 0, 0]), '#1f2128', 0.6);
		forma(ctx, () => {
			ctx.moveTo(2.4, -3.7);
			ctx.quadraticCurveTo(4.4, -3.5, 4.6, -1.6);
			ctx.lineTo(2.4, -1.4);
			ctx.closePath();
		}, '#1f2128', 0.5);
		traco(ctx, 0.3, -4.6, 1.3, -4.6, '#ffffff', 0.5);
		traco(ctx, 0.5, -3.6, 1.6, -3.4, '#ffffff', 0.5);
		forma(ctx, caixa(ctx, -3, -1.4, 7.8, 1.4, 0.5), '#f5f5f2', 0.7);
		ctx.restore();
	},

	// Pé grande de pele com três risquinhos de dedo
	descalco(ctx, q, fem) {
		ctx.save();
		if (fem) ctx.scale(0.88, 0.88);
		const pe = () => {
			ctx.moveTo(-2.6, -0.2);
			ctx.lineTo(-2.6, -3);
			ctx.quadraticCurveTo(-2.6, -4, -1.4, -4);
			ctx.lineTo(1.2, -4);
			ctx.quadraticCurveTo(5, -3.8, 5, -1.2);
			ctx.quadraticCurveTo(5, -0.1, 4, -0.1);
			ctx.closePath();
		};
		forma(ctx, pe, q.pele);
		sombraDireita(ctx, pe, 1.6, 'rgba(120, 60, 30, 0.14)');
		for (const x of [2.5, 3.4, 4.2]) traco(ctx, x, -1.7, x, -0.5, tom(q.pele, 0.62), 0.5);
		ctx.restore();
	},

	// Bota metálica quadrada com faixa de luz
	botaRobo(ctx, q, fem) {
		const metal = '#8a95a5';
		const luz = extraOu(q, '#22c7e0');
		if (fem) {
			forma(ctx, caixa(ctx, -2.1, -5.6, 6, 5.6, [1, 1.4, 0.5, 0.5]), metal, 0.8);
			forma(ctx, caixa(ctx, -1.6, -3.6, 4.8, 0.9, 0.4), luz, 0.4);
			forma(ctx, caixa(ctx, -2.2, -1, 6.2, 1, 0.3), '#4a505b', 0.5);
			return;
		}
		forma(ctx, caixa(ctx, -2.9, -5.4, 7.4, 5.4, [1, 1.6, 0.6, 0.6]), metal);
		forma(ctx, caixa(ctx, -2.3, -3.5, 6.2, 1, 0.4), luz, 0.4);
		forma(ctx, caixa(ctx, -3, -1.1, 7.6, 1.1, 0.4), '#4a505b', 0.6);
		ponto(ctx, -1.6, -4.4, 0.4, 'rgba(255,255,255,0.6)');
	},

	// Baixa e macia (tabi escura, de ninja)
	sapatilha(ctx, _q, fem) {
		const cor = '#23262e';
		if (fem) {
			forma(ctx, caixa(ctx, -1.9, -2.6, 5.8, 2.6, [1.2, 2, 0.6, 0.6]), cor, 0.8);
			traco(ctx, 2.8, -2.1, 3, -0.4, '#4a505b', 0.5);
			traco(ctx, -1.8, -2.3, 0.6, -2.3, '#4a505b', 0.6);
			return;
		}
		forma(ctx, caixa(ctx, -2.6, -2.8, 6.8, 2.8, [1.4, 2.4, 0.8, 0.8]), cor);
		traco(ctx, 3, -2.3, 3.2, -0.4, '#4a505b', 0.6);
		traco(ctx, -2.4, -2.4, 0.6, -2.4, '#4a505b', 0.7);
	},

	// Scarpin nude de bico fino
	nude(ctx, _q, fem) {
		const cor = '#dcb894';
		if (fem) {
			forma(ctx, () => peDela(ctx), cor, 0.8);
			ponto(ctx, 1.9, -1.7, 0.4, 'rgba(255,255,255,0.45)');
			return;
		}
		forma(ctx, caixa(ctx, -2.6, -3.2, 6.8, 3.2, [1.6, 2.4, 1, 1]), cor);
		ponto(ctx, 1.6, -2.3, 0.5, 'rgba(255,255,255,0.4)');
	},

	// Salto plataforma branco com tira no tornozelo (ref. 3)
	plataforma(ctx, _q, fem) {
		const cor = '#f2f0ec';
		ctx.save();
		if (!fem) ctx.scale(1.12, 1.12);
		forma(ctx, caixa(ctx, -2, -3.6, 1.9, 3.6, 0.4), cor, 0.7);
		forma(ctx, () => {
			ctx.moveTo(-1.6, -4.4);
			ctx.lineTo(0, -4.2);
			ctx.quadraticCurveTo(3, -3.6, 4.2, -2);
			ctx.lineTo(4.2, -1.4);
			ctx.lineTo(-0.2, -1.6);
			ctx.closePath();
		}, cor, 0.7);
		forma(ctx, caixa(ctx, -0.3, -1.6, 4.6, 1.6, 0.5), cor, 0.7);
		traco(ctx, -2, -4.8, 0.2, -4.6, '#b9b4ab', 0.8);
		ctx.restore();
	},

	// ------------------------------------------------ segunda rodada

	// Sandália masculina de couro: sola marrom e duas tiras largas sobre o pé de pele (ref. 23)
	chinelo(ctx, q, fem) {
		ctx.save();
		if (fem) ctx.scale(0.88, 0.88);
		const pe = () => {
			ctx.moveTo(-2.4, -1);
			ctx.lineTo(-2.4, -2.6);
			ctx.quadraticCurveTo(-2.4, -3.4, -1.4, -3.4);
			ctx.lineTo(1.2, -3.3);
			ctx.quadraticCurveTo(4.6, -3, 4.6, -1.4);
			ctx.lineTo(4.6, -1);
			ctx.closePath();
		};
		forma(ctx, pe, q.pele, 0.8);
		for (const x of [3.3, 4]) traco(ctx, x, -1.9, x, -1.1, tom(q.pele, 0.62), 0.45);
		forma(ctx, caixa(ctx, -2.8, -1.2, 7.8, 1.2, 0.5), '#6b4426', 0.65);
		forma(ctx, caixa(ctx, -0.6, -3.3, 1.9, 2.4, 0.5), '#4f331f', 0.55);
		forma(ctx, caixa(ctx, 1.9, -2.9, 1.7, 2, 0.5), '#4f331f', 0.55);
		ctx.restore();
	},

	// Tênis de corrida robusto: sola alta ondulada bege, cabedal cinza com recortes bege, sem logo (ref. 24)
	tenisGrosso(ctx, _q, fem) {
		ctx.save();
		if (fem) ctx.scale(0.88, 0.88);
		const corpo = () => {
			ctx.moveTo(-2.8, -1.6);
			ctx.lineTo(-2.8, -4.4);
			ctx.quadraticCurveTo(-2.8, -5.2, -1.8, -5.2);
			ctx.lineTo(0.6, -5);
			ctx.quadraticCurveTo(1.4, -3.8, 2.4, -3.6);
			ctx.quadraticCurveTo(4.8, -3.2, 4.9, -1.6);
			ctx.closePath();
		};
		forma(ctx, corpo, '#8c8f96');
		forma(ctx, poligono(ctx, [[-2.8, -2.4], [-0.6, -4.7], [0.7, -4.4], [-1.2, -2]]), '#d9c7a8', 0.45);
		forma(ctx, () => {
			ctx.moveTo(2.9, -3.5);
			ctx.quadraticCurveTo(4.8, -3.1, 4.9, -1.8);
			ctx.lineTo(3.2, -1.8);
			ctx.closePath();
		}, '#d9c7a8', 0.45);
		forma(ctx, () => {
			ctx.moveTo(-3.1, -1.9);
			ctx.lineTo(5.1, -1.9);
			ctx.quadraticCurveTo(5.4, -0.2, 4.4, 0);
			ctx.lineTo(-2.6, 0);
			ctx.quadraticCurveTo(-3.4, -0.4, -3.1, -1.9);
			ctx.closePath();
		}, '#e6d7b9', 0.7);
		riscar(ctx, () => {
			ctx.moveTo(-2.6, -0.9);
			ctx.quadraticCurveTo(-1.4, -1.5, -0.2, -0.9);
			ctx.quadraticCurveTo(1, -0.3, 2.2, -0.9);
			ctx.quadraticCurveTo(3.4, -1.5, 4.6, -0.9);
		}, '#b9a888', 0.45);
		ctx.restore();
	},

	// Tênis de lona de cano alto, preto, biqueira e sola bege, cadarço claro, sem logo (refs. 41 e 46)
	tenisLona(ctx, _q, fem) {
		ctx.save();
		if (fem) ctx.scale(0.86, 0.86);
		const corpo = () => {
			ctx.moveTo(-2.7, -1.2);
			ctx.lineTo(-2.7, -6.2);
			ctx.quadraticCurveTo(-2.7, -6.9, -1.9, -6.9);
			ctx.lineTo(0.8, -6.7);
			ctx.lineTo(1.2, -3.9);
			ctx.quadraticCurveTo(4.3, -3.6, 4.5, -1.6);
			ctx.lineTo(4.5, -1.2);
			ctx.closePath();
		};
		forma(ctx, corpo, '#24262c');
		forma(ctx, () => {
			ctx.moveTo(2.4, -3.7);
			ctx.quadraticCurveTo(4.4, -3.4, 4.5, -1.6);
			ctx.lineTo(2.2, -1.4);
			ctx.closePath();
		}, '#efe4cc', 0.5);
		for (const y of [-5.8, -4.7]) traco(ctx, -0.1, y, 1.1, y + 0.4, '#efe9dc', 0.55);
		forma(ctx, caixa(ctx, -2.9, -1.5, 7.6, 1.5, 0.5), '#efe4cc', 0.7);
		traco(ctx, -2.5, -0.75, 4.3, -0.75, '#2a2d35', 0.35);
		ctx.restore();
	},

	// Tênis baixo branco, lateral e calcanhar na cor de destaque, sola branca, sem logo (refs. 26, 39, 40 e 53)
	tenisCor(ctx, q, fem) {
		const cor = extraOu(q, '#2f7a4a');
		ctx.save();
		if (fem) ctx.scale(0.86, 0.86);
		const corpo = () => {
			ctx.moveTo(-2.8, -1.2);
			ctx.lineTo(-2.8, -3.8);
			ctx.quadraticCurveTo(-2.8, -4.4, -2, -4.4);
			ctx.lineTo(0.4, -4.2);
			ctx.quadraticCurveTo(1.6, -3.6, 2.6, -3.4);
			ctx.quadraticCurveTo(4.7, -3.1, 4.8, -1.6);
			ctx.lineTo(4.8, -1.2);
			ctx.closePath();
		};
		forma(ctx, corpo, '#f5f5f2');
		dentroDe(ctx, corpo, () => {
			ctx.fillStyle = cor;
			ctx.fillRect(-3, -5, 1.9, 4);
		});
		forma(ctx, caixa(ctx, -0.6, -3.2, 3.6, 1.3, 0.6), cor, 0.45);
		riscar(ctx, corpo, CONTORNO, 0.8);
		forma(ctx, caixa(ctx, -3, -1.4, 8, 1.4, 0.5), '#ffffff', 0.7);
		ctx.restore();
	},

	// Coturno de amarrar, cano médio, cor de areia, sola tratorada escura (ref. 47)
	coturno(ctx, _q, fem) {
		const cor = '#c9a75a';
		ctx.save();
		if (fem) ctx.scale(0.86, 0.9);
		const cano = caixa(ctx, -2.6, -8.2, 5.2, 7.4, [1.4, 1.4, 0.6, 0.6]);
		forma(ctx, cano, cor);
		sombraDireita(ctx, cano, 0.8);
		forma(ctx, caixa(ctx, -2.6, -3.6, 7.2, 2.6, [1.4, 2.4, 0.6, 0.6]), cor);
		traco(ctx, -2.4, -7.5, 2.4, -7.5, tom(cor, 0.78), 0.6);
		const laco = tom(cor, 0.58);
		for (const y of [-6.8, -5.4, -4]) {
			traco(ctx, -0.4, y, 1.4, y + 0.9, laco, 0.5);
			traco(ctx, 1.4, y, -0.4, y + 0.9, laco, 0.5);
		}
		forma(ctx, caixa(ctx, -2.9, -1.3, 7.9, 1.3, 0.4), '#3a3328', 0.6);
		for (const x of [-2, 0, 2, 4]) forma(ctx, caixa(ctx, x - 0.5, -0.4, 1, 0.5, 0.2), '#3a3328', 0);
		ctx.restore();
	},

	// Chuteira escura com travinhas e meião até o joelho na cor de destaque, por cima da canela (ref. 51)
	chuteira(ctx, q, fem) {
		const meiao = extraOu(q, '#f2c230');
		const l = fem ? 3.6 : 4.4;
		const m = caixa(ctx, -l / 2, -8.6, l, 7.2, [1.2, 1.2, 0.4, 0.4]);
		forma(ctx, m, meiao);
		sombraDireita(ctx, m, 0.6);
		forma(ctx, caixa(ctx, -l / 2 - 0.2, -8.9, l + 0.4, 1.5, 0.5), tom(meiao, 0.8), 0.5);
		ctx.save();
		if (fem) ctx.scale(0.86, 0.86);
		forma(ctx, () => {
			ctx.moveTo(-2.8, -1);
			ctx.lineTo(-2.8, -3.2);
			ctx.quadraticCurveTo(-2.8, -3.8, -2, -3.8);
			ctx.lineTo(0.8, -3.7);
			ctx.quadraticCurveTo(4.6, -3.4, 4.8, -1.4);
			ctx.lineTo(4.8, -1);
			ctx.closePath();
		}, '#2a2d35');
		traco(ctx, 0.2, -3, 2.6, -2.5, '#f5f5f2', 0.6);
		forma(ctx, caixa(ctx, -3, -1.3, 8, 0.8, 0.3), '#c9ced6', 0.55);
		for (const x of [-1.8, 0.6, 3]) forma(ctx, caixa(ctx, x - 0.45, -0.6, 0.9, 0.6, 0.2), '#c9ced6', 0.4);
		ctx.restore();
	},

	// Sapato social branco de bico arredondado, sola bege (ref. 54)
	socialBranco(ctx, _q, fem) {
		const cor = '#f4f2ec';
		if (fem) {
			forma(ctx, () => peDela(ctx), cor, 0.8);
			traco(ctx, -0.6, -0.4, 3.6, -0.3, '#d9c7a8', 0.7);
			return;
		}
		forma(ctx, caixa(ctx, -2.6, -3.2, 6.8, 3.2, [1.6, 2.6, 1, 1]), cor);
		forma(ctx, caixa(ctx, -2.7, -0.9, 7, 0.9, 0.4), '#d9c7a8', 0.5);
		traco(ctx, -0.4, -2.6, 1.4, -2.5, '#c9c4b8', 0.5);
		ponto(ctx, 2.2, -2.2, 0.45, 'rgba(255,255,255,0.8)');
	},

	// Pata de bicho no lugar do sapato (q.bicho.mao): arredondada, três dedos, garrinhas no urso;
	// sem bicho, pé descalço de pele (refs. 28 e 55)
	patas(ctx, q, fem) {
		const cor = q.bicho ? q.bicho.mao : q.pele;
		ctx.save();
		if (fem) ctx.scale(0.88, 0.88);
		const pe = () => {
			ctx.moveTo(-2.6, -0.2);
			ctx.lineTo(-2.6, -3.2);
			ctx.quadraticCurveTo(-2.6, -4.2, -1.4, -4.2);
			ctx.lineTo(1.2, -4.1);
			ctx.quadraticCurveTo(5, -3.9, 5, -1.2);
			ctx.quadraticCurveTo(5, -0.1, 4, -0.1);
			ctx.closePath();
		};
		forma(ctx, pe, cor);
		sombraDireita(ctx, pe, 1.6);
		const risco = luzDe(cor) < 70 ? tom(cor, 1.6) : tom(cor, 0.62);
		for (const x of [2.5, 3.4, 4.2]) traco(ctx, x, -1.8, x, -0.5, risco, 0.5);
		if (q.bicho?.forma === 'urso')
			for (const y of [-2.4, -1.3, -0.3]) forma(ctx, poligono(ctx, [[4.7, y - 0.4], [5.8, y], [4.7, y + 0.3]]), '#e8e2d4', 0.35);
		ctx.restore();
	}
};

// ===================================================================== na mão

/**
 * O item na mão da frente, com o contexto no centro da mão e SEM o giro do
 * braço (y para baixo: a maleta pendura). Chamado duas vezes: 'atras' antes
 * do braço (a alça fica sob os dedos) e 'frente' depois dele.
 */
export function naMao(ctx: C, q: Quadro, camada: 'atras' | 'frente'): void {
	const item = q.a.naMao;
	if (item === 'bracosCruzados') {
		// Os dois braços cruzados saem juntos, por cima de tudo, no lugar do corpo
		// (e não da mão): desfaz o caminho do ombro até a mão que avatar.ts fez
		if (camada !== 'frente') return;
		const m = q.m;
		const ang = -q.passada.balanco + m.anguloMao;
		ctx.save();
		ctx.translate(-(m.ombroX - Math.sin(ang) * m.braco), -(m.ombroY + Math.cos(ang) * m.braco));
		bracosCruzados(ctx, q, plano(q));
		ctx.restore();
		return;
	}
	const desenho = ITENS[item];
	if (!desenho) return;
	if (q.sentado && SO_EM_PE.has(item)) return;
	const r = plano(q).g.mao;
	const s = Math.min(1.18, Math.max(0.86, r / 2.5));
	ctx.save();
	if (s !== 1) ctx.scale(s, s);
	desenho(ctx, q, camada);
	ctx.restore();
}

type Item = (ctx: C, q: Quadro, camada: 'atras' | 'frente') => void;

const ITENS: Record<string, Item> = {
	// Maleta de couro com alça, pendurada (refs. 1 e 4)
	maleta(ctx, q, camada) {
		if (camada !== 'atras') return;
		const cor = extraOu(q, '#7a4a2a');
		ctx.beginPath();
		ctx.arc(0, 1.9, 1.7, Math.PI, 0);
		ctx.strokeStyle = CONTORNO;
		ctx.lineWidth = 1.2;
		ctx.stroke();
		const c = caixa(ctx, -4.2, 1.8, 8.4, 6, 1);
		forma(ctx, c, cor);
		sombraDireita(ctx, c, 1.6);
		traco(ctx, -4, 3.8, 4, 3.8, costura(cor), 0.6);
		forma(ctx, caixa(ctx, -0.7, 3.2, 1.4, 1.3, 0.3), DOURADO, 0.45);
	},

	// Bolsa de mão estruturada, alça curta (refs. 2 e 16)
	bolsa(ctx, q, camada) {
		if (camada !== 'atras') return;
		const cor = extraOu(q, '#b33a3a');
		ctx.beginPath();
		ctx.arc(0, 2.6, 1.9, Math.PI, 0);
		ctx.strokeStyle = CONTORNO;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.strokeStyle = cor;
		ctx.lineWidth = 0.7;
		ctx.stroke();
		const c = caixa(ctx, -3, 2.4, 6.2, 4.6, [1, 1, 1.2, 1.2]);
		forma(ctx, c, cor);
		sombraDireita(ctx, c, 1.2);
		forma(ctx, () => {
			ctx.moveTo(-3, 2.6);
			ctx.lineTo(3.2, 2.6);
			ctx.lineTo(3.2, 4);
			ctx.quadraticCurveTo(0.1, 5.6, -3, 4);
			ctx.closePath();
		}, tom(cor, 0.92), 0.5);
		ponto(ctx, 0.1, 4.6, 0.55, DOURADO);
	},

	// Bolsa meia-lua com alça de corrente dourada (ref. 3)
	bolsaOmbro(ctx, q, camada) {
		if (camada !== 'atras') return;
		const cor = extraOu(q, '#f4f1eb');
		traco(ctx, -2.6, 3.2, -0.4, 0, DOURADO, 0.8);
		traco(ctx, 2.8, 3.2, 0.6, 0, DOURADO, 0.8);
		for (const [x, y] of [[-1.9, 2.1], [-1.1, 1], [1.9, 2.1], [1.2, 1]] as const) ponto(ctx, x, y, 0.4, '#b88a2a');
		const c = () => {
			ctx.moveTo(-3.8, 3);
			ctx.quadraticCurveTo(0.2, 3.9, 4, 3);
			ctx.quadraticCurveTo(3.4, 9.4, 0.1, 9.4);
			ctx.quadraticCurveTo(-3.2, 9.4, -3.8, 3);
			ctx.closePath();
		};
		forma(ctx, c, cor);
		sombraDireita(ctx, c, 1.2);
	},

	// Notebook fechado, placa cinza fina; sentado, no colo
	notebook(ctx, q, camada) {
		if (camada !== 'atras') return;
		if (q.sentado) {
			forma(ctx, caixa(ctx, -5, -1.6, 8.4, 1.8, 0.6), '#c4cbd4', 0.7);
			traco(ctx, -4.6, -0.4, 3, -0.4, '#8a94a3', 0.5);
			return;
		}
		const c = caixa(ctx, -2.6, -0.6, 5.4, 7.2, 0.8);
		forma(ctx, c, '#c4cbd4');
		sombraDireita(ctx, c, 1);
		traco(ctx, -2.2, 5.8, 2.4, 5.8, '#8a94a3', 0.6);
		ponto(ctx, 0.1, 3, 0.55, '#e6eaef');
	},

	// Livro de capa colorida (na cor da roupa: grimório roxo na feiticeira)
	livro(ctx, q, camada) {
		if (camada !== 'atras') return;
		// Capa num tom da roupa (contrasta com ela): grimório roxo na feiticeira
		const cor = luzDe(q.roupa) < 60 ? tom(q.roupa, 1.45) : luzDe(q.roupa) > 170 ? '#2f7d8c' : tom(q.roupa, 0.72);
		if (q.sentado) {
			forma(ctx, caixa(ctx, -4.6, -1.8, 7.8, 2.2, 0.5), cor, 0.7);
			forma(ctx, caixa(ctx, -4.2, -2.4, 7, 1, 0.3), '#f6f1e3', 0.5);
			return;
		}
		const c = caixa(ctx, -2.2, 0.2, 4.6, 6, 0.6);
		forma(ctx, c, cor);
		forma(ctx, caixa(ctx, 1.6, 0.6, 1, 5.2, 0.2), '#f6f1e3', 0.4);
		forma(ctx, caixa(ctx, -1.6, 2, 2.6, 1.1, 0.3), temDetalhe(q, 'aura') ? DOURADO : tom(cor, 1.4), 0.4);
	},

	// Celular de tela acesa, na frente do peito
	celular(ctx, _q, camada) {
		if (camada !== 'atras') return;
		forma(ctx, caixa(ctx, -1.4, -5, 2.8, 5, 0.7), '#23262e', 0.7);
		forma(ctx, caixa(ctx, -0.95, -4.5, 1.9, 3.9, 0.35), '#8fd3ff', 0);
		ponto(ctx, -0.4, -4, 0.3, 'rgba(255,255,255,0.8)');
	},

	// Prancheta com papel e prendedor
	prancheta(ctx, _q, camada) {
		if (camada !== 'atras') return;
		forma(ctx, caixa(ctx, -5.4, -6.6, 5.6, 7.2, 0.6), '#a0703f', 0.8);
		forma(ctx, caixa(ctx, -4.8, -5.6, 4.4, 5.8, 0.3), '#fbfaf6', 0.45);
		for (const y of [-4.2, -3, -1.8]) traco(ctx, -4.1, y, -1.3, y, '#9aa3b2', 0.45);
		forma(ctx, caixa(ctx, -3.6, -7.2, 2, 1.5, 0.3), '#c4cbd4', 0.5);
	},

	// Copo de café com tampa; xícara com pires (de quem usa suéter)
	// (na frente da mão: a mão segura por trás e aparece dos lados)
	cafe(ctx, q, camada) {
		if (camada !== 'frente') return;
		if (q.a.roupa === 'sueter') {
			forma(ctx, oval(ctx, 0.4, 0.6, 3.4, 1), '#f6f1e7', 0.6);
			ctx.beginPath();
			ctx.arc(2.6, -1.8, 1.1, -Math.PI / 2, Math.PI / 2);
			ctx.strokeStyle = CONTORNO;
			ctx.lineWidth = 1.6;
			ctx.stroke();
			ctx.strokeStyle = '#f6f1e7';
			ctx.lineWidth = 0.6;
			ctx.stroke();
			forma(ctx, caixa(ctx, -1.8, -3.6, 4.2, 3.8, [0.4, 0.4, 1.8, 1.8]), '#f6f1e7', 0.7);
			traco(ctx, -1.6, -2.4, 2.2, -2.4, '#9b7fc8', 0.7);
			return;
		}
		forma(ctx, poligono(ctx, [[-1.7, -4.6], [2.1, -4.6], [1.6, 1.6], [-1.2, 1.6]]), '#f4f1eb', 0.7);
		forma(ctx, poligono(ctx, [[-1.5, -2.6], [1.9, -2.6], [1.7, -0.4], [-1.3, -0.4]]), '#a9773f', 0.45);
		forma(ctx, caixa(ctx, -2.1, -5.8, 4.6, 1.4, 0.5), '#4a3a2a', 0.6);
	},

	// Câmera fotográfica com lente
	camera(ctx, _q, camada) {
		if (camada !== 'atras') return;
		forma(ctx, caixa(ctx, -4.4, -4.6, 2.4, 1.3, 0.4), '#2a2d35', 0.6);
		const c = caixa(ctx, -5.8, -3.6, 7.2, 4.6, 0.9);
		forma(ctx, c, '#2a2d35');
		forma(ctx, oval(ctx, -2.2, -1.3, 2, 2), '#4a505b', 0.7);
		forma(ctx, oval(ctx, -2.2, -1.3, 1.1, 1.1), '#6fa7d6', 0.4);
		ponto(ctx, -2.6, -1.8, 0.4, 'rgba(255,255,255,0.8)');
		ponto(ctx, 0.2, -2.8, 0.45, '#e0662a');
	},

	// Lupa redonda com brilho na lente, erguida do lado do corpo
	lupa(ctx, _q, camada) {
		if (camada !== 'atras') return;
		faixa(ctx, [[0, 0.4], [2.6, -3.6]], '#6b4426', 1.4);
		forma(ctx, oval(ctx, 4.1, -6.9, 3.3, 3.3), '#9aa3b2');
		ctx.beginPath();
		ctx.arc(4.1, -6.9, 2.4, 0, Math.PI * 2);
		ctx.fillStyle = '#d6ecf7';
		ctx.fill();
		ctx.beginPath();
		ctx.arc(4.1, -6.9, 1.6, Math.PI * 1.05, Math.PI * 1.5);
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 0.7;
		ctx.stroke();
	},

	// Cachimbo na altura do peito, fumacinha subindo (ref. 5)
	cachimbo(ctx, q, camada) {
		if (camada === 'atras') {
			faixa(ctx, [[-0.6, -1.8], [-3, -2.2], [-4.8, -3.6]], '#3a2a1e', 0.9);
			forma(ctx, caixa(ctx, -0.8, -5, 3.2, 3.8, [0.5, 0.5, 1.4, 1.4]), '#8a5530', 0.8);
			forma(ctx, oval(ctx, 0.8, -4.9, 1.3, 0.55), '#2e1f14', 0);
			traco(ctx, -0.4, -3.6, -0.4, -2.2, 'rgba(255,255,255,0.35)', 0.5);
			return;
		}
		for (let i = 0; i < 3; i++) {
			const f = (q.t * 0.55 + i / 3) % 1;
			ctx.globalAlpha = 0.55 * (1 - f);
			ponto(ctx, 0.9 + Math.sin(f * 6 + i) * 0.9, -6 - f * 7, 0.7 + f * 0.9, '#eceef3');
		}
		ctx.globalAlpha = 1;
	},

	// Capacete de piloto: cor da roupa, faixa de destaque, viseira escura, sem logo (ref. 9)
	capacete(ctx, q, camada) {
		if (camada !== 'atras') return;
		const cor = q.roupa;
		const c = oval(ctx, 1.4, 4, 4.3, 4.1);
		forma(ctx, c, cor);
		ctx.save();
		ctx.beginPath();
		c();
		ctx.clip();
		ctx.fillStyle = extraOu(q, '#ff6f00');
		ctx.fillRect(-4, 1.6, 12, 1.5);
		ctx.fillStyle = 'rgba(16,20,32,0.16)';
		ctx.fillRect(3, -2, 6, 12);
		ctx.restore();
		forma(ctx, () => {
			ctx.moveTo(-0.4, 4);
			ctx.lineTo(5.2, 3.4);
			ctx.quadraticCurveTo(5.8, 5.6, 4.6, 6.6);
			ctx.lineTo(0.2, 6.4);
			ctx.closePath();
		}, '#1f2733', 0.6);
		traco(ctx, 1, 4.6, 3.4, 4.4, 'rgba(255,255,255,0.45)', 0.6);
		ponto(ctx, -0.6, 2.4, 0.5, 'rgba(255,255,255,0.5)');
	},

	// Cajado de madeira até a altura da cabeça, pedra que brilha na ponta
	cajado(ctx, q, camada) {
		if (camada !== 'atras') return;
		faixa(ctx, [[0.2, 12.6], [0.4, -8], [0.6, -26.6]], '#8a5a32', 1.3);
		const pulsa = 0.28 + Math.sin(q.t * 2.6) * 0.1;
		ctx.globalAlpha = pulsa;
		ponto(ctx, 0.8, -29, 3.8, '#9be9ff');
		ctx.globalAlpha = 1;
		faixa(ctx, [[-0.6, -26.6], [-1.6, -29.4], [-0.6, -31]], '#8a5a32', 0.8);
		faixa(ctx, [[1.8, -26.6], [2.8, -29.2], [2, -31]], '#8a5a32', 0.8);
		forma(ctx, oval(ctx, 0.7, -29, 1.5, 1.9), '#7fe0ff', 0.6);
		ponto(ctx, 0.2, -29.8, 0.45, '#ffffff');
	},

	// ------------------------------------------------ segunda rodada

	// Banana amarela curva, pontas escuras, segurada pelo meio (ref. 55)
	banana(ctx, _q, camada) {
		if (camada !== 'atras') return;
		// Em pé na mão, inclinada para fora do braço (que sobe para o ombro do outro lado)
		const c = () => {
			ctx.moveTo(-5.2, -6.2);
			ctx.quadraticCurveTo(-6, 0.8, 1, 3.2);
			ctx.quadraticCurveTo(2.2, 3.5, 2.2, 2.4);
			ctx.quadraticCurveTo(-2.2, -0.8, -2.6, -6.8);
			ctx.closePath();
		};
		forma(ctx, c, '#f2d03a');
		sombraDireita(ctx, c, -2.4);
		traco(ctx, -4.4, -4.2, -3.6, 0.4, '#d9a92a', 0.55);
		ponto(ctx, -3.9, -6.7, 0.75, '#5a4a22');
		ponto(ctx, 1.8, 3, 0.6, '#5a4a22');
	},

	// Copo alto transparente de café gelado, com tampa em cúpula e canudo (ref. 40)
	// (na frente da mão: a mão segura por trás e aparece dos lados)
	cafeGelado(ctx, _q, camada) {
		if (camada !== 'frente') return;
		traco(ctx, 0.6, -7.2, 1.7, -10.4, CONTORNO, 1.5);
		traco(ctx, 0.6, -7.2, 1.7, -10.4, '#3a6e5a', 0.7);
		forma(ctx, poligono(ctx, [[-1.75, -4.2], [2.15, -4.2], [1.75, 2.1], [-1.35, 2.1]]), '#b98a5e', 0);
		forma(ctx, caixa(ctx, -1, -3.6, 1.3, 1.2, 0.3), 'rgba(255,255,255,0.55)', 0);
		forma(ctx, caixa(ctx, 0.6, -2.2, 1.2, 1.1, 0.3), 'rgba(255,255,255,0.45)', 0);
		const copo = poligono(ctx, [[-2, -6], [2.4, -6], [1.8, 2.2], [-1.4, 2.2]]);
		forma(ctx, copo, 'rgba(232, 240, 246, 0.25)', 0.7);
		traco(ctx, -1.3, -5, -0.9, 1, 'rgba(255,255,255,0.7)', 0.5);
		forma(ctx, () => {
			ctx.moveTo(-2.3, -6);
			ctx.quadraticCurveTo(0.2, -8.6, 2.7, -6);
			ctx.closePath();
		}, 'rgba(240, 244, 248, 0.85)', 0.6);
		forma(ctx, caixa(ctx, -2.4, -6.5, 5.2, 0.9, 0.3), '#f4f6f8', 0.5);
	},

	// Sacola grande de alças longas, na cor de destaque; só em pé (ref. 39)
	sacola(ctx, q, camada) {
		if (camada !== 'atras') return;
		const cor = extraOu(q, '#8a4f2e');
		const alca = tom(cor, 0.72);
		riscar(ctx, () => {
			ctx.moveTo(-2.8, 4.8);
			ctx.lineTo(-0.5, -0.4);
			ctx.lineTo(2.4, 4.8);
		}, CONTORNO, 1.5);
		riscar(ctx, () => {
			ctx.moveTo(-2.8, 4.8);
			ctx.lineTo(-0.5, -0.4);
			ctx.lineTo(2.4, 4.8);
		}, alca, 0.7);
		const c = caixa(ctx, -4, 4.4, 7.6, 7.6, [0.6, 0.6, 1.2, 1.2]);
		forma(ctx, c, cor);
		sombraDireita(ctx, c, 0.6);
		traco(ctx, -3.6, 5.6, 3.2, 5.6, tom(cor, 0.8), 0.5);
	},

	// Caneta (marcador) escura erguida entre os dedos, apontando para fora do braço (ref. 45)
	caneta(ctx, _q, camada) {
		if (camada !== 'frente') return;
		faixa(ctx, [[-0.4, -0.4], [-2.4, -6.2]], '#23262e', 1.3);
		traco(ctx, -2.1, -5.3, -2.45, -6.3, '#8a909b', 0.5);
		traco(ctx, -0.9, -1.8, -1.5, -3.6, 'rgba(255,255,255,0.4)', 0.4);
	},

	// Raquete de pingue-pongue: nenhum personagem usa; o jogo põe na mão do
	// agente que joga na pausa (o cabo sob os dedos, a borracha vermelha por cima)
	raquete(ctx, _q, camada) {
		if (camada === 'atras') {
			faixa(ctx, [[0.2, 1], [1.1, -3.4]], '#c8955a', 1.5);
			return;
		}
		const borracha = oval(ctx, 1.7, -6.3, 3.1, 3.4, 0.2);
		forma(ctx, borracha, '#d8433a');
		sombraDireita(ctx, borracha, 2.6);
		ctx.beginPath();
		ctx.arc(1.1, -7, 1.6, Math.PI * 1.05, Math.PI * 1.55);
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
		ctx.lineWidth = 0.6;
		ctx.stroke();
	}
};

/**
 * Braços cruzados na frente do peito (refs. 23, 30 e 33). Coordenadas do
 * corpo (no quadril). Ordem: braço de trás, antebraço de baixo (a mão some
 * embaixo do outro braço), braço da frente e o antebraço de cima, com a mão
 * segurando o outro braço. De costas, só os braços (os antebraços ficam na
 * frente do corpo).
 */
function bracosCruzados(ctx: C, q: Quadro, p: Plano) {
	const g = p.g;
	const m = q.m;
	const w = g.bracoL;
	const L = m.braco;
	const manga = mangaDe(q, p);
	const inteira = MANGA_INTEIRA.has(manga.tipo);
	// Até onde a manga desce no braço (as curtas param antes do cotovelo)
	const ateOnde = inteira ? 99 : manga.tipo === 'curta' ? 5.6 : manga.tipo === 'dobrada' ? 6.6 : manga.tipo === 'ampla' ? 7.4 : manga.tipo === 'bufante' ? 3.2 : 0;
	const corBraco = inteira ? manga.cor : q.pele;
	const ox = m.ombroX;
	const oy = m.ombroY;
	const ey = oy + L * 0.56;
	const ex = ox + 0.5;
	const luvas = temDetalhe(q, 'luvas');
	const mao = (x: number, y: number, ang: number) => {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(ang - Math.PI / 2);
		if (!luvas && q.bicho) pata(ctx, q, 0, 0, g.mao);
		else forma(ctx, oval(ctx, 0, 0, g.mao, g.mao), luvas ? '#2b2e36' : q.pele);
		ctx.restore();
	};
	const superior = (lado: -1 | 1) => {
		const x0 = lado * ox;
		const x1 = lado * ex;
		const s = segmento(ctx, x0, oy, x1, ey, w);
		forma(ctx, s, corBraco);
		sombraDireita(ctx, s, x0 + w * 0.15);
		if (!inteira && ateOnde) {
			const fim = Math.min(ateOnde, L * 0.56);
			forma(ctx, segmento(ctx, x0, oy - 0.2, x0 + lado * 0.05, oy + fim, w + 0.2), manga.cor);
			if (manga.punho) forma(ctx, segmento(ctx, x0, oy + fim - 1.2, x0 + lado * 0.05, oy + fim - 0.2, w + 0.4), manga.punho, 0.5);
		}
		if (manga.tipo === 'haori') forma(ctx, caixa(ctx, x0 - w / 2 - 0.5, oy + 0.4, w + 1.2, 1.5, 0.5), tom(manga.cor, 0.62), 0.5);
	};
	const antebraco = (lado: -1 | 1, x1: number, y1: number) => {
		const x0 = lado * ex;
		const y0 = ey;
		const s = segmento(ctx, x0, y0, x1, y1, w * 0.95);
		forma(ctx, s, corBraco);
		const ang = Math.atan2(y1 - y0, x1 - x0);
		const ao = (t: number): [number, number] => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
		if (inteira && manga.punho) {
			const [a, b] = ao(0.8);
			const [c, d] = ao(0.9);
			forma(ctx, segmento(ctx, a, b, c, d, w + 0.3), manga.pelucia ? PELUCIA : manga.punho, 0.5);
		}
		if (!inteira) {
			// Listras do tigre e tatuagem no antebraço
			const nx = -Math.sin(ang);
			const ny = Math.cos(ang);
			for (const t of [0.3, 0.5, 0.7]) {
				const [x, y] = ao(t);
				if (q.bicho?.id === 'tigre') traco(ctx, x + nx * w * 0.45, y + ny * w * 0.45, x + nx * w * 0.05 + Math.cos(ang) * 0.6, y + ny * w * 0.05 + Math.sin(ang) * 0.6, q.bicho.escuro, 0.75);
			}
			if (temDetalhe(q, 'tatuagem')) {
				const [a, b] = ao(0.35);
				const [c, d] = ao(0.6);
				ctx.save();
				ctx.globalAlpha = 0.5;
				traco(ctx, a, b + 0.4, c, d - 0.4, '#1f2a3a', 0.55);
				ctx.restore();
			}
		}
		if (lado === 1 && temDetalhe(q, 'relogio')) {
			const [a, b] = ao(0.82);
			forma(ctx, segmento(ctx, a, b - 0.01, a + Math.cos(ang) * 0.2, b + Math.sin(ang) * 0.2, w + 0.6), '#2a2d35', 0.5);
			forma(ctx, oval(ctx, a, b - 0.3, 0.9, 0.9), '#e8ecf2', 0.5);
		}
		mao(x1, y1, ang);
	};
	superior(-1);
	if (q.deFrente) antebraco(-1, ox - 1.4, ey - 2.6);
	superior(1);
	if (q.deFrente) antebraco(1, -ox + 1.6, ey - 1.2);
}
