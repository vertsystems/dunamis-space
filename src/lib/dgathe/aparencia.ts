// Como cada pessoa (e cada agente) aparece no DGathe: o catálogo de peças e a
// leitura segura do que vem do banco ou de outro navegador.
//
// Guardado em colaboradores.dgathe_avatar (migration 0097) e em
// dgathe_agentes.aparencia. Dois formatos valem:
//   - o novo (pedido do Bruno, 10/11/2026: escolher personagem pronto em vez
//     de montar peça a peça): {"personagem": "<id>"}, com o id do catálogo de
//     personagens.ts. Pode trazer campos por cima ({"personagem": "ogro",
//     "corRoupa": "#3b6ef6"}), que trocam só aquela peça;
//   - o antigo, do editor do Meu Perfil: as peças soltas (corpo, pele, cabelo,
//     roupa, cor...). Continua lendo igual; o que ele não tem cai no padrão.
// Campo desconhecido ou fora do catálogo cai no padrão, campo por campo.
//
// O desenho de cada peça fica em avatar.ts (as originais), avatar-cabeca.ts e
// avatar-corpo.ts (as novas). Lista do que cada personagem usa:
// docs/dgathe/personagens.md.
//
// Segunda rodada (10/11/2026, mais 38 referências do Bruno): peças novas no
// fim de cada lista e a família dos BICHOS DE ROUPA (cabeça, mãos e pés de
// bicho num corpo de gente vestido), no campo `bicho`.

import { PERSONAGEM_POR_ID } from './personagens';

export type Opcao = { id: string; nome: string };
/** `fantasia`: só para personagens de fantasia (pele verde, cabelo azul...). */
export type OpcaoCor = Opcao & { cor: string; fantasia?: boolean };
export type OpcaoRoupa = Opcao & { grupo: 'Formal' | 'Casual' | 'Fantasia' };
/** Quem desenha o detalhe: o pintor da cabeça (avatar-cabeca.ts) ou o do corpo (avatar-corpo.ts). */
export type OpcaoDetalhe = Opcao & { pintor: 'cabeca' | 'corpo'; fantasia: boolean };
/**
 * Jeito de andar. `velocidade` multiplica a velocidade de quem anda no mapa e
 * `cadencia` a rapidez da passada (jogo.ts); o desenho de cada um fica em
 * avatar.ts (passada).
 */
export type OpcaoAndar = Opcao & { velocidade: number; cadencia: number };

/**
 * Desenho da cabeça de bicho. Bichos da mesma forma dividem o desenho e só
 * mudam as cores e as marcas (o panda é um urso com manchas; o dálmata, um
 * cachorro de pintas; o gato e o tigre, o mesmo felino).
 */
export type FormaBicho = 'urso' | 'cachorro' | 'felino' | 'lobo' | 'guaxinim' | 'macaco' | 'coelho';
/**
 * Bicho de roupa (segunda rodada): a cabeça, as mãos e os pés são de bicho, o
 * corpo é de gente vestido. As cores são do bicho, não da pele escolhida:
 * `pelo` vira a "pele" do boneco (pescoço, mão, perna de bermuda, peito sem
 * camisa) e o pintor da cabeça usa as outras para focinho, manchas e listras.
 */
export type OpcaoBicho = Opcao & {
	forma: FormaBicho | null;
	/** Pelo principal: cabeça, pescoço, braço e perna à mostra. */
	pelo: string;
	/** Focinho, máscara clara do rosto, barriga e dentro da orelha. */
	claro: string;
	/** Nariz, manchas, listras, máscara escura, ponta da orelha. */
	escuro: string;
	/** Mão e pé (a pata). */
	mao: string;
};

export const CORPOS: Opcao[] = [
	{ id: 'masculino', nome: 'Masculino' },
	{ id: 'feminino', nome: 'Feminino' }
];

// A primeira de cada lista de cores é a reserva de corDe(); por isso 'clara'
// continua na frente (as novas reais vêm no fim das reais).
export const PELES: OpcaoCor[] = [
	{ id: 'clara', nome: 'Clara', cor: '#f3d2b3' },
	{ id: 'media', nome: 'Média', cor: '#e0b089' },
	{ id: 'morena', nome: 'Morena', cor: '#c68a5e' },
	{ id: 'parda', nome: 'Parda', cor: '#9a6440' },
	{ id: 'negra', nome: 'Negra', cor: '#6b4428' },
	{ id: 'porcelana', nome: 'Porcelana', cor: '#f8e1cf' },
	{ id: 'retinta', nome: 'Retinta', cor: '#4a2e1c' },
	{ id: 'verde', nome: 'Verde-ogro', cor: '#6fae3f', fantasia: true },
	{ id: 'lima', nome: 'Verde-lima', cor: '#a8d04f', fantasia: true },
	{ id: 'rosa', nome: 'Rosa', cor: '#f28cb1', fantasia: true },
	{ id: 'azul', nome: 'Azul', cor: '#5b8def', fantasia: true },
	{ id: 'lilas', nome: 'Lilás', cor: '#b39ddb', fantasia: true },
	{ id: 'cinza', nome: 'Metal', cor: '#a9b4c2', fantasia: true },
	{ id: 'palida', nome: 'Pálida', cor: '#e4e2ee', fantasia: true },
	{ id: 'vermelha', nome: 'Vermelha', cor: '#d9533c', fantasia: true }
];

