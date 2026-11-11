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
//
// Em 10/11/2026 o prédio cresceu 16 casas para a esquerda (pedido do Bruno):
// o corredor continua até a parede oeste, com a sala do Bruno e a da Aline do
// lado de cima e 3 salas vazias do lado de baixo, esperando ele decidir o que
// vão ser. Tudo o que já existia andou junto (x + 16).

import { sorteio } from './iso';

export const LARGURA = 64;
export const ALTURA = 31;

/** Células internas do prédio (inclusive). As paredes do fundo são as da linha y = 4 e da coluna x = 4. */
export const PREDIO = { x0: 4, y0: 4, x1: 59, y1: 24 };

/** Onde o avatar aparece na primeira visita: no meio da recepção. */
export const INICIO = { x: 36.5, y: 22.2 };


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
	/**
	 * Sala de uma pessoa (o id em `colaboradores`): quando ela fica parada, senta
	 * aqui, primeiro na `cadeira`; e ninguém mais é sorteado para sentar nela.
	 */
	dono?: { id: string; cadeira: string };
	/**
	 * Pedaços da sala com outro piso (a sala que juntou duas: o Marketing guarda
	 * o chão escuro do estúdio). O resto usa `piso` e `corPiso`.
	 */
	areas?: { x0: number; y0: number; x1: number; y1: number; piso: TipoPiso; corPiso: string }[];
};

const portaNorte = (x: number) => [x, x + 1].map((c): Aresta => ({ linha: 'h', x: c, y: 13 }));
const portaSul = (x: number) => [x, x + 1].map((c): Aresta => ({ linha: 'h', x: c, y: 15 }));

/** Bruno Santana e Aline Santana, em `colaboradores` (as duas salas da diretoria). */
export const BRUNO = '52875a8f-fa14-49e6-905a-7baf08335da6';
export const ALINE = '8bed9013-ff26-4410-8a35-c18396503870';

/** Sala vazia (pedido do Bruno, 10/11/2026): fica assim até ele decidir o que ela vai ser. */
const salaVazia = (n: number, x0: number, x1: number, porta: number, lado: 'norte' | 'sul' = 'sul'): Sala => ({
	id: `sala-${n}`,
	nome: `Sala ${n}`,
	setor: 'A definir',
	descricao: 'Sala nova, ainda vazia: a diretoria vai decidir o que ela vai ser.',
	cor: '#8a94a6',
	piso: 'piso',
	corPiso: '#e4e1da',
	x0,
	y0: lado === 'sul' ? 15 : 4,
	x1,
	y1: lado === 'sul' ? 24 : 12,
	portas: lado === 'sul' ? portaSul(porta) : portaNorte(porta),
	especialidades: []
});

