// O escritório da Dunamis no DGathe: terreno, salas, paredes, portas e móveis.
//
// Tudo é célula de 1×1 (um ladrilho). As salas são retângulos de células, e as
// paredes NÃO ocupam célula: ficam na aresta entre duas células de zonas
// diferentes e são calculadas sozinhas a partir das salas. Para abrir uma
// passagem basta listar a aresta como porta.
//
// Para mudar o escritório: mexa em SALAS (retângulo, porta, piso), nos móveis
// em `montarItens` e nas decorações das paredes do fundo em DECORACOES. O teste
// em mapa.test.ts confere que toda sala continua alcançável a partir da entrada.

import { sorteio } from './iso';

export const LARGURA = 48;
export const ALTURA = 31;

/** Células internas do prédio (inclusive). As paredes do fundo são as da linha y = 4 e da coluna x = 4. */
export const PREDIO = { x0: 4, y0: 4, x1: 43, y1: 24 };

/** Onde o avatar aparece na primeira visita: no meio da recepção. */
export const INICIO = { x: 20.5, y: 22.2 };

export type TipoPiso =
	| 'grama'
	| 'calcada'
	| 'asfalto'
	| 'madeira'
	| 'carpete'
	| 'piso'
	| 'tech'
	| 'estudio'
	| 'marmore'
	| 'cozinha'
	| 'corredor';

/**
 * Aresta entre duas células. 'h' é a linha horizontal y (entre as células y-1 e
 * y) na coluna x; 'v' é a linha vertical x (entre as células x-1 e x) na linha y.
 */
export type Aresta = { linha: 'h' | 'v'; x: number; y: number };

export type Sala = {
	id: string;
	nome: string;
	setor: string;
	descricao: string;
	/** Cor de destaque da sala (painel, minimapa, contorno). */
	cor: string;
	piso: TipoPiso;
	corPiso: string;
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	portas: Aresta[];
	/** O que os agentes desta sala vão saber fazer (próxima fase). */
	especialidades: string[];
};

const portaNorte = (x: number) => [x, x + 1].map((c): Aresta => ({ linha: 'h', x: c, y: 13 }));
const portaSul = (x: number) => [x, x + 1].map((c): Aresta => ({ linha: 'h', x: c, y: 15 }));