export const CABELOS: Opcao[] = [
	{ id: 'curto', nome: 'Curto' },
	{ id: 'social', nome: 'Social (de lado)' },
	{ id: 'raspado', nome: 'Raspado' },
	{ id: 'cacheado', nome: 'Cacheado' },
	{ id: 'black', nome: 'Black power' },
	{ id: 'chanel', nome: 'Chanel' },
	{ id: 'longo', nome: 'Longo' },
	{ id: 'rabo', nome: 'Rabo de cavalo' },
	{ id: 'coque', nome: 'Coque' },
	{ id: 'careca', nome: 'Careca' },
	// Novos (avatar-cabeca.ts)
	{ id: 'topete', nome: 'Topete' },
	{ id: 'penteadoTras', nome: 'Penteado para trás' },
	{ id: 'arrepiado', nome: 'Arrepiado' },
	{ id: 'espetado', nome: 'Espetado' },
	{ id: 'moicano', nome: 'Moicano' },
	{ id: 'calvoLados', nome: 'Calvo com laterais' },
	{ id: 'afroCurto', nome: 'Crespo curto' },
	{ id: 'dreads', nome: 'Dreads' },
	{ id: 'trancas', nome: 'Tranças' },
	{ id: 'ondulado', nome: 'Longo ondulado' },
	{ id: 'cachosVolumosos', nome: 'Cachos volumosos' },
	{ id: 'chanelCacheado', nome: 'Chanel cacheado' },
	{ id: 'raboCacheado', nome: 'Rabo cacheado' },
	{ id: 'franja', nome: 'Longo com franja' },
	{ id: 'mariaChiquinha', nome: 'Maria-chiquinha' },
	{ id: 'joaozinho', nome: 'Joãozinho' },
	// Segunda rodada (avatar-cabeca.ts)
	{ id: 'repicado', nome: 'Médio repicado' },
	{ id: 'onduladoCurto', nome: 'Curto ondulado' },
	{ id: 'flattop', nome: 'Topete reto' },
	{ id: 'coqueSolto', nome: 'Coque solto' },
	{ id: 'chanelOndulado', nome: 'Chanel ondulado (retrô)' },
	{ id: 'ombro', nome: 'Na altura do ombro' },
	{ id: 'duasTrancas', nome: 'Duas tranças' },
	{ id: 'permanente', nome: 'Permanente (curtinho)' }
];

export const CORES_CABELO: OpcaoCor[] = [
	{ id: 'preto', nome: 'Preto', cor: '#1f1a17' },
	{ id: 'castanho', nome: 'Castanho', cor: '#5a3825' },
	{ id: 'castanhoClaro', nome: 'Castanho-claro', cor: '#8a5a36' },
	{ id: 'mel', nome: 'Mel', cor: '#b9823f' },
	{ id: 'loiro', nome: 'Loiro', cor: '#d6ae5c' },
	{ id: 'platinado', nome: 'Platinado', cor: '#efe6c4' },
	{ id: 'ruivo', nome: 'Ruivo', cor: '#a4462a' },
	{ id: 'grisalho', nome: 'Grisalho', cor: '#a3a6ab' },
	{ id: 'branco', nome: 'Branco', cor: '#ecebe6' },
	{ id: 'grisalhoEscuro', nome: 'Sal e pimenta', cor: '#6f7074' },
	{ id: 'azul', nome: 'Azul', cor: '#3f6fd8', fantasia: true },
	{ id: 'rosa', nome: 'Rosa', cor: '#f07aa8', fantasia: true },
	{ id: 'roxo', nome: 'Roxo', cor: '#7b4bc4', fantasia: true }
];