export const SALAS: Sala[] = [
	{
		id: 'sala-bruno',
		nome: 'Sala do Bruno',
		setor: 'Diretoria',
		descricao: 'Bruno Santana, CEO e diretor executivo: estratégia, vendas e o rumo da agência.',
		cor: '#3b6ef6',
		piso: 'madeira',
		corPiso: '#b89470',
		x0: 4,
		y0: 4,
		x1: 11,
		y1: 12,
		portas: portaNorte(7),
		especialidades: ['Estratégia', 'Vendas', 'Liderança'],
		dono: { id: BRUNO, cadeira: 'Cadeira do Bruno' }
	},
	{
		id: 'sala-aline',
		nome: 'Sala da Aline',
		setor: 'Diretoria',
		descricao: 'Aline Santana, CEO e diretora financeira: as finanças, os clientes e a operação.',
		cor: '#593212',
		piso: 'madeira',
		corPiso: '#d2b48f',
		x0: 12,
		y0: 4,
		x1: 19,
		y1: 12,
		portas: portaNorte(15),
		especialidades: ['Gestão financeira', 'Gestão de clientes', 'Operação'],
		dono: { id: ALINE, cadeira: 'Cadeira da Aline' }
	},
	// A Diretoria voltou em 11/11/2026, com os três diretores Bandoletes (no dia
	// 10 ela tinha sido esvaziada: o assessor foi para a sala do Bruno e a Aline
	// ganhou uma assessora na dela). Fica entre as salas dos CEOs e a Reunião
	{
		id: 'diretoria',
		nome: 'Diretoria',
		setor: 'Diretoria',
		descricao: 'Os três diretores Bandoletes, logo abaixo dos CEOs: o Estratégico decide o rumo, o Tático transforma em plano e o Operacional faz acontecer.',
		cor: '#c08a2b',
		piso: 'carpete',
		corPiso: '#b9ab96',
		x0: 20,
		y0: 4,
		x1: 27,
		y1: 12,
		portas: portaNorte(24),
		especialidades: ['Estratégia e rumo', 'Planejamento tático', 'Operação do dia a dia', 'Coordenação dos gerentes']
	},
	{
		id: 'reuniao',
		nome: 'Sala de Reunião',
		setor: 'Reuniões',
		descricao: 'Onde a equipe e os clientes se encontram: pautas, apresentações e alinhamentos.',
		cor: '#5b7bb5',
		piso: 'carpete',
		corPiso: '#a7b6c9',
		x0: 28,
		y0: 4,
		x1: 35,
		y1: 12,
		portas: portaNorte(31),
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
		x0: 36,
		y0: 4,
		x1: 41,
		y1: 12,
		portas: portaNorte(38),
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
		x0: 42,
		y0: 4,
		x1: 49,
		y1: 12,
		portas: portaNorte(45),
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
		x0: 50,
		y0: 4,
		x1: 59,
		y1: 12,
		portas: portaNorte(54),
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
		x1: 59,
		y1: 14,
		portas: [],
		especialidades: []
	},
	{
		// Conteúdo & Social Media e Estúdio viraram uma sala só (pedido do Bruno,
		// 10/11/2026), sem a parede do meio. O lado do estúdio mantém o chão escuro
		id: 'marketing',
		nome: 'Marketing',
		setor: 'Marketing',
		descricao: 'Conteúdo, redes sociais e audiovisual: pautas, calendário, posts de todos os clientes, reels, spots e fotos de produto.',
		cor: '#e05a7a',
		piso: 'piso',
		corPiso: '#f1d0c8',
		x0: 20,
		y0: 15,
		x1: 32,
		y1: 24,
		portas: [...portaSul(23), ...portaSul(29)],
		especialidades: ['Calendário editorial', 'Carrosséis e legendas', 'Roteiros de vídeo', 'Spots e fotos de produto'],
		areas: [{ x0: 27, y0: 15, x1: 32, y1: 24, piso: 'estudio', corPiso: '#3a3a42' }]
	},
	{
		id: 'recepcao',
		nome: 'Recepção',
		setor: 'Atendimento',
		descricao: 'A porta de entrada da Dunamis: quem chega, quem é atendido e quem começa com a gente.',
		cor: '#ff6f00',
		piso: 'marmore',
		corPiso: '#eee8de',
		x0: 33,
		y0: 15,
		x1: 39,
		y1: 24,
		// Aberta para o corredor (sem parede) e com a porta de vidro para a rua.
		portas: [
			...[33, 34, 35, 36, 37, 38, 39].map((x): Aresta => ({ linha: 'h', x, y: 15 })),
			...[35, 36, 37].map((x): Aresta => ({ linha: 'h', x, y: 25 }))
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
		x0: 40,
		y0: 15,
		x1: 45,
		y1: 24,
		portas: portaSul(42),
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
		x0: 46,
		y0: 15,
		x1: 51,
		y1: 24,
		portas: portaSul(48),
		especialidades: ['Anúncios Google', 'Anúncios Meta', 'Relatórios de resultado']
	},
	{
		id: 'copa',
		nome: 'Copa & Lounge',
		setor: 'Convivência',
		descricao: 'Café, pausa e conversa: é aqui que os Bandoletes passam as pausas.',
		cor: '#b07a3c',
		piso: 'cozinha',
		corPiso: '#efe2c8',
		x0: 52,
		y0: 15,
		x1: 59,
		y1: 24,
		portas: portaSul(55),
		especialidades: ['Pausa', 'Bandoletes livres']
	},
	// As 3 vazias de baixo, entre a parede oeste e o Conteúdo
	salaVazia(1, 4, 8, 5),
	salaVazia(2, 9, 13, 10),
	salaVazia(3, 14, 19, 16)
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

export const ESTACIONAMENTO = { x0: 46, y0: 27, x1: 59, y1: 30 };

/** O pedaço de piso diferente da sala nessa célula (Marketing: o lado do estúdio), ou null. */
function areaDaCelula(x: number, y: number) {
	const z = zonaDaCelula(x, y);
	return (z && SALA_POR_ID.get(z)!.areas?.find((a) => x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1)) || null;
}

/** A cor do piso de dentro do prédio nessa célula. */
export function corDoPiso(x: number, y: number): string {
	const z = zonaDaCelula(x, y);
	return areaDaCelula(x, y)?.corPiso ?? (z ? SALA_POR_ID.get(z)!.corPiso : '#e6dfd2');
}

export function pisoDaCelula(x: number, y: number): TipoPiso {
	const z = zonaDaCelula(x, y);
	if (z) return areaDaCelula(x, y)?.piso ?? SALA_POR_ID.get(z)!.piso;
	if (y === 25 && x >= 2 && x <= 61) return 'calcada';
	if (x >= 35 && x <= 37 && y >= 26) return 'calcada';
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
	// Diretoria (11/11/2026): o quadro de metas no meio, janelas dos lados
	naParedeNorte(21, 'janela'),
	naParedeNorte(23, 'metas', 2),
	naParedeNorte(26, 'janela'),
	// Reunião
	naParedeNorte(29, 'janela'),
	naParedeNorte(31, 'tv', 2),
	naParedeNorte(34, 'janela'),
	// Financeiro
	naParedeNorte(37, 'janela'),
	naParedeNorte(39, 'quadro'),
	naParedeNorte(40, 'janela'),
	// Comercial
	naParedeNorte(43, 'janela'),
	naParedeNorte(45, 'metas', 2),
	naParedeNorte(48, 'janela'),
	// Desenvolvimento & IA
	naParedeNorte(51, 'janela'),
	naParedeNorte(53, 'neon', 2),
	// Sala do Bruno (parede norte e oeste)
	naParedeNorte(5, 'janela'),
	naParedeNorte(8, 'metas', 2),
	naParedeOeste(10, 'mapa', 2),
	// Sala da Aline
	naParedeNorte(15, 'quadro'),
	naParedeNorte(17, 'janela'),
	// Sala 1, a única das vazias com parede do fundo (a oeste)
	naParedeOeste(17, 'janela'),
	naParedeOeste(21, 'janela')
	// O Conteúdo perdeu o calendário e as janelas: a parede oeste dele virou
	// parede de dentro (baixa), entre ele e a Sala 3
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
	// O id sai do tipo e do lugar do móvel (não da ordem em que ele nasce): mexer
	// numa sala não muda o id dos móveis das outras, e o lugar guardado de quem
	// está sentado continua valendo
	const ids = new Set<string>();
	const idDe = (n: NovoItem) => {
		const base = `${n.tipo.toLowerCase()}-${Math.round(n.x * 100)}-${Math.round(n.y * 100)}`;
		let id = base;
		for (let k = 2; ids.has(id); k++) id = `${base}-${k}`;
		ids.add(id);
		return id;
	};
	const add = (n: NovoItem) => {
		const item: Item = {
			id: idDe(n),
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

	/**
	 * Baia inteira (pedido do Bruno, 09/11/2026): mesa grande com `lugares` de
	 * cada lado (3 de saída; o Dev passou a 4 em 10/11/2026), computadores costas
	 * com costas e uma cadeira de agente em cada. Ocupa `lugares` casas de
	 * largura e 3 de fundo, a partir de (x, y): cadeiras do norte na linha y,
	 * mesa na y+1, cadeiras do sul na y+2. Deixar uma linha livre acima e
	 * abaixo, que é por onde se chega às cadeiras.
	 */
	const baia = (x: number, y: number, telas: string[], opcoes: { cor?: string; cadeira?: string; lugares?: number } = {}) => {
		const n = opcoes.lugares ?? 3;
		add({ tipo: 'mesa', x: x + 0.05, y: y + 1.05, w: n - 0.1, d: 0.9, h: 0.52, cor: opcoes.cor ?? '#f3f0ea' });
		for (let i = 0; i < n; i++) {
			const cx = x + i + 0.5;
			// De costas um para o outro: o de trás vira para o norte, o da frente para o sul
			add({ tipo: 'monitor', x: cx - 0.36, y: y + 1.42, w: 0.72, d: 0.08, h: 0.46, z: 0.52, frente: '-y', variante: telas[i % telas.length], bloqueia: false });
			add({ tipo: 'monitor', x: cx - 0.36, y: y + 1.5, w: 0.72, d: 0.08, h: 0.46, z: 0.52, frente: 'y', variante: telas[(i + 1) % telas.length], bloqueia: false });
			add({ tipo: 'cadeira', x: cx - 0.24, y: y + 0.3, w: 0.48, d: 0.48, h: 0.92, frente: 'y', cor: opcoes.cadeira, nome: 'Cadeira de Bandolete' });
			add({ tipo: 'cadeira', x: cx - 0.24, y: y + 2.22, w: 0.48, d: 0.48, h: 0.92, frente: '-y', cor: opcoes.cadeira, nome: 'Cadeira de Bandolete' });
		}
	};

	/**
	 * Mesa comprida de 2 lugares lado a lado (pedido do Bruno, 09/11/2026, para
	 * o Comercial): ocupa 3 casas de largura, com 2 computadores e 2 cadeiras na
	 * frente (lado +y), como a estação, só que maior.
	 */
	const mesaDupla = (x: number, y: number, telas: [string, string], opcoes: { cor?: string; cadeira?: string } = {}) => {
		add({ tipo: 'mesa', x: x + 0.15, y: y + 0.1, w: 2.7, d: 0.8, h: 0.52, cor: opcoes.cor ?? '#f3f0ea' });
		[x + 0.85, x + 2.15].forEach((cx, i) => {
			add({ tipo: 'monitor', x: cx - 0.4, y: y + 0.36, w: 0.8, d: 0.08, h: 0.46, z: 0.52, frente: 'y', variante: telas[i], bloqueia: false });
			add({ tipo: 'cadeira', x: cx - 0.24, y: y + 1.22, w: 0.48, d: 0.48, h: 0.92, frente: '-y', cor: opcoes.cadeira });
		});
	};

	/**
	 * Mesa de frente para a sala: a cadeira atrás (linha y) e a mesa na frente
	 * (linha y+1), com o computador virado para quem senta. Ocupa 2 casas de
	 * largura. Deixar livre uma casa ao lado ou acima da cadeira.
	 */
	const mesaDeFrente = (
		x: number,
		y: number,
		o: { tela: string; mesa: string; cadeira: string; executiva?: boolean; cor?: string; corCadeira?: string }
	) => {
		add({ tipo: 'mesa', x: x + 0.1, y: y + 1.12, w: 1.8, d: 0.78, h: 0.54, cor: o.cor ?? '#7a5236', variante: o.executiva ? 'executiva' : undefined, nome: o.mesa });
		add({ tipo: 'monitor', x: x + 0.6, y: y + 1.32, w: 0.8, d: 0.08, h: 0.46, z: 0.54, frente: '-y', variante: o.tela, bloqueia: false });
		if (o.executiva)
			add({ tipo: 'cadeira', x: x + 0.7, y: y + 0.3, w: 0.6, d: 0.6, h: 1.1, frente: 'y', cor: o.corCadeira ?? '#1c2534', variante: 'executiva', nome: o.cadeira });
		else add({ tipo: 'cadeira', x: x + 0.76, y: y + 0.32, w: 0.48, d: 0.48, h: 0.92, frente: 'y', cor: o.corCadeira ?? '#2f3a4f', nome: o.cadeira });
	};

	/**
	 * Mesa do gerente (pedido do Bruno, 09/11/2026): cada departamento vai ter
	 * um agente gerente, e ele precisa de um lugar. Executiva, de madeira, de
	 * frente para a equipe.
	 */
	const mesaGerente = (x: number, y: number, tela: string) =>
		mesaDeFrente(x, y, { tela, mesa: 'Mesa do gerente', cadeira: 'Cadeira do gerente', executiva: true });

	// Sala de Reunião
	add({ tipo: 'mesaReuniao', x: 30, y: 7, w: 4, d: 2, h: 0.54, cor: '#f4f1eb' });
	for (const x of [30, 31, 32, 33]) {
		add({ tipo: 'cadeira', x: x + 0.26, y: 6.2, w: 0.48, d: 0.48, h: 0.9, frente: 'y', cor: '#2f3a4f' });
		add({ tipo: 'cadeira', x: x + 0.26, y: 9.32, w: 0.48, d: 0.48, h: 0.9, frente: '-y', cor: '#2f3a4f' });
	}
	add({ tipo: 'cadeira', x: 29.3, y: 7.76, w: 0.48, d: 0.48, h: 0.9, frente: 'x', cor: '#2f3a4f' });
	add({ tipo: 'cadeira', x: 34.22, y: 7.76, w: 0.48, d: 0.48, h: 0.9, frente: '-x', cor: '#2f3a4f' });
	add({ tipo: 'quadro', x: 28.1, y: 10, w: 0.28, d: 1.7, h: 1.5, frente: 'x', variante: 'pauta', nome: 'Quadro da pauta' });
	planta(28, 4);
	planta(35, 4);
	planta(35, 12);

	// Financeiro: o gerente no fundo, 3 mesas de 1 computador
	mesaGerente(37, 4, 'planilha');
	estacao(37, 7, 'planilha');
	estacao(39, 7, 'grafico');
	estacao(38, 10, 'texto');
	add({ tipo: 'cofre', x: 40.4, y: 4.15, w: 0.75, d: 0.7, h: 0.85, frente: 'y' });
	add({ tipo: 'arquivo', x: 36.1, y: 10, w: 0.55, d: 0.7, h: 1.05, frente: 'x' });
	add({ tipo: 'arquivo', x: 36.1, y: 11, w: 0.55, d: 0.7, h: 1.05, frente: 'x' });
	planta(41, 11);

	// Comercial
	mesaGerente(45, 4, 'grafico');
	mesaDupla(43, 6, ['crm', 'grafico']);
	mesaDupla(46, 6, ['grafico', 'texto']);
	mesaDupla(43, 9, ['texto', 'crm']);
	mesaDupla(46, 9, ['crm', 'grafico']);
	add({ tipo: 'bebedouro', x: 49.2, y: 8.2, w: 0.55, d: 0.55, h: 1.25 });
	planta(49, 4, true);
	planta(42, 12);
	planta(49, 12);

	// Desenvolvimento & IA
	for (const x of [57, 58, 59]) add({ tipo: 'rack', x: x + 0.12, y: 4.12, w: 0.76, d: 0.72, h: 1.95, frente: 'y' });
	// Duas baias de 6 lugares (os agentes de desenvolvimento e IA)
	// Duas baias de 8 lugares (pedido do Bruno, 10/11/2026: mais 2 cadeiras e 2 computadores em cada)
	baia(51, 5, ['codigo', 'codigo', 'design', 'grafico'], { cor: '#3a465c', cadeira: '#11161f', lugares: 4 });
	baia(51, 9, ['codigo', 'grafico', 'codigo', 'design'], { cor: '#3a465c', cadeira: '#11161f', lugares: 4 });
	mesaGerente(55, 5, 'codigo');
	add({ tipo: 'nucleo', x: 57.35, y: 8.35, w: 1.3, d: 1.3, h: 1.6 });
	planta(59, 12);
	// No canto de baixo: no de cima, com as baias de 4 lugares, ela fechava a
	// passagem de trás e as cadeiras do norte ficavam sem chão para chegar
	planta(50, 12);

	// Corredor: uma planta em cada ponta
	planta(4, 13, true);
	planta(59, 13, true);

	// Marketing, lado do conteúdo (era Conteúdo & Social Media)
	// 4 mesas de 1 computador em 2 fileiras e o gerente no fundo
	estacao(21, 17, 'social');
	estacao(24, 17, 'social');
	estacao(21, 20, 'social');
	estacao(24, 20, 'texto');
	mesaGerente(22, 23, 'social');
	add({ tipo: 'luzAnel', x: 26.2, y: 21.2, w: 0.6, d: 0.6, h: 1.7 });
	add({ tipo: 'pufe', x: 20.1, y: 22.1, w: 0.8, d: 0.8, h: 0.5, cor: '#f2b33d', bloqueia: true });
	add({ tipo: 'pufe', x: 25.1, y: 23.1, w: 0.8, d: 0.8, h: 0.5, cor: '#4fb6a8', bloqueia: true });
	// As plantas trocaram de quina (pedido do Bruno, 10/11/2026): as de baixo subiram
	planta(20, 15, true);
	planta(26, 15);

	// Marketing, lado do estúdio (era o Estúdio)
	add({ tipo: 'fundo', x: 27.06, y: 17.6, w: 0.24, d: 3.2, h: 2.2, frente: 'x', nome: 'Fundo infinito' });
	add({ tipo: 'camera', x: 30.9, y: 18.9, w: 0.5, d: 0.5, h: 1.35, frente: '-x' });
	add({ tipo: 'softbox', x: 29.2, y: 16.4, w: 0.6, d: 0.6, h: 1.8 });
	add({ tipo: 'softbox', x: 29.2, y: 22.2, w: 0.6, d: 0.6, h: 1.8 });
	add({ tipo: 'cadeira', x: 31.3, y: 22.4, w: 0.5, d: 0.5, h: 1.0, frente: '-x', cor: '#2b2b2b', variante: 'diretor', nome: 'Cadeira do diretor' });
	// O Marketing tem um gerente só (a mesa do lado do conteúdo); a do estúdio é a de edição
	mesaDeFrente(28, 23, { tela: 'texto', mesa: 'Mesa de edição', cadeira: 'Cadeira de edição', executiva: true });

	// Recepção
	add({ tipo: 'balcao', x: 35, y: 18.15, w: 3, d: 0.75, h: 0.98, frente: 'y' });
	add({ tipo: 'cadeira', x: 36.26, y: 17.25, w: 0.48, d: 0.48, h: 0.9, frente: 'y', cor: '#2f3a4f' });
	add({ tipo: 'sofa', x: 33.1, y: 20, w: 0.85, d: 2, h: 0.75, frente: 'x', cor: '#d9cdb8' });
	add({ tipo: 'sofa', x: 39.05, y: 20, w: 0.85, d: 2, h: 0.75, frente: '-x', cor: '#d9cdb8' });
	add({ tipo: 'bebedouro', x: 39.2, y: 16.2, w: 0.55, d: 0.55, h: 1.25 });
	planta(33, 16, true);
	planta(33, 24, true);
	planta(39, 24, true);

	// Design & Criação
	// 3 mesas de 2 lugares à esquerda, corredor no meio; prancheta, moodboard e gerente à direita.
	// O gerente fica embaixo: em cima, o painel alto do Tráfego (do outro lado da parede) o cobriria
	mesaDupla(40, 16, ['design', 'design']);
	mesaDupla(40, 19, ['design', 'social']);
	mesaDupla(40, 22, ['design', 'design']);
	add({ tipo: 'prancheta', x: 44.95, y: 16.2, w: 0.85, d: 1.1, h: 1.05, frente: '-x' });
	add({ tipo: 'quadro', x: 44.1, y: 19.1, w: 0.28, d: 1.8, h: 1.55, frente: 'x', variante: 'moodboard', nome: 'Moodboard' });
	mesaGerente(44, 22, 'design');
	// A planta grande vai para o outro canto: na frente do gerente, ela o cobria
	planta(45, 24);
	planta(40, 24, true);

	// Tráfego Pago
	add({ tipo: 'tvPainel', x: 46.12, y: 17, w: 0.3, d: 2, h: 1.7, frente: 'x', variante: 'dashboard' });
	// 2 mesas de 2 lugares no meio e o gerente no fundo
	mesaDupla(48, 17, ['grafico', 'grafico']);
	mesaDupla(48, 20, ['grafico', 'crm']);
	mesaGerente(48, 23, 'grafico');
	planta(51, 24, true);
	planta(46, 24);

	// Copa & Lounge
	add({ tipo: 'geladeira', x: 52.1, y: 15.12, w: 0.8, d: 0.75, h: 1.85, frente: 'y' });
	add({ tipo: 'bancada', x: 57, y: 15.1, w: 3, d: 0.8, h: 0.92, frente: 'y' });
	add({ tipo: 'cafeteira', x: 57.3, y: 15.3, w: 0.42, d: 0.38, h: 0.42, z: 0.92, bloqueia: false });
	add({ tipo: 'pingPong', x: 53.3, y: 18.6, w: 2.4, d: 1.4, h: 0.76 });
	add({ tipo: 'mesaCentro', x: 57.1, y: 18.6, w: 1, d: 1, h: 0.72, cor: '#f4f1eb', variante: 'redonda', nome: 'Mesa do café' });
	// Do lado norte da mesa do café: na ponta leste do pingue-pongue, ele tapava
	// o lugar do jogador e a dupla jogava pelos lados (o Bruno viu, 10/11/2026)
	add({ tipo: 'pufe', x: 57.25, y: 17.6, w: 0.7, d: 0.7, h: 0.45, cor: '#e0662a', frente: 'y' });
	add({ tipo: 'pufe', x: 58.35, y: 19.6, w: 0.7, d: 0.7, h: 0.45, cor: '#3b6ef6', frente: '-x' });
	add({ tipo: 'sofa', x: 52.1, y: 21, w: 0.85, d: 2.4, h: 0.75, frente: 'x', cor: '#4f6b4f' });
	add({ tipo: 'mesaCentro', x: 53.4, y: 21.6, w: 0.9, d: 1.2, h: 0.32, cor: '#6b4a33' });
	planta(59, 24, true);
	planta(59, 21);

	// As salas de 10/11/2026 entram depois de todas as outras: o id de cada móvel
	// é a ordem em que ele nasce (i1, i2…), e o lugar de quem está sentado é
	// guardado por esse id. Assim nenhum assento antigo muda de nome.

	// Sala do Bruno: mesa executiva, sofá e um canto de conversa
	add({ tipo: 'estante', x: 4.06, y: 5, w: 0.42, d: 3, h: 1.75, frente: 'x' });
	add({ tipo: 'mesa', x: 6, y: 6.15, w: 3, d: 0.85, h: 0.54, cor: '#5d3f2a', variante: 'executiva', nome: 'Mesa do Bruno' });
	add({ tipo: 'monitor', x: 7.05, y: 6.35, w: 0.9, d: 0.08, h: 0.48, z: 0.54, frente: '-y', variante: 'grafico', bloqueia: false });
	add({ tipo: 'cadeira', x: 7.2, y: 5.2, w: 0.6, d: 0.6, h: 1.15, frente: 'y', cor: '#1c2534', variante: 'executiva', nome: 'Cadeira do Bruno' });
	add({ tipo: 'cadeira', x: 6.4, y: 7.35, w: 0.48, d: 0.48, h: 0.9, frente: '-y', cor: '#2f4a8a' });
	add({ tipo: 'cadeira', x: 8.12, y: 7.35, w: 0.48, d: 0.48, h: 0.9, frente: '-y', cor: '#2f4a8a' });
	add({ tipo: 'sofa', x: 4.1, y: 9.4, w: 0.85, d: 2.2, h: 0.75, frente: 'x', cor: '#34405a' });
	add({ tipo: 'mesaCentro', x: 5.55, y: 9.95, w: 0.9, d: 1.1, h: 0.32, cor: '#5d3f2a' });
	add({ tipo: 'mesaCentro', x: 9.8, y: 9.55, w: 1, d: 1, h: 0.72, cor: '#f4f1eb', variante: 'redonda', nome: 'Mesa de conversa' });
	add({ tipo: 'cadeira', x: 8.95, y: 9.81, w: 0.48, d: 0.48, h: 0.9, frente: 'x', cor: '#2f4a8a' });
	add({ tipo: 'cadeira', x: 10.06, y: 8.75, w: 0.48, d: 0.48, h: 0.9, frente: 'y', cor: '#2f4a8a' });
	// O assessor, no canto ao lado da mesa do Bruno (como era na Diretoria)
	mesaDeFrente(10, 5, { tela: 'texto', mesa: 'Mesa do assessor', cadeira: 'Cadeira do assessor', cor: '#a07a55' });
	planta(10, 4, true);
	planta(11, 12);
	planta(4, 12);

	// Sala da Aline: mesa executiva, estante e cofre no fundo, sofá baixo na
	// parede que dá para a sala do Bruno (móvel alto ali taparia a sala dele).
	// A assessora fica no canto da direita
	add({ tipo: 'estante', x: 12.3, y: 4.06, w: 1.9, d: 0.42, h: 1.75, frente: 'y' });
	add({ tipo: 'cofre', x: 14.35, y: 4.15, w: 0.75, d: 0.7, h: 0.85, frente: 'y' });
	add({ tipo: 'mesa', x: 14.5, y: 6.15, w: 3, d: 0.85, h: 0.54, cor: '#6b4a33', variante: 'executiva', nome: 'Mesa da Aline' });
	add({ tipo: 'monitor', x: 15.55, y: 6.35, w: 0.9, d: 0.08, h: 0.48, z: 0.54, frente: '-y', variante: 'planilha', bloqueia: false });
	add({ tipo: 'cadeira', x: 15.7, y: 5.2, w: 0.6, d: 0.6, h: 1.15, frente: 'y', cor: '#3a2a20', variante: 'executiva', nome: 'Cadeira da Aline' });
	add({ tipo: 'cadeira', x: 14.9, y: 7.35, w: 0.48, d: 0.48, h: 0.9, frente: '-y', cor: '#a8754f' });
	add({ tipo: 'cadeira', x: 16.62, y: 7.35, w: 0.48, d: 0.48, h: 0.9, frente: '-y', cor: '#a8754f' });
	add({ tipo: 'sofa', x: 12.1, y: 9.4, w: 0.85, d: 2.2, h: 0.75, frente: 'x', cor: '#8a5a44' });
	add({ tipo: 'mesaCentro', x: 13.55, y: 9.95, w: 0.9, d: 1.1, h: 0.32, cor: '#593212' });
	mesaDeFrente(18, 5, { tela: 'planilha', mesa: 'Mesa da assessora', cadeira: 'Cadeira da assessora', cor: '#a07a55' });
	planta(19, 10, true);
	planta(19, 12);
	planta(12, 12);

	// Diretoria (11/11/2026): as três mesas dos diretores no fundo, com a
	// passagem por trás das cadeiras, e a mesa de alinhamento no meio. A porta
	// (x 24 e 25) e a coluna da direita ficam livres para chegar às mesas
	mesaDeFrente(20, 5, { tela: 'grafico', mesa: 'Mesa de diretor', cadeira: 'Cadeira de diretor', executiva: true, cor: '#6b4a33' });
	mesaDeFrente(23, 5, { tela: 'planilha', mesa: 'Mesa de diretor', cadeira: 'Cadeira de diretor', executiva: true, cor: '#6b4a33' });
	mesaDeFrente(26, 5, { tela: 'texto', mesa: 'Mesa de diretor', cadeira: 'Cadeira de diretor', executiva: true, cor: '#6b4a33' });
	add({ tipo: 'mesaReuniao', x: 21, y: 8.4, w: 3, d: 1.2, h: 0.54, cor: '#f4f1eb', nome: 'Mesa de alinhamento' });
	for (const x of [21, 22, 23]) {
		add({ tipo: 'cadeira', x: x + 0.26, y: 7.6, w: 0.48, d: 0.48, h: 0.9, frente: 'y', cor: '#5a4630' });
		add({ tipo: 'cadeira', x: x + 0.26, y: 9.92, w: 0.48, d: 0.48, h: 0.9, frente: '-y', cor: '#5a4630' });
	}
	planta(20, 12, true);
	planta(27, 12);
	planta(27, 9);

	// Salas 1, 2 e 3: vazias, como o Bruno pediu

	// ------------------------------------------------------------- lado de fora
	const arvores: [number, number][] = [
		[2, 1], [6, 2], [11, 1], [16, 2], [21, 1], [26, 2], [31, 1], [36, 2], [41, 1], [46, 2], [51, 1], [56, 2], [61, 1],
		[1, 6], [2, 11], [1, 16], [2, 21], [62, 6], [61, 11], [62, 16], [61, 21],
		[1, 26], [3, 28], [8, 29], [13, 28], [19, 28], [24, 29], [28, 28], [42, 29], [62, 28]
	];
	for (const [x, y] of arvores) {
		const pinheiro = sorteio(x, y, 7) < 0.4;
		const t = pinheiro ? 0.6 : 0.7;
		add({ tipo: pinheiro ? 'pinheiro' : 'arvore', x: x + 0.5 - t / 2, y: y + 0.5 - t / 2, w: t, d: t, h: pinheiro ? 2.6 : 2.3 });
	}
	for (const x of [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 40, 42, 44]) {
		add({ tipo: 'arbusto', x: x + 0.15, y: 26.2, w: 0.7, d: 0.6, h: 0.55 });
	}
	add({ tipo: 'placa', x: 30.6, y: 27.4, w: 2.8, d: 0.5, h: 1.15, frente: 'y' });
	add({ tipo: 'banco', x: 39.3, y: 27.35, w: 1.4, d: 0.45, h: 0.45, frente: 'y' });
	add({ tipo: 'poste', x: 34.35, y: 27.35, w: 0.3, d: 0.3, h: 2.4 });
	add({ tipo: 'poste', x: 38.35, y: 27.35, w: 0.3, d: 0.3, h: 2.4 });
	add({ tipo: 'carro', x: 46.55, y: 27.55, w: 0.9, d: 1.9, h: 0.75, cor: '#ff6f00', frente: 'y' });
	add({ tipo: 'carro', x: 50.55, y: 27.55, w: 0.9, d: 1.9, h: 0.75, cor: '#3b6ef6', frente: 'y' });
	add({ tipo: 'carro', x: 56.55, y: 27.55, w: 0.9, d: 1.9, h: 0.75, cor: '#e9edf2', frente: 'y' });
	return itens;
}

export const ITENS: Item[] = montarItens();

/** Coisas chapadas no chão: tapetes, capacho, faixas do estacionamento. */
export type Tapete = {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	cor: string;
	variante?: 'listras' | 'logo' | 'redondo' | 'capacho' | 'faixa' | 'nome';
	/** O que vem escrito (tapete de nome). */
	texto?: string;
};

export const TAPETES: Tapete[] = [
	{ x0: 4.7, y0: 9.3, x1: 7.3, y1: 11.9, cor: '#3b6ef6', variante: 'listras' },
	{ x0: 12.8, y0: 9.3, x1: 15.4, y1: 11.9, cor: '#e3a98f', variante: 'redondo' },
	{ x0: 29.4, y0: 6.4, x1: 34.6, y1: 9.6, cor: '#8597ad' },
	{ x0: 35, y0: 20, x1: 38, y1: 23, cor: '#ff6f00', variante: 'logo' },
	{ x0: 20.8, y0: 20.9, x1: 23.6, y1: 23.7, cor: '#f6a6b6', variante: 'redondo' },
	{ x0: 53, y0: 21.2, x1: 54.8, y1: 23.2, cor: '#c9b48a' },
	{ x0: 35.15, y0: 25.12, x1: 37.85, y1: 25.8, cor: '#5b4a3a', variante: 'capacho' },
	...[46, 48, 50, 52, 54, 56, 58, 60].map(
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

// --------------------------------------------------------- tapetes com nome

/**
 * O nome de cada sala num tapete na porta, na cor da sala (pedido do Bruno,
 * 10/11/2026, no lugar do nome que flutuava em cima). O tapete fica na casa da
 * frente da porta, a que nenhuma parede tapa no desenho: nas salas de cima do
 * corredor, no corredor, bem na frente da porta; nas de baixo, logo depois da
 * porta, do lado de dentro. A Recepção, aberta para o corredor, ganha o dela no
 * meio da abertura. Cresce para os lados (até 2 casas de cada) enquanto o chão
 * estiver livre, sem passar da largura da sala nem encostar no tapete vizinho.
 */
const casasDeTapete = new Set<string>();
export function tapeteDeNome(s: Sala): Tapete | null {
	if (s.id === 'corredor') return null;
	let portas = s.portas.filter((p) => p.linha === 'h');
	if (s.id === 'recepcao') portas = portas.filter((p) => p.y === s.y0).filter((p) => p.x >= s.x0 + 2 && p.x <= s.x0 + 4);
	else portas = portas.slice(0, 2);
	if (!portas.length) return null;
	const linha = portas[0].y;
	const pode = (x: number) => x >= s.x0 && x <= s.x1 && celulaLivre(x, linha) && !casasDeTapete.has(`${x},${linha}`);
	let x0 = Math.min(...portas.map((p) => p.x));
	let x1 = Math.max(...portas.map((p) => p.x));
	// Nome comprido pede tapete mais largo: cerca de 1 casa para cada 6 letras
	const quer = Math.max(4, Math.min(6, Math.ceil(s.nome.length / 3.6)));
	for (let k = 0; k < 2 && x1 - x0 + 1 < quer; k++) {
		if (pode(x0 - 1)) x0--;
		if (x1 - x0 + 1 < quer && pode(x1 + 1)) x1++;
	}
	for (let x = x0; x <= x1; x++) casasDeTapete.add(`${x},${linha}`);
	return { x0: x0 + 0.08, y0: linha + 0.14, x1: x1 + 0.92, y1: linha + 0.86, cor: s.cor, variante: 'nome', texto: s.nome.toLocaleUpperCase('pt-BR') };
}

for (const s of SALAS) {
	const t = tapeteDeNome(s);
	if (t) TAPETES.push(t);
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