export const SALAS: Sala[] = [
	{
		id: 'diretoria',
		nome: 'Diretoria',
		setor: 'Direção',
		descricao: 'A sala do CEO. Estratégia, decisões e o rumo da agência.',
		cor: '#d08a2e',
		piso: 'madeira',
		corPiso: '#c9a27a',
		x0: 4,
		y0: 4,
		x1: 11,
		y1: 12,
		portas: portaNorte(8),
		especialidades: ['Estratégia', 'Decisões', 'Fechamento da semana']
	},
	{
		id: 'reuniao',
		nome: 'Sala de Reunião',
		setor: 'Reuniões',
		descricao: 'Onde a equipe e os clientes se encontram: pautas, apresentações e alinhamentos.',
		cor: '#5b7bb5',
		piso: 'carpete',
		corPiso: '#a7b6c9',
		x0: 12,
		y0: 4,
		x1: 19,
		y1: 12,
		portas: portaNorte(15),
		especialidades: ['Pauta e ata', 'Apresentações', 'Propostas em reunião']
	},
	{
		id: 'financeiro',
		nome: 'Financeiro',
		setor: 'Financeiro',
		descricao: 'Caixa, cobranças, pagamentos e as contas da empresa e dos clientes.',
		cor: '#3f9a6a',
		piso: 'piso',
		corPiso: '#d3e2cd',
		x0: 20,
		y0: 4,
		x1: 25,
		y1: 12,
		portas: portaNorte(22),
		especialidades: ['Projeção de caixa', 'Obrigações fiscais', 'Conciliação bancária']
	},
	{
		id: 'comercial',
		nome: 'Comercial',
		setor: 'Vendas',
		descricao: 'Prospecção, propostas e o funil de vendas da Dunamis.',
		cor: '#e0662a',
		piso: 'carpete',
		corPiso: '#e8d2ae',
		x0: 26,
		y0: 4,
		x1: 33,
		y1: 12,
		portas: portaNorte(29),
		especialidades: ['Propostas', 'Prospecção', 'Conversas de venda']
	},
	{
		id: 'dev',
		nome: 'Desenvolvimento & IA',
		setor: 'Vert Systems',
		descricao: 'Sistemas sob medida, o próprio dspace e a inteligência artificial da casa.',
		cor: '#22b8cf',
		piso: 'tech',
		corPiso: '#2b3548',
		x0: 34,
		y0: 4,
		x1: 43,
		y1: 12,
		portas: portaNorte(38),
		especialidades: ['Sistemas e apps', 'Revisão de código', 'Automação com IA']
	},
	{
		id: 'corredor',
		nome: 'Corredor',
		setor: 'Circulação',
		descricao: 'Liga todas as salas. Daqui se chega a qualquer setor da Dunamis.',
		cor: '#9a8f7d',
		piso: 'corredor',
		corPiso: '#e6dfd2',
		x0: 4,
		y0: 13,
		x1: 43,
		y1: 14,
		portas: [],
		especialidades: []
	},
	{
		id: 'conteudo',
		nome: 'Conteúdo & Social Media',
		setor: 'Marketing',
		descricao: 'Pautas, calendário editorial e as postagens de todos os clientes.',
		cor: '#e05a7a',
		piso: 'piso',
		corPiso: '#f1d0c8',
		x0: 4,
		y0: 15,
		x1: 10,
		y1: 24,
		portas: portaSul(7),
		especialidades: ['Ideias de pauta', 'Calendário editorial', 'Carrosséis e legendas']
	},
	{
		id: 'estudio',
		nome: 'Estúdio',
		setor: 'Audiovisual',
		descricao: 'Foto, vídeo e locução: onde nascem os reels, os spots e as fotos de produto.',
		cor: '#9b6bd6',
		piso: 'estudio',
		corPiso: '#3a3a42',
		x0: 11,
		y0: 15,
		x1: 16,
		y1: 24,
		portas: portaSul(13),
		especialidades: ['Roteiros de vídeo', 'Spots de rádio', 'Fotos de produto']
	},
	{
		id: 'recepcao',
		nome: 'Recepção',
		setor: 'Atendimento',
		descricao: 'A porta de entrada da Dunamis: quem chega, quem é atendido e quem começa com a gente.',
		cor: '#ff6f00',
		piso: 'marmore',
		corPiso: '#eee8de',
		x0: 17,
		y0: 15,
		x1: 23,
		y1: 24,
		// Aberta para o corredor (sem parede) e com a porta de vidro para a rua.
		portas: [
			...[17, 18, 19, 20, 21, 22, 23].map((x): Aresta => ({ linha: 'h', x, y: 15 })),
			...[19, 20, 21].map((x): Aresta => ({ linha: 'h', x, y: 25 }))
		],
		especialidades: ['Atendimento', 'Onboarding de cliente', 'Contratos']
	},
	{
		id: 'design',
		nome: 'Design & Criação',
		setor: 'Criação',
		descricao: 'Marcas, identidades visuais, artes e peças para impressão.',
		cor: '#7c5cd6',
		piso: 'piso',
		corPiso: '#e3daf1',
		x0: 24,
		y0: 15,
		x1: 29,
		y1: 24,
		portas: portaSul(26),
		especialidades: ['Identidade visual', 'Artes e campanhas', 'Revisão de design']
	},
	{
		id: 'trafego',
		nome: 'Tráfego Pago',
		setor: 'Performance',
		descricao: 'Campanhas no Google e na Meta: verba, públicos e relatórios.',
		cor: '#2f7fd8',
		piso: 'piso',
		corPiso: '#cde2ee',
		x0: 30,
		y0: 15,
		x1: 35,
		y1: 24,
		portas: portaSul(32),
		especialidades: ['Anúncios Google', 'Anúncios Meta', 'Relatórios de resultado']
	},
	{
		id: 'copa',
		nome: 'Copa & Lounge',
		setor: 'Convivência',
		descricao: 'Café, pausa e conversa. Na próxima fase, é aqui que os agentes esperam a próxima tarefa.',
		cor: '#b07a3c',
		piso: 'cozinha',
		corPiso: '#efe2c8',
		x0: 36,
		y0: 15,
		x1: 43,
		y1: 24,
		portas: portaSul(39),
		especialidades: ['Pausa', 'Agentes livres']
	}
];