/** Barba e bigode, na cor do cabelo (avatar-cabeca.ts). */
export const BARBAS: Opcao[] = [
	{ id: 'nenhuma', nome: 'Sem barba' },
	{ id: 'porFazer', nome: 'Por fazer' },
	{ id: 'curta', nome: 'Curta' },
	{ id: 'cheia', nome: 'Cheia' },
	{ id: 'cavanhaque', nome: 'Cavanhaque' },
	{ id: 'bigode', nome: 'Bigode fino' },
	{ id: 'bigodao', nome: 'Bigodão' },
	{ id: 'longa', nome: 'Longa de mago' }
];

/** Chapéus e enfeites de cabeça (avatar-cabeca.ts); usam a cor de destaque. */
export const CHAPEUS: Opcao[] = [
	{ id: 'nenhum', nome: 'Nada' },
	{ id: 'fedora', nome: 'Chapéu de feltro' },
	{ id: 'cartola', nome: 'Cartola' },
	{ id: 'bone', nome: 'Boné' },
	{ id: 'gorro', nome: 'Gorro' },
	{ id: 'boina', nome: 'Boina' },
	{ id: 'capuz', nome: 'Capuz' },
	{ id: 'laco', nome: 'Laço' },
	{ id: 'tiara', nome: 'Tiara' },
	{ id: 'fone', nome: 'Fone de ouvido' },
	{ id: 'bandana', nome: 'Faixa na testa' },
	{ id: 'chapeuMago', nome: 'Chapéu pontudo' },
	{ id: 'aureola', nome: 'Auréola' },
	// Segunda rodada
	{ id: 'abaLarga', nome: 'Chapéu de abas largas' },
	{ id: 'chapeuPalha', nome: 'Chapéu de palha cônico' },
	{ id: 'lencoCabeca', nome: 'Lenço na cabeça' },
	{ id: 'chapeuFlor', nome: 'Chapéu com flor' }
];

export const OCULOS: Opcao[] = [
	{ id: 'nenhum', nome: 'Sem óculos' },
	{ id: 'grau', nome: 'De grau' },
	{ id: 'grosso', nome: 'Armação grossa' },
	{ id: 'sol', nome: 'Escuros' },
	// Novos (avatar-cabeca.ts)
	{ id: 'redondo', nome: 'Redondo fino' },
	{ id: 'meiaLua', nome: 'Meia-lua (leitura)' },
	{ id: 'gatinho', nome: 'Gatinho' },
	{ id: 'aviador', nome: 'Aviador' },
	{ id: 'solQuadrado', nome: 'Escuro quadrado' },
	{ id: 'visor', nome: 'Visor futurista' },
	// Segunda rodada
	{ id: 'tartaruga', nome: 'Tartaruga' },
	{ id: 'lenteColorida', nome: 'Lente colorida' },
	{ id: 'solRedondo', nome: 'Escuro redondo' }
];

/** Expressão do rosto. 'sorriso' é o rosto de sempre (avatar.ts); os outros, avatar-cabeca.ts. */
export const ROSTOS: Opcao[] = [
	{ id: 'sorriso', nome: 'Sorriso aberto' },
	{ id: 'sorrisoFechado', nome: 'Sorriso fechado' },
	{ id: 'confiante', nome: 'Confiante' },
	{ id: 'piscada', nome: 'Piscadinha' },
	{ id: 'serio', nome: 'Sério' },
	{ id: 'bravo', nome: 'Bravo' },
	{ id: 'sonhador', nome: 'Sonhador' }
];

/** Porte do corpo (avatar-corpo.ts). A cabeça é a mesma em todos. */
export const PORTES: Opcao[] = [
	{ id: 'padrao', nome: 'Padrão' },
	{ id: 'magro', nome: 'Magro' },
	{ id: 'gordinho', nome: 'Gordinho' },
	{ id: 'forte', nome: 'Forte' },
	{ id: 'gigante', nome: 'Gigante' },
	{ id: 'baixinho', nome: 'Baixinho' }
];

export const ROUPAS: OpcaoRoupa[] = [
	{ id: 'terno', nome: 'Terno e gravata', grupo: 'Formal' },
	{ id: 'blazer', nome: 'Blazer', grupo: 'Formal' },
	{ id: 'social', nome: 'Camisa social', grupo: 'Formal' },
	{ id: 'vestido', nome: 'Vestido', grupo: 'Formal' },
	{ id: 'camiseta', nome: 'Camiseta', grupo: 'Casual' },
	{ id: 'polo', nome: 'Polo', grupo: 'Casual' },
	{ id: 'xadrez', nome: 'Camisa xadrez', grupo: 'Casual' },
	{ id: 'jaqueta', nome: 'Jaqueta', grupo: 'Casual' },
	{ id: 'jeans', nome: 'Jaqueta jeans', grupo: 'Casual' },
	{ id: 'moletom', nome: 'Moletom', grupo: 'Casual' },
	// Novas (avatar-corpo.ts)
	{ id: 'ternoColete', nome: 'Terno com colete', grupo: 'Formal' },
	{ id: 'smoking', nome: 'Smoking', grupo: 'Formal' },
	{ id: 'sobretudo', nome: 'Sobretudo', grupo: 'Formal' },
	{ id: 'trench', nome: 'Capa de chuva com cinto', grupo: 'Formal' },
	{ id: 'camisaDobrada', nome: 'Camisa de manga dobrada', grupo: 'Formal' },
	{ id: 'blazerVestido', nome: 'Blazer sobre vestido', grupo: 'Formal' },
	{ id: 'blusaAmpla', nome: 'Blusa de manga ampla', grupo: 'Formal' },
	{ id: 'jaleco', nome: 'Jaleco', grupo: 'Formal' },
	{ id: 'golaAlta', nome: 'Gola alta', grupo: 'Casual' },
	{ id: 'sueter', nome: 'Suéter', grupo: 'Casual' },
	{ id: 'bomber', nome: 'Jaqueta bomber', grupo: 'Casual' },
	{ id: 'jaquetaCouro', nome: 'Jaqueta de couro', grupo: 'Casual' },
	{ id: 'jaquetaCurta', nome: 'Jaqueta curta', grupo: 'Casual' },
	{ id: 'regata', nome: 'Regata', grupo: 'Casual' },
	{ id: 'top', nome: 'Top esportivo', grupo: 'Casual' },
	{ id: 'macacao', nome: 'Macacão', grupo: 'Casual' },
	{ id: 'semCamisa', nome: 'Sem camisa', grupo: 'Fantasia' },
	{ id: 'uniformeHeroi', nome: 'Uniforme de herói', grupo: 'Fantasia' },
	{ id: 'quimono', nome: 'Quimono', grupo: 'Fantasia' },
	{ id: 'tunica', nome: 'Túnica de mago', grupo: 'Fantasia' },
	{ id: 'robo', nome: 'Corpo de robô', grupo: 'Fantasia' },
	// Segunda rodada (avatar-corpo.ts)
	{ id: 'vestidoEnvelope', nome: 'Vestido envelope', grupo: 'Formal' },
	{ id: 'blusaEnvelope', nome: 'Blusa transpassada', grupo: 'Formal' },
	{ id: 'trenchCurto', nome: 'Trench curto', grupo: 'Formal' },
	{ id: 'casacoLongo', nome: 'Casaco longo trespassado', grupo: 'Formal' },
	{ id: 'camisaCurta', nome: 'Camisa de manga curta', grupo: 'Casual' },
	{ id: 'xadrezAberta', nome: 'Xadrez aberta', grupo: 'Casual' },
	{ id: 'camisaListrada', nome: 'Camisa listrada aberta', grupo: 'Casual' },
	{ id: 'jaquetaCapuz', nome: 'Jaqueta com capuz', grupo: 'Casual' },
	{ id: 'jaquetaPelucia', nome: 'Jaqueta com gola de pelúcia', grupo: 'Casual' },
	{ id: 'puffer', nome: 'Jaqueta acolchoada', grupo: 'Casual' },
	{ id: 'casacoPele', nome: 'Casacão de pelúcia', grupo: 'Casual' },
	{ id: 'cardiga', nome: 'Cardigã', grupo: 'Casual' },
	{ id: 'colete', nome: 'Colete de tricô', grupo: 'Casual' },
	{ id: 'trico', nome: 'Tricô grosso', grupo: 'Casual' },
	{ id: 'camisaFutebol', nome: 'Camisa de time', grupo: 'Casual' },
	{ id: 'camuflado', nome: 'Farda camuflada', grupo: 'Casual' },
	{ id: 'haori', nome: 'Casaco de samurai', grupo: 'Fantasia' }
];

/**
 * Parte de baixo. 'auto' é a de sempre (sai da roupa: terno com calça do
 * terno, vestido com saia...). As saias lápis, evasê e rodada e a calça social
 * e jeans já existem em avatar.ts; as outras são novas (avatar-corpo.ts) e,
 * até ficarem prontas, saem como calça reta na cor escolhida.
 */