export const SALA_POR_ID = new Map(SALAS.map((s) => [s.id, s]));

/** Salas de trabalho (sem o corredor), na ordem do painel e do contador. */
export const SETORES = SALAS.filter((s) => s.id !== 'corredor');

// ---------------------------------------------------------------- zonas e piso

const zonas: (string | null)[] = new Array(LARGURA * ALTURA).fill(null);
for (const s of SALAS) {
	for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) zonas[y * LARGURA + x] = s.id;
}

export function dentroDoMapa(x: number, y: number): boolean {
	return x >= 0 && y >= 0 && x < LARGURA && y < ALTURA;
}

/** Sala da célula (x, y), ou null do lado de fora. */
export function zonaDaCelula(x: number, y: number): string | null {
	if (!dentroDoMapa(x, y)) return null;
	return zonas[y * LARGURA + x];
}

/** Sala de um ponto contínuo do mundo. */
export function zonaNoPonto(x: number, y: number): string | null {
	return zonaDaCelula(Math.floor(x), Math.floor(y));
}

export const ESTACIONAMENTO = { x0: 30, y0: 27, x1: 43, y1: 30 };

export function pisoDaCelula(x: number, y: number): TipoPiso {
	const z = zonaDaCelula(x, y);
	if (z) return SALA_POR_ID.get(z)!.piso;
	if (y === 25 && x >= 2 && x <= 45) return 'calcada';
	if (x >= 19 && x <= 21 && y >= 26) return 'calcada';
	const e = ESTACIONAMENTO;
	if (x >= e.x0 && x <= e.x1 && y >= e.y0 && y <= e.y1) return 'asfalto';
	return 'grama';
}

// ------------------------------------------------------------------- paredes

const chaveH = (x: number, y: number) => `h${x},${y}`;
const chaveV = (x: number, y: number) => `v${x},${y}`;
const chaveDe = (a: Aresta) => (a.linha === 'h' ? chaveH(a.x, a.y) : chaveV(a.x, a.y));

const abertas = new Set(SALAS.flatMap((s) => s.portas.map(chaveDe)));
const paredes = new Set<string>();

for (let y = 0; y < ALTURA; y++) {
	for (let x = 0; x < LARGURA; x++) {
		const aqui = zonaDaCelula(x, y);
		if (x > 0) {
			const esq = zonaDaCelula(x - 1, y);
			if (esq !== aqui && !abertas.has(chaveV(x, y))) paredes.add(chaveV(x, y));
		}
		if (y > 0) {
			const cima = zonaDaCelula(x, y - 1);
			if (cima !== aqui && !abertas.has(chaveH(x, y))) paredes.add(chaveH(x, y));
		}
	}
}

/** Existe parede entre duas células vizinhas (só vizinhança em cruz)? */
export function paredeEntre(x1: number, y1: number, x2: number, y2: number): boolean {
	if (x2 === x1 + 1 && y2 === y1) return paredes.has(chaveV(x2, y1));
	if (x2 === x1 - 1 && y2 === y1) return paredes.has(chaveV(x1, y1));
	if (y2 === y1 + 1 && x2 === x1) return paredes.has(chaveH(x1, y2));
	if (y2 === y1 - 1 && x2 === x1) return paredes.has(chaveH(x1, y1));
	return false;
}

export type TipoDeco = 'janela' | 'tv' | 'metas' | 'mapa' | 'neon' | 'quadro' | 'calendario';

/** Decoração pendurada numa parede alta do fundo, ocupando `largura` segmentos. */
export type Decoracao = { linha: 'h' | 'v'; x: number; y: number; tipo: TipoDeco; largura: number };

const naParedeNorte = (x: number, tipo: TipoDeco, largura = 1): Decoracao => ({ linha: 'h', x, y: 4, tipo, largura });
const naParedeOeste = (y: number, tipo: TipoDeco, largura = 1): Decoracao => ({ linha: 'v', x: 4, y, tipo, largura });