export const BAIXOS: Opcao[] = [
	{ id: 'auto', nome: 'Combinando com a roupa' },
	{ id: 'calcaSocial', nome: 'Calça social' },
	{ id: 'jeans', nome: 'Calça jeans' },
	{ id: 'pantalona', nome: 'Pantalona' },
	{ id: 'cargo', nome: 'Calça cargo' },
	{ id: 'legging', nome: 'Legging (colada)' },
	{ id: 'bufante', nome: 'Calça bufante' },
	{ id: 'bermuda', nome: 'Bermuda' },
	{ id: 'bermudaRasgada', nome: 'Bermuda rasgada' },
	{ id: 'saiaLapis', nome: 'Saia lápis' },
	{ id: 'saiaEvase', nome: 'Saia evasê' },
	{ id: 'saiaRodada', nome: 'Saia rodada' },
	{ id: 'saiaMidi', nome: 'Saia midi' },
	{ id: 'saiaLonga', nome: 'Saia longa' },
	// Segunda rodada (avatar-corpo.ts)
	{ id: 'jeansRasgado', nome: 'Jeans rasgado' },
	{ id: 'calcaMoletom', nome: 'Calça de moletom' },
	{ id: 'calcaLarga', nome: 'Calça larga' },
	{ id: 'saiaFlorida', nome: 'Saia longa florida' },
	{ id: 'calcao', nome: 'Calção' },
	{ id: 'jardineira', nome: 'Jardineira' },
	{ id: 'hakama', nome: 'Hakama (calça plissada)' }
];

export const CORES_ROUPA: OpcaoCor[] = [
	{ id: 'marinho', nome: 'Azul-marinho', cor: '#1c2534' },
	{ id: 'grafite', nome: 'Grafite', cor: '#4a505b' },
	{ id: 'azul', nome: 'Azul', cor: '#3b6ef6' },
	{ id: 'laranja', nome: 'Laranja Dunamis', cor: '#e0662a' },
	{ id: 'verde', nome: 'Verde', cor: '#17915a' },
	{ id: 'roxo', nome: 'Roxo', cor: '#7c5cd6' },
	{ id: 'rosa', nome: 'Rosa', cor: '#e05a7a' },
	{ id: 'vinho', nome: 'Vinho', cor: '#7d2337' },
	{ id: 'bege', nome: 'Bege', cor: '#d8c3a0' },
	{ id: 'branco', nome: 'Branco', cor: '#f1efe9' }
];

export const SAPATOS: Opcao[] = [
	{ id: 'social', nome: 'Social preto' },
	{ id: 'marrom', nome: 'Social marrom' },
	{ id: 'tenis', nome: 'Tênis branco' },
	{ id: 'tenisPreto', nome: 'Tênis preto' },
	{ id: 'bota', nome: 'Bota' },
	{ id: 'salto', nome: 'Salto' },
	// Novos (avatar-corpo.ts)
	{ id: 'nude', nome: 'Scarpin nude' },
	{ id: 'sandalia', nome: 'Sandália de salto' },
	{ id: 'plataforma', nome: 'Salto plataforma' },
	{ id: 'sapatilha', nome: 'Sapatilha' },
	{ id: 'tenisVermelho', nome: 'Tênis de cano alto' },
	{ id: 'botaAlta', nome: 'Bota de cano alto' },
	{ id: 'botaRobo', nome: 'Bota de robô' },
	{ id: 'descalco', nome: 'Descalço' },
	// Segunda rodada (avatar-corpo.ts)
	{ id: 'chinelo', nome: 'Sandália de couro' },
	{ id: 'tenisGrosso', nome: 'Tênis de corrida' },
	{ id: 'tenisLona', nome: 'Tênis de lona' },
	{ id: 'tenisCor', nome: 'Tênis colorido' },
	{ id: 'coturno', nome: 'Coturno' },
	{ id: 'chuteira', nome: 'Chuteira com meião' },
	{ id: 'socialBranco', nome: 'Social branco' },
	{ id: 'patas', nome: 'Patas de bicho' }
];

/** O que leva na mão da frente (avatar-corpo.ts). */
export const NA_MAO: Opcao[] = [
	{ id: 'nada', nome: 'Nada' },
	{ id: 'maleta', nome: 'Maleta' },
	{ id: 'bolsa', nome: 'Bolsa de mão' },
	{ id: 'bolsaOmbro', nome: 'Bolsa de ombro' },
	{ id: 'notebook', nome: 'Notebook' },
	{ id: 'prancheta', nome: 'Prancheta' },
	{ id: 'livro', nome: 'Livro' },
	{ id: 'celular', nome: 'Celular' },
	{ id: 'cafe', nome: 'Café' },
	{ id: 'camera', nome: 'Câmera' },
	{ id: 'lupa', nome: 'Lupa' },
	{ id: 'cachimbo', nome: 'Cachimbo' },
	{ id: 'capacete', nome: 'Capacete' },
	{ id: 'cajado', nome: 'Cajado' },
	// Segunda rodada
	{ id: 'bracosCruzados', nome: 'Braços cruzados' },
	{ id: 'banana', nome: 'Banana' },
	{ id: 'cafeGelado', nome: 'Café gelado' },
	{ id: 'sacola', nome: 'Sacola' },
	{ id: 'caneta', nome: 'Caneta' },
	// Do jogo: o agente que joga pingue-pongue na pausa (nenhum personagem usa)
	{ id: 'raquete', nome: 'Raquete de pingue-pongue' }
];