export const DECORACOES: Decoracao[] = [
	// Diretoria
	naParedeNorte(5, 'janela'),
	naParedeNorte(6, 'janela'),
	naParedeNorte(8, 'mapa', 2),
	naParedeNorte(10, 'janela'),
	// Reunião
	naParedeNorte(13, 'janela'),
	naParedeNorte(15, 'tv', 2),
	naParedeNorte(18, 'janela'),
	// Financeiro
	naParedeNorte(21, 'janela'),
	naParedeNorte(23, 'quadro'),
	naParedeNorte(24, 'janela'),
	// Comercial
	naParedeNorte(27, 'janela'),
	naParedeNorte(29, 'metas', 2),
	naParedeNorte(32, 'janela'),
	// Desenvolvimento & IA
	naParedeNorte(35, 'janela'),
	naParedeNorte(37, 'neon', 2),
	// Conteúdo (parede oeste)
	naParedeOeste(16, 'janela'),
	naParedeOeste(18, 'calendario', 2),
	naParedeOeste(21, 'janela'),
	naParedeOeste(23, 'janela')
];

export type Segmento = {
	/** 'x': corre ao longo de x, na linha y. 'y': corre ao longo de y, na coluna x. */
	orient: 'x' | 'y';
	x: number;
	y: number;
	/** As paredes do fundo (norte e oeste) são altas, com janela; as outras são cortadas na altura do joelho para ver dentro das salas. */
	alta: boolean;
};

export const SEGMENTOS: Segmento[] = [...paredes].map((k) => {
	const [x, y] = k.slice(1).split(',').map(Number);
	if (k[0] === 'h') return { orient: 'x', x, y, alta: y === PREDIO.y0 && x >= PREDIO.x0 && x <= PREDIO.x1 };
	return { orient: 'y', x, y, alta: x === PREDIO.x0 && y >= PREDIO.y0 && y <= PREDIO.y1 };
});

// --------------------------------------------------------------------- móveis

export type TipoItem =
	| 'mesa'
	| 'monitor'
	| 'cadeira'
	| 'planta'
	| 'estante'
	| 'arquivo'
	| 'cofre'
	| 'sofa'
	| 'mesaCentro'
	| 'mesaReuniao'
	| 'tvPainel'
	| 'quadro'
	| 'rack'
	| 'nucleo'
	| 'balcao'
	| 'bancada'
	| 'cafeteira'
	| 'geladeira'
	| 'pufe'
	| 'pingPong'
	| 'camera'
	| 'softbox'
	| 'fundo'
	| 'prancheta'
	| 'bebedouro'
	| 'luzAnel'
	| 'arvore'
	| 'pinheiro'
	| 'arbusto'
	| 'carro'
	| 'placa'
	| 'banco'
	| 'poste';

/**
 * Para onde o móvel "olha": a tela do monitor, o assento da cadeira, a frente
 * da estante. 'x' e 'y' ficam de frente para quem joga; '-x' e '-y', de costas.
 */
export type Frente = 'x' | 'y' | '-x' | '-y';

export type Item = {
	id: string;
	tipo: TipoItem;
	x: number;
	y: number;
	w: number;
	d: number;
	h: number;
	/** Altura da base (o monitor fica em cima da mesa). */
	z: number;
	sala: string | null;
	nome: string;
	bloqueia: boolean;
	cor?: string;
	frente?: Frente;
	variante?: string;
};

type NovoItem = Omit<Item, 'id' | 'z' | 'sala' | 'bloqueia' | 'nome'> &
	Partial<Pick<Item, 'z' | 'bloqueia' | 'nome'>>;

const NOMES: Partial<Record<TipoItem, string>> = {
	mesa: 'Mesa de trabalho',
	monitor: 'Computador',
	cadeira: 'Cadeira',
	planta: 'Planta',
	estante: 'Estante',
	arquivo: 'Arquivo',
	cofre: 'Cofre',
	sofa: 'Sofá',
	mesaCentro: 'Mesa de centro',
	mesaReuniao: 'Mesa de reunião',
	tvPainel: 'Painel de resultados',
	quadro: 'Quadro',
	rack: 'Servidor',
	nucleo: 'Núcleo de IA',
	balcao: 'Balcão da recepção',
	bancada: 'Bancada',
	cafeteira: 'Cafeteira',
	geladeira: 'Geladeira',
	pufe: 'Pufe',
	pingPong: 'Mesa de pingue-pongue',
	camera: 'Câmera',
	softbox: 'Iluminação',
	fundo: 'Fundo infinito',
	prancheta: 'Prancheta de desenho',
	bebedouro: 'Bebedouro',
	luzAnel: 'Ring light',
	arvore: 'Árvore',
	pinheiro: 'Pinheiro',
	arbusto: 'Arbusto',
	carro: 'Carro',
	placa: 'Placa da Dunamis',
	banco: 'Banco',
	poste: 'Poste de luz'
};