/** Detalhes que se somam (vários por aparência). */
export const DETALHES: OpcaoDetalhe[] = [
	{ id: 'sardas', nome: 'Sardas', pintor: 'cabeca', fantasia: false },
	{ id: 'argolas', nome: 'Brincos de argola', pintor: 'cabeca', fantasia: false },
	{ id: 'mascara', nome: 'Máscara de herói', pintor: 'cabeca', fantasia: true },
	{ id: 'mascaraNinja', nome: 'Máscara ninja', pintor: 'cabeca', fantasia: true },
	{ id: 'orelhaPontuda', nome: 'Orelha pontuda', pintor: 'cabeca', fantasia: true },
	{ id: 'chifres', nome: 'Chifres', pintor: 'cabeca', fantasia: true },
	{ id: 'antenas', nome: 'Antenas', pintor: 'cabeca', fantasia: true },
	{ id: 'caninos', nome: 'Caninos', pintor: 'cabeca', fantasia: true },
	{ id: 'presas', nome: 'Presas de ogro', pintor: 'cabeca', fantasia: true },
	{ id: 'olhosBrilhando', nome: 'Olhos brilhando', pintor: 'cabeca', fantasia: true },
	{ id: 'cabecaRobo', nome: 'Cabeça de robô', pintor: 'cabeca', fantasia: true },
	{ id: 'relogio', nome: 'Relógio', pintor: 'corpo', fantasia: false },
	{ id: 'pulseiras', nome: 'Pulseiras', pintor: 'corpo', fantasia: false },
	{ id: 'corrente', nome: 'Corrente no pescoço', pintor: 'corpo', fantasia: false },
	{ id: 'lenco', nome: 'Lenço no pescoço', pintor: 'corpo', fantasia: false },
	{ id: 'luvas', nome: 'Luvas', pintor: 'corpo', fantasia: false },
	{ id: 'capa', nome: 'Capa', pintor: 'corpo', fantasia: true },
	{ id: 'asas', nome: 'Asas', pintor: 'corpo', fantasia: true },
	{ id: 'cauda', nome: 'Cauda', pintor: 'corpo', fantasia: true },
	{ id: 'aura', nome: 'Aura', pintor: 'corpo', fantasia: true },
	// Segunda rodada
	{ id: 'piercing', nome: 'Piercing no nariz', pintor: 'cabeca', fantasia: false },
	{ id: 'mascaraInteira', nome: 'Máscara inteira', pintor: 'cabeca', fantasia: true },
	{ id: 'cracha', nome: 'Crachá no pescoço', pintor: 'corpo', fantasia: false },
	{ id: 'mochila', nome: 'Mochila', pintor: 'corpo', fantasia: false },
	{ id: 'cachecol', nome: 'Cachecol', pintor: 'corpo', fantasia: false },
	{ id: 'perolas', nome: 'Colar de pérolas', pintor: 'corpo', fantasia: false },
	{ id: 'suspensorio', nome: 'Suspensório', pintor: 'corpo', fantasia: false },
	{ id: 'tatuagem', nome: 'Tatuagem no braço', pintor: 'corpo', fantasia: false },
	{ id: 'espada', nome: 'Espada na cintura', pintor: 'corpo', fantasia: true },
	{ id: 'rabo', nome: 'Rabo de bicho', pintor: 'corpo', fantasia: true }
];

/**
 * Bichos de roupa (segunda rodada). 'nenhum' é gente (o de sempre). O desenho
 * da cabeça é do pintor da cabeça (pela `forma`); mão de bicho, patas e rabo,
 * do pintor do corpo.
 */
export const BICHOS: OpcaoBicho[] = [
	{ id: 'nenhum', nome: 'Gente', forma: null, pelo: '', claro: '', escuro: '', mao: '' },
	{ id: 'urso', nome: 'Urso', forma: 'urso', pelo: '#8a5530', claro: '#d8b48a', escuro: '#2a1d16', mao: '#5e3a22' },
	{ id: 'panda', nome: 'Panda', forma: 'urso', pelo: '#f3f1ec', claro: '#ffffff', escuro: '#25272e', mao: '#25272e' },
	{ id: 'guaxinim', nome: 'Guaxinim', forma: 'guaxinim', pelo: '#8e8580', claro: '#f1ece4', escuro: '#3a302b', mao: '#4a3d36' },
	{ id: 'tigre', nome: 'Tigre', forma: 'felino', pelo: '#e8862a', claro: '#f7f0e4', escuro: '#1f1a17', mao: '#e8862a' },
	{ id: 'gato', nome: 'Gato', forma: 'felino', pelo: '#8d94a3', claro: '#f1f1f4', escuro: '#3a3f4a', mao: '#8d94a3' },
	{ id: 'cachorro', nome: 'Cachorro dourado', forma: 'cachorro', pelo: '#d8a257', claro: '#f1d7a8', escuro: '#2b211b', mao: '#d8a257' },
	{ id: 'dalmata', nome: 'Dálmata', forma: 'cachorro', pelo: '#f6f4ef', claro: '#ffffff', escuro: '#1f2230', mao: '#f6f4ef' },
	{ id: 'lobo', nome: 'Lobo azul', forma: 'lobo', pelo: '#5b7fd1', claro: '#dde6f7', escuro: '#232a3d', mao: '#4b6cbc' },
	{ id: 'macaco', nome: 'Macaco', forma: 'macaco', pelo: '#6f5a33', claro: '#e6c4a0', escuro: '#2e2416', mao: '#b98a66' },
	{ id: 'coelho', nome: 'Coelho', forma: 'coelho', pelo: '#f2ece6', claro: '#ffffff', escuro: '#e48fa4', mao: '#f2ece6' }
];

export const ANDARES: OpcaoAndar[] = [
	{ id: 'normal', nome: 'Normal', velocidade: 1, cadencia: 1 },
	{ id: 'apressado', nome: 'Apressado', velocidade: 1.15, cadencia: 1.35 },
	{ id: 'gingado', nome: 'Gingado', velocidade: 1, cadencia: 0.9 },
	{ id: 'saltitante', nome: 'Saltitante', velocidade: 1.05, cadencia: 1.15 },
	{ id: 'pesado', nome: 'Pesado', velocidade: 0.88, cadencia: 0.75 },
	{ id: 'deslizante', nome: 'Deslizante', velocidade: 1, cadencia: 0.8 },
	{ id: 'flutuante', nome: 'Flutuante', velocidade: 0.95, cadencia: 0.6 },
	{ id: 'elegante', nome: 'Elegante', velocidade: 0.95, cadencia: 0.9 },
	{ id: 'robotico', nome: 'Robótico', velocidade: 0.92, cadencia: 1.1 },
	{ id: 'furtivo', nome: 'Furtivo', velocidade: 0.92, cadencia: 0.85 },
	{ id: 'tranquilo', nome: 'Tranquilo', velocidade: 0.88, cadencia: 0.8 }
];

export type Aparencia = {
	corpo: string;
	pele: string;
	cabelo: string;
	corCabelo: string;
	roupa: string;
	/** Cor da peça de cima (#rrggbb). */
	corRoupa: string;
	sapato: string;
	oculos: string;
	// --- Campos novos (10/11/2026). Quem salvou antes não tem: caem no padrão.
	porte: string;
	baixo: string;
	/** Cor da parte de baixo (#rrggbb); '' = a que combina com a roupa. */
	corBaixo: string;
	barba: string;
	chapeu: string;
	naMao: string;
	rosto: string;
	/** Detalhes que se somam (sardas, capa, antenas...), sem repetir. */
	detalhes: string[];
	/** Cor de destaque (#rrggbb) de capa, chapéu, faixa, bolsa; '' = a de cada peça. */
	corExtra: string;
	andar: string;
	/** Id do personagem pronto de onde veio; '' = montada peça a peça. */
	personagem: string;
	// --- Segunda rodada (10/11/2026)
	/** Bicho de roupa (BICHOS); 'nenhum' = gente. Com bicho, a cor da pele é a do pelo e o cabelo não aparece. */
	bicho: string;
};

export const APARENCIA_PADRAO: Aparencia = {
	corpo: 'masculino',
	pele: 'media',
	cabelo: 'curto',
	corCabelo: 'preto',
	roupa: 'terno',
	corRoupa: '#1c2534',
	sapato: 'social',
	oculos: 'nenhum',
	porte: 'padrao',
	baixo: 'auto',
	corBaixo: '',
	barba: 'nenhuma',
	chapeu: 'nenhum',
	naMao: 'nada',
	rosto: 'sorriso',
	detalhes: [],
	corExtra: '',
	andar: 'normal',
	personagem: '',
	bicho: 'nenhum'
};