function montarItens(): Item[] {
	const itens: Item[] = [];
	const add = (n: NovoItem) => {
		const item: Item = {
			id: `i${itens.length + 1}`,
			z: 0,
			bloqueia: true,
			nome: NOMES[n.tipo] ?? n.tipo,
			sala: zonaNoPonto(n.x + n.w / 2, n.y + n.d / 2),
			...n
		};
		itens.push(item);
		return item;
	};

	const planta = (x: number, y: number, grande = false) => {
		const t = grande ? 0.5 : 0.38;
		add({ tipo: 'planta', x: x + 0.5 - t / 2, y: y + 0.5 - t / 2, w: t, d: t, h: grande ? 1.5 : 1.05, variante: grande ? 'grande' : undefined });
	};

	/** Mesa de 2 células com computador e cadeira na frente (lado +y). */
	const estacao = (x: number, y: number, tela: string, opcoes: { duplo?: boolean; cor?: string; cadeira?: string } = {}) => {
		add({ tipo: 'mesa', x: x + 0.08, y: y + 0.15, w: 1.84, d: 0.7, h: 0.52, cor: opcoes.cor ?? '#f3f0ea' });
		const monitor = (mx: number, mw: number) =>
			add({ tipo: 'monitor', x: mx, y: y + 0.38, w: mw, d: 0.08, h: 0.46, z: 0.52, frente: 'y', variante: tela, bloqueia: false });
		if (opcoes.duplo) {
			monitor(x + 0.22, 0.72);
			monitor(x + 1.06, 0.72);
		} else monitor(x + 0.6, 0.8);
		add({ tipo: 'cadeira', x: x + 0.26, y: y + 1.22, w: 0.48, d: 0.48, h: 0.92, frente: '-y', cor: opcoes.cadeira });
	};

	// Diretoria
	add({ tipo: 'estante', x: 4.06, y: 5, w: 0.42, d: 3, h: 1.75, frente: 'x' });
	add({ tipo: 'mesa', x: 6, y: 6.15, w: 3, d: 0.85, h: 0.54, cor: '#7a5236', variante: 'executiva' });
	add({ tipo: 'monitor', x: 7.05, y: 6.35, w: 0.9, d: 0.08, h: 0.48, z: 0.54, frente: '-y', variante: 'texto', bloqueia: false });
	add({ tipo: 'cadeira', x: 7.2, y: 5.2, w: 0.6, d: 0.6, h: 1.15, frente: 'y', cor: '#1c2534', variante: 'executiva', nome: 'Cadeira do CEO' });
	add({ tipo: 'cadeira', x: 6.4, y: 7.35, w: 0.48, d: 0.48, h: 0.9, frente: '-y', cor: '#8a6a4a' });
	add({ tipo: 'cadeira', x: 8.12, y: 7.35, w: 0.48, d: 0.48, h: 0.9, frente: '-y', cor: '#8a6a4a' });
	add({ tipo: 'sofa', x: 4.1, y: 9.4, w: 0.85, d: 2.2, h: 0.75, frente: 'x', cor: '#3f4d63' });
	add({ tipo: 'mesaCentro', x: 5.55, y: 9.95, w: 0.9, d: 1.1, h: 0.32, cor: '#5d3f2a' });
	planta(10, 4, true);
	planta(11, 12);
	planta(4, 12);

	// Sala de Reunião
	add({ tipo: 'mesaReuniao', x: 14, y: 7, w: 4, d: 2, h: 0.54, cor: '#f4f1eb' });
	for (const x of [14, 15, 16, 17]) {
		add({ tipo: 'cadeira', x: x + 0.26, y: 6.2, w: 0.48, d: 0.48, h: 0.9, frente: 'y', cor: '#2f3a4f' });
		add({ tipo: 'cadeira', x: x + 0.26, y: 9.32, w: 0.48, d: 0.48, h: 0.9, frente: '-y', cor: '#2f3a4f' });
	}
	add({ tipo: 'cadeira', x: 13.3, y: 7.76, w: 0.48, d: 0.48, h: 0.9, frente: 'x', cor: '#2f3a4f' });
	add({ tipo: 'cadeira', x: 18.22, y: 7.76, w: 0.48, d: 0.48, h: 0.9, frente: '-x', cor: '#2f3a4f' });
	add({ tipo: 'quadro', x: 12.1, y: 10, w: 0.28, d: 1.7, h: 1.5, frente: 'x', variante: 'pauta', nome: 'Quadro da pauta' });
	planta(12, 4);
	planta(19, 4);
	planta(19, 12);

	// Financeiro
	estacao(21, 6, 'planilha');
	estacao(21, 9, 'grafico');
	add({ tipo: 'cofre', x: 24.4, y: 4.15, w: 0.75, d: 0.7, h: 0.85, frente: 'y' });
	add({ tipo: 'arquivo', x: 20.1, y: 10, w: 0.55, d: 0.7, h: 1.05, frente: 'x' });
	add({ tipo: 'arquivo', x: 20.1, y: 11, w: 0.55, d: 0.7, h: 1.05, frente: 'x' });
	planta(25, 11);

	// Comercial
	estacao(27, 6, 'crm');
	estacao(30, 6, 'grafico');
	estacao(27, 9, 'texto');
	estacao(30, 9, 'crm');
	add({ tipo: 'bebedouro', x: 33.2, y: 8.2, w: 0.55, d: 0.55, h: 1.25 });
	planta(33, 4, true);
	planta(26, 12);
	planta(33, 12);

	// Desenvolvimento & IA
	for (const x of [41, 42, 43]) add({ tipo: 'rack', x: x + 0.12, y: 4.12, w: 0.76, d: 0.72, h: 1.95, frente: 'y' });
	estacao(35, 6, 'codigo', { duplo: true, cor: '#3a465c', cadeira: '#11161f' });
	estacao(38, 6, 'codigo', { duplo: true, cor: '#3a465c', cadeira: '#11161f' });
	estacao(35, 9, 'codigo', { duplo: true, cor: '#3a465c', cadeira: '#11161f' });
	estacao(38, 9, 'design', { duplo: true, cor: '#3a465c', cadeira: '#11161f' });
	add({ tipo: 'nucleo', x: 41.35, y: 8.35, w: 1.3, d: 1.3, h: 1.6 });
	planta(43, 12);
	planta(34, 4);

	// Corredor
	planta(4, 13, true);
	planta(43, 13, true);

	// Conteúdo & Social Media
	estacao(5, 17, 'social');
	estacao(8, 17, 'social');
	add({ tipo: 'luzAnel', x: 9.2, y: 20.2, w: 0.6, d: 0.6, h: 1.7 });
	add({ tipo: 'pufe', x: 5.1, y: 21.3, w: 0.8, d: 0.8, h: 0.5, cor: '#f2b33d', bloqueia: true });
	add({ tipo: 'pufe', x: 6.4, y: 22.6, w: 0.8, d: 0.8, h: 0.5, cor: '#4fb6a8', bloqueia: true });
	planta(10, 24, true);
	planta(4, 24);

	// Estúdio
	add({ tipo: 'fundo', x: 11.06, y: 17.6, w: 0.24, d: 3.2, h: 2.2, frente: 'x', nome: 'Fundo infinito' });
	add({ tipo: 'camera', x: 14.9, y: 18.9, w: 0.5, d: 0.5, h: 1.35, frente: '-x' });
	add({ tipo: 'softbox', x: 13.2, y: 16.4, w: 0.6, d: 0.6, h: 1.8 });
	add({ tipo: 'softbox', x: 13.2, y: 22.2, w: 0.6, d: 0.6, h: 1.8 });
	add({ tipo: 'cadeira', x: 15.3, y: 22.4, w: 0.5, d: 0.5, h: 1.0, frente: '-x', cor: '#2b2b2b', variante: 'diretor', nome: 'Cadeira do diretor' });

	// Recepção
	add({ tipo: 'balcao', x: 19, y: 18.15, w: 3, d: 0.75, h: 0.98, frente: 'y' });
	add({ tipo: 'cadeira', x: 20.26, y: 17.25, w: 0.48, d: 0.48, h: 0.9, frente: 'y', cor: '#2f3a4f' });
	add({ tipo: 'sofa', x: 17.1, y: 20, w: 0.85, d: 2, h: 0.75, frente: 'x', cor: '#d9cdb8' });
	add({ tipo: 'sofa', x: 23.05, y: 20, w: 0.85, d: 2, h: 0.75, frente: '-x', cor: '#d9cdb8' });
	add({ tipo: 'bebedouro', x: 23.2, y: 16.2, w: 0.55, d: 0.55, h: 1.25 });
	planta(17, 16, true);
	planta(17, 24, true);
	planta(23, 24, true);

	// Design & Criação
	add({ tipo: 'quadro', x: 24.1, y: 18, w: 0.28, d: 1.8, h: 1.55, frente: 'x', variante: 'moodboard', nome: 'Moodboard' });
	estacao(26, 18, 'design', { duplo: true });
	estacao(26, 21, 'design');
	add({ tipo: 'prancheta', x: 28.95, y: 20.2, w: 0.85, d: 1.1, h: 1.05, frente: '-x' });
	planta(29, 24, true);
	planta(24, 24);

	// Tráfego Pago
	add({ tipo: 'tvPainel', x: 30.12, y: 17, w: 0.3, d: 2, h: 1.7, frente: 'x', variante: 'dashboard' });
	estacao(32, 18, 'grafico', { duplo: true });
	estacao(32, 21, 'grafico');
	planta(35, 24, true);
	planta(30, 24);

	// Copa & Lounge
	add({ tipo: 'geladeira', x: 36.1, y: 15.12, w: 0.8, d: 0.75, h: 1.85, frente: 'y' });
	add({ tipo: 'bancada', x: 41, y: 15.1, w: 3, d: 0.8, h: 0.92, frente: 'y' });
	add({ tipo: 'cafeteira', x: 41.3, y: 15.3, w: 0.42, d: 0.38, h: 0.42, z: 0.92, bloqueia: false });
	add({ tipo: 'pingPong', x: 37.3, y: 18.6, w: 2.4, d: 1.4, h: 0.76 });
	add({ tipo: 'mesaCentro', x: 41.1, y: 18.6, w: 1, d: 1, h: 0.72, cor: '#f4f1eb', variante: 'redonda', nome: 'Mesa do café' });
	add({ tipo: 'pufe', x: 40.05, y: 18.75, w: 0.7, d: 0.7, h: 0.45, cor: '#e0662a' });
	add({ tipo: 'pufe', x: 42.35, y: 19.6, w: 0.7, d: 0.7, h: 0.45, cor: '#3b6ef6' });
	add({ tipo: 'sofa', x: 36.1, y: 21, w: 0.85, d: 2.4, h: 0.75, frente: 'x', cor: '#4f6b4f' });
	add({ tipo: 'mesaCentro', x: 37.4, y: 21.6, w: 0.9, d: 1.2, h: 0.32, cor: '#6b4a33' });
	planta(43, 24, true);
	planta(43, 21);

	// ------------------------------------------------------------- lado de fora
	const arvores: [number, number][] = [
		[2, 1], [6, 2], [11, 1], [16, 2], [21, 1], [26, 2], [31, 1], [36, 2], [41, 1], [45, 2],
		[1, 6], [2, 11], [1, 16], [2, 21], [46, 6], [45, 11], [46, 16], [45, 21],
		[3, 28], [8, 29], [12, 28], [26, 29], [46, 28], [1, 26]
	];
	for (const [x, y] of arvores) {
		const pinheiro = sorteio(x, y, 7) < 0.4;
		const t = pinheiro ? 0.6 : 0.7;
		add({ tipo: pinheiro ? 'pinheiro' : 'arvore', x: x + 0.5 - t / 2, y: y + 0.5 - t / 2, w: t, d: t, h: pinheiro ? 2.6 : 2.3 });
	}
	for (const x of [4, 6, 8, 10, 12, 14, 16, 24, 26, 28]) {
		add({ tipo: 'arbusto', x: x + 0.15, y: 26.2, w: 0.7, d: 0.6, h: 0.55 });
	}
	add({ tipo: 'placa', x: 14.6, y: 27.4, w: 2.8, d: 0.5, h: 1.15, frente: 'y' });
	add({ tipo: 'banco', x: 23.3, y: 27.35, w: 1.4, d: 0.45, h: 0.45, frente: 'y' });
	add({ tipo: 'poste', x: 18.35, y: 27.35, w: 0.3, d: 0.3, h: 2.4 });
	add({ tipo: 'poste', x: 22.35, y: 27.35, w: 0.3, d: 0.3, h: 2.4 });
	add({ tipo: 'carro', x: 30.55, y: 27.55, w: 0.9, d: 1.9, h: 0.75, cor: '#ff6f00', frente: 'y' });
	add({ tipo: 'carro', x: 34.55, y: 27.55, w: 0.9, d: 1.9, h: 0.75, cor: '#3b6ef6', frente: 'y' });
	add({ tipo: 'carro', x: 40.55, y: 27.55, w: 0.9, d: 1.9, h: 0.75, cor: '#e9edf2', frente: 'y' });
	return itens;
}