/** Máximo de detalhes numa aparência (mais que isso vira confusão no boneco de 54 px). */
const MAX_DETALHES = 6;

const HEX = /^#[0-9a-f]{6}$/i;
const tem = (lista: Opcao[], id: unknown): id is string => typeof id === 'string' && lista.some((o) => o.id === id);
const cor = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);
/** Cor opcional: '' (não escolheu) ou #rrggbb. */
const corOuVazio = (v: unknown): v is string => v === '' || cor(v);

/** Campos de lista fechada e a lista de cada um. */
const LISTAS: [keyof Aparencia, Opcao[]][] = [
	['corpo', CORPOS],
	['pele', PELES],
	['cabelo', CABELOS],
	['corCabelo', CORES_CABELO],
	['roupa', ROUPAS],
	['sapato', SAPATOS],
	['oculos', OCULOS],
	['porte', PORTES],
	['baixo', BAIXOS],
	['barba', BARBAS],
	['chapeu', CHAPEUS],
	['naMao', NA_MAO],
	['rosto', ROSTOS],
	['andar', ANDARES],
	['bicho', BICHOS]
];

function lerDetalhes(v: unknown): string[] | null {
	if (!Array.isArray(v)) return null;
	const vistos: string[] = [];
	for (const d of v) if (tem(DETALHES, d) && !vistos.includes(d) && vistos.length < MAX_DETALHES) vistos.push(d);
	return vistos;
}

/** Copia uma aparência (o único campo que não é texto é a lista de detalhes). */
const copia = (a: Aparencia): Aparencia => ({ ...a, detalhes: [...a.detalhes] });

/**
 * Lê uma aparência guardada ou recebida. Com {"personagem": id} conhecido,
 * parte do personagem pronto; sem ele, do padrão, com a cor de tema do perfil
 * como cor de roupa (era o que o avatar usava antes do editor existir). Os
 * campos que vierem por cima e forem válidos trocam só aquela peça.
 */
export function lerAparencia(bruto: unknown, corTema?: string | null): Aparencia {
	const b = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? (bruto as Record<string, unknown>) : null;
	const p = b && typeof b.personagem === 'string' ? PERSONAGEM_POR_ID.get(b.personagem) : undefined;
	const base: Aparencia = p
		? copia(p.aparencia)
		: { ...copia(APARENCIA_PADRAO), corRoupa: cor(corTema) ? corTema.toLowerCase() : APARENCIA_PADRAO.corRoupa };
	if (!b) return base;
	const a: Aparencia = base;
	const campos = a as unknown as Record<string, unknown>;
	for (const [campo, lista] of LISTAS) if (tem(lista, b[campo])) campos[campo] = b[campo];
	if (cor(b.corRoupa)) a.corRoupa = b.corRoupa.toLowerCase();
	if (corOuVazio(b.corBaixo)) a.corBaixo = b.corBaixo.toLowerCase();
	if (corOuVazio(b.corExtra)) a.corExtra = b.corExtra.toLowerCase();
	const detalhes = lerDetalhes(b.detalhes);
	if (detalhes) a.detalhes = detalhes;
	return a;
}

/**
 * O que gravar no banco: só {"personagem": id} quando a aparência é o
 * personagem pronto sem mudança (assim, quando o desenho dele melhorar, quem o
 * escolheu já aparece com o novo), e a aparência inteira nos outros casos.
 */
export function paraGuardar(a: Aparencia): Record<string, unknown> {
	const p = a.personagem ? PERSONAGEM_POR_ID.get(a.personagem) : undefined;
	if (p && iguais(a, p.aparencia)) return { personagem: p.id };
	return copia(a);
}

export function iguais(a: Aparencia, b: Aparencia): boolean {
	return (Object.keys(APARENCIA_PADRAO) as (keyof Aparencia)[]).every((k) =>
		k === 'detalhes' ? a.detalhes.length === b.detalhes.length && a.detalhes.every((d, i) => d === b.detalhes[i]) : a[k] === b[k]
	);
}

export const corDe = (lista: OpcaoCor[], id: string) => lista.find((o) => o.id === id)?.cor ?? lista[0].cor;

/** Velocidade e cadência de um jeito de andar (o desconhecido anda normal). */
export const andarDe = (id: string): OpcaoAndar => ANDARES.find((o) => o.id === id) ?? ANDARES[0];

/** O bicho de roupa (com as cores), ou null para gente e para id desconhecido. */
export const bichoDe = (id: string): OpcaoBicho | null => (id === 'nenhum' ? null : (BICHOS.find((o) => o.id === id) ?? null));