export const ITENS: Item[] = montarItens();

/** Coisas chapadas no chão: tapetes, capacho, faixas do estacionamento. */
export type Tapete = { x0: number; y0: number; x1: number; y1: number; cor: string; variante?: 'listras' | 'logo' | 'redondo' | 'capacho' | 'faixa' };

export const TAPETES: Tapete[] = [
	{ x0: 4.7, y0: 9.3, x1: 7.3, y1: 11.9, cor: '#b5523b', variante: 'listras' },
	{ x0: 13.4, y0: 6.4, x1: 18.6, y1: 9.6, cor: '#8597ad' },
	{ x0: 19, y0: 20, x1: 22, y1: 23, cor: '#ff6f00', variante: 'logo' },
	{ x0: 4.8, y0: 20.9, x1: 7.6, y1: 23.7, cor: '#f6a6b6', variante: 'redondo' },
	{ x0: 37, y0: 21.2, x1: 38.8, y1: 23.2, cor: '#c9b48a' },
	{ x0: 19.15, y0: 25.12, x1: 21.85, y1: 25.8, cor: '#5b4a3a', variante: 'capacho' },
	...[30, 32, 34, 36, 38, 40, 42, 44].map(
		(x): Tapete => ({ x0: x - 0.04, y0: 27.25, x1: x + 0.04, y1: 29.75, cor: '#f2f2ee', variante: 'faixa' })
	)
];

// ------------------------------------------------------------ células livres

const bloqueio = new Uint8Array(LARGURA * ALTURA);
for (const it of ITENS) {
	if (!it.bloqueia) continue;
	const e = 0.001;
	for (let y = Math.floor(it.y + e); y <= Math.ceil(it.y + it.d - e) - 1; y++) {
		for (let x = Math.floor(it.x + e); x <= Math.ceil(it.x + it.w - e) - 1; x++) {
			if (dentroDoMapa(x, y)) bloqueio[y * LARGURA + x] = 1;
		}
	}
}

/** Dá para pisar na célula? */
export function celulaLivre(x: number, y: number): boolean {
	return dentroDoMapa(x, y) && bloqueio[y * LARGURA + x] === 0;
}

/** Célula livre mais perto da porta da sala, do lado de dentro: o "chegar na sala". */
export function chegadaDaSala(id: string): { x: number; y: number } | null {
	const s = SALA_POR_ID.get(id);
	if (!s) return null;
	const cx = (s.x0 + s.x1 + 1) / 2;
	const cy = (s.y0 + s.y1 + 1) / 2;
	let melhor: { x: number; y: number; d: number } | null = null;
	for (let y = s.y0; y <= s.y1; y++) {
		for (let x = s.x0; x <= s.x1; x++) {
			if (!celulaLivre(x, y)) continue;
			const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
			if (!melhor || d < melhor.d) melhor = { x, y, d };
		}
	}
	return melhor ? { x: melhor.x + 0.5, y: melhor.y + 0.5 } : null;
}
