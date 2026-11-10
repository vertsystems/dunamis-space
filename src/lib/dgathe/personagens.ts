// Os personagens prontos do DGathe: cada um é um avatar completo (roupa,
// cabelo, acessório, jeito de andar e personalidade) que a pessoa escolhe com
// um clique na "cabecinha", em vez de montar peça a peça.
//
// Pedido do Bruno (10/11/2026): "escolher modelos já prontos, só escolhendo o
// sexo e clicando na cabecinha que gosta", e que sirva também para os agentes
// novos ("alguns reais, outros sobrenaturais, heróis... bastante opções para
// que não fique repetido"). As 17 referências que ele mandou viraram
// arquétipos ORIGINAIS: nada de personagem com dono, pessoa real reconhecível,
// logo ou marca. O campo `inspiracao` diz de qual referência veio a ideia.
//
// Segunda rodada (10/11/2026): mais 38 referências (refs. 18 a 55) viraram 45
// personagens novos, entre eles a família dos BICHOS DE ROUPA (grupo 'bicho':
// cabeça, mãos e pés de bicho num corpo de gente vestido). A mesma regra de
// autoria: o "mascarado de capuz" e o "samurai de chapéu de palha" são heróis
// nossos (sem teia, aranha nem símbolo), a "senhora de casaco rosa" é uma
// senhora elegante qualquer, o "senhor de túnica clara" é um vovô de cardigã,
// o jogador veste listras de cores próprias, sem escudo, e nenhuma roupa tem
// escrita ou marca.
//
// Guardado como {"personagem": "<id>"} (aparencia.ts, lerAparencia). Por isso
// o id é estável: NUNCA renomeie nem reaproveite um id; para tirar alguém do
// catálogo, deixe de listar mas mantenha a ficha.
//
// Este arquivo só importa TIPOS de aparencia.ts (que importa o catálogo daqui):
// assim não vira import circular.

import type { Aparencia } from './aparencia';

export type Sexo = 'masculino' | 'feminino';
export type GrupoPersonagem = 'real' | 'fantasia' | 'heroi' | 'bicho';

export type Personagem = {
	/** Estável: é o que fica guardado no banco. */
	id: string;
	/** Nome curto, embaixo da cabecinha. */
	nome: string;
	sexo: Sexo;
	grupo: GrupoPersonagem;
	/** Completa, com `personagem` = id, `corpo` = sexo e `andar` = andar. */
	aparencia: Aparencia;
	/** Jeito de andar (ANDARES em aparencia.ts). */
	andar: string;
	/** Uma linha, para a tela de escolha e para combinar com o agente. */
	personalidade: string;
	/** De onde veio a ideia: "ref. N" (as imagens do Bruno) ou o arquétipo. */
	inspiracao: string;
};

export const NOME_DO_GRUPO: Record<GrupoPersonagem, string> = {
	real: 'Gente da firma',
	fantasia: 'Fantasia',
	heroi: 'Heróis',
	bicho: 'Bichos'
};

/** Os grupos na ordem das abas da tela de escolha. */
export const GRUPOS: readonly GrupoPersonagem[] = ['real', 'fantasia', 'heroi', 'bicho'];

/** As peças de quem não diz nada (o mesmo que APARENCIA_PADRAO, sem a cor de tema). */
const BASE: Aparencia = {
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

type Ficha = Omit<Personagem, 'aparencia'> & { pecas: Partial<Aparencia> };

function montar({ pecas, ...f }: Ficha): Personagem {
	return {
		...f,
		aparencia: {
			...BASE,
			...pecas,
			detalhes: [...(pecas.detalhes ?? [])],
			corpo: f.sexo,
			andar: f.andar,
			personagem: f.id
		}
	};
}

// Cores usadas mais de uma vez
const MARINHO = '#1c2534';
const PRETO = '#1f2230';
const BRANCO = '#f4f4f2';
const OFF = '#f4f1eb';
const CALCA_ESCURA = '#2b3240';
const PRATA = '#c9d1dc';

const FICHAS: Ficha[] = [
	// ================================================================ masculinos reais
	{
		id: 'executivo', nome: 'Executivo', sexo: 'masculino', grupo: 'real', andar: 'normal', inspiracao: 'ref. 1',
		personalidade: 'Pontual e objetivo: chega com a pauta pronta e sai com o combinado fechado.',
		pecas: { pele: 'media', cabelo: 'topete', corCabelo: 'preto', barba: 'curta', roupa: 'terno', corRoupa: MARINHO, sapato: 'social', naMao: 'maleta', corExtra: '#7a4a2a' }
	},
	{
		id: 'contador', nome: 'Contador', sexo: 'masculino', grupo: 'real', andar: 'tranquilo', inspiracao: 'ref. 4',
		personalidade: 'Gente boa e caprichoso: confere cada centavo duas vezes.',
		pecas: { porte: 'gordinho', pele: 'clara', cabelo: 'social', corCabelo: 'castanho', oculos: 'grosso', roupa: 'ternoColete', corRoupa: '#4a3f38', sapato: 'marrom', naMao: 'notebook', rosto: 'sorrisoFechado' }
	},
	{
		id: 'vovo-bigode', nome: 'Vovô Bigode', sexo: 'masculino', grupo: 'real', andar: 'pesado', inspiracao: 'ref. 5',
		personalidade: 'Rabugento só por fora: conta história boa e dá o melhor conselho da casa.',
		pecas: { porte: 'forte', pele: 'porcelana', cabelo: 'penteadoTras', corCabelo: 'branco', barba: 'bigodao', oculos: 'grosso', roupa: 'sobretudo', corRoupa: '#8a5530', baixo: 'calcaSocial', corBaixo: '#b59a6e', sapato: 'marrom', naMao: 'cachimbo', rosto: 'serio' }
	},
	{
		id: 'detetive', nome: 'Detetive', sexo: 'masculino', grupo: 'real', andar: 'furtivo', inspiracao: 'ref. 6',
		personalidade: 'Curioso e desconfiado: não larga um mistério antes de achar a causa.',
		pecas: { pele: 'morena', cabelo: 'arrepiado', corCabelo: 'preto', chapeu: 'fedora', corExtra: '#8f9399', roupa: 'trench', corRoupa: '#cfc6b4', baixo: 'calcaSocial', corBaixo: '#2f4a8a', sapato: 'marrom', naMao: 'lupa', rosto: 'confiante' }
	},
	{
		id: 'dancarino', nome: 'Dançarino', sexo: 'masculino', grupo: 'real', andar: 'deslizante', inspiracao: 'ref. 8 (showman de cartola)',
		personalidade: 'Showman nato: chega deslizando e sai aplaudido.',
		pecas: { pele: 'parda', cabelo: 'cacheado', corCabelo: 'preto', chapeu: 'cartola', corExtra: '#1c1f26', roupa: 'smoking', corRoupa: '#6b1f3a', sapato: 'social', rosto: 'piscada' }
	},
	{
		id: 'piloto', nome: 'Piloto', sexo: 'masculino', grupo: 'real', andar: 'apressado', inspiracao: 'ref. 9 (piloto genérico, cores próprias)',
		personalidade: 'Competitivo e frio sob pressão: decide rápido e não erra a curva.',
		pecas: { pele: 'clara', cabelo: 'cacheado', corCabelo: 'castanho', roupa: 'macacao', corRoupa: '#1f6fb2', corExtra: '#ff6f00', sapato: 'tenisPreto', naMao: 'capacete', rosto: 'confiante' }
	},
	{
		id: 'diretor', nome: 'Diretor', sexo: 'masculino', grupo: 'real', andar: 'elegante', inspiracao: 'ref. 10',
		personalidade: 'Fala pouco, escuta muito e decide com calma.',
		pecas: { porte: 'forte', pele: 'clara', cabelo: 'social', corCabelo: 'grisalho', barba: 'cheia', roupa: 'terno', corRoupa: '#3a3f4b', sapato: 'social', rosto: 'confiante' }
	},
	{
		id: 'skatista', nome: 'Skatista', sexo: 'masculino', grupo: 'real', andar: 'gingado', inspiracao: 'ref. 14',
		personalidade: 'Antenado no que é novo: fala por gíria e entrega antes do prazo.',
		pecas: { porte: 'baixinho', pele: 'media', cabelo: 'curto', corCabelo: 'castanho', chapeu: 'bone', corExtra: '#d93a3a', oculos: 'solQuadrado', roupa: 'bomber', corRoupa: PRETO, baixo: 'cargo', corBaixo: '#6b6f78', sapato: 'tenisVermelho', rosto: 'serio' }
	},
	{
		id: 'minimalista', nome: 'Minimalista', sexo: 'masculino', grupo: 'real', andar: 'normal', inspiracao: 'arquétipo: o fundador minimalista',
		personalidade: 'Corta o excesso: menos botão, mais resultado.',
		pecas: { pele: 'negra', cabelo: 'raspado', corCabelo: 'preto', barba: 'porFazer', roupa: 'golaAlta', corRoupa: '#2a2d35', baixo: 'jeans', sapato: 'tenis', rosto: 'sorrisoFechado' }
	},
	{
		id: 'dj', nome: 'DJ', sexo: 'masculino', grupo: 'real', andar: 'saltitante', inspiracao: 'arquétipo: o DJ da festa',
		personalidade: 'Trabalha no ritmo da playlist e levanta o astral de qualquer sala.',
		pecas: { pele: 'retinta', cabelo: 'afroCurto', corCabelo: 'preto', chapeu: 'fone', corExtra: '#22c7e0', oculos: 'sol', roupa: 'moletom', corRoupa: '#7c5cd6', sapato: 'tenisPreto', detalhes: ['corrente'] }
	},
	{
		id: 'roqueiro', nome: 'Roqueiro', sexo: 'masculino', grupo: 'real', andar: 'gingado', inspiracao: 'arquétipo: o roqueiro de jaqueta',
		personalidade: 'Barulhento no bom sentido: liga o som e resolve o problema.',
		pecas: { pele: 'porcelana', cabelo: 'longo', corCabelo: 'castanho', barba: 'porFazer', roupa: 'jaquetaCouro', corRoupa: '#1c1f26', baixo: 'jeans', corBaixo: '#2b3a55', sapato: 'bota', detalhes: ['pulseiras'] }
	},
	{
		id: 'cientista', nome: 'Cientista', sexo: 'masculino', grupo: 'real', andar: 'normal', inspiracao: 'arquétipo: o cientista de jaleco',
		personalidade: 'Testa tudo antes de afirmar e adora um gráfico bem feito.',
		pecas: { porte: 'magro', pele: 'media', cabelo: 'calvoLados', corCabelo: 'grisalho', oculos: 'redondo', roupa: 'jaleco', corRoupa: BRANCO, sapato: 'marrom', naMao: 'prancheta', rosto: 'sorrisoFechado' }
	},
	{
		id: 'professor', nome: 'Professor', sexo: 'masculino', grupo: 'real', andar: 'tranquilo', inspiracao: 'arquétipo: o professor de suéter',
		personalidade: 'Explica qualquer coisa com um exemplo e um café.',
		pecas: { pele: 'negra', cabelo: 'afroCurto', corCabelo: 'grisalho', barba: 'cavanhaque', oculos: 'meiaLua', roupa: 'sueter', corRoupa: '#7d2337', baixo: 'calcaSocial', corBaixo: '#9b8a6e', sapato: 'marrom', naMao: 'livro' }
	},
	{
		id: 'atleta', nome: 'Atleta', sexo: 'masculino', grupo: 'real', andar: 'apressado', inspiracao: 'arquétipo: o atleta',
		personalidade: 'Disciplina de treino: bate a meta e já pensa na próxima.',
		pecas: { porte: 'forte', pele: 'parda', cabelo: 'curto', corCabelo: 'preto', roupa: 'regata', corRoupa: '#17915a', baixo: 'bermuda', corBaixo: PRETO, sapato: 'tenis', detalhes: ['relogio'] }
	},
	{
		id: 'estagiario', nome: 'Estagiário', sexo: 'masculino', grupo: 'real', andar: 'apressado', inspiracao: 'arquétipo: o estagiário animado',
		personalidade: 'Chegou ontem e já quer ajudar em tudo (e trouxe café).',
		pecas: { porte: 'magro', pele: 'clara', cabelo: 'espetado', corCabelo: 'castanhoClaro', roupa: 'camiseta', corRoupa: '#e0662a', baixo: 'jeans', sapato: 'tenis', naMao: 'cafe' }
	},
	{
		id: 'vendedor', nome: 'Vendedor', sexo: 'masculino', grupo: 'real', andar: 'elegante', inspiracao: 'arquétipo: o vendedor boa-praça',
		personalidade: 'Conversa com todo mundo e sempre tem um contato para indicar.',
		pecas: { pele: 'media', cabelo: 'penteadoTras', corCabelo: 'preto', barba: 'bigode', roupa: 'camisaDobrada', corRoupa: '#7fb0e0', baixo: 'calcaSocial', corBaixo: CALCA_ESCURA, sapato: 'marrom', naMao: 'celular', rosto: 'piscada' }
	},
	{
		id: 'criativo', nome: 'Criativo', sexo: 'masculino', grupo: 'real', andar: 'saltitante', inspiracao: 'arquétipo: o criativo de coque',
		personalidade: 'Enche o quadro de ideia e sempre acha um jeito diferente de contar.',
		pecas: { pele: 'clara', cabelo: 'coque', corCabelo: 'castanho', barba: 'cheia', roupa: 'xadrez', corRoupa: '#b0412e', baixo: 'jeans', sapato: 'bota' }
	},
	{
		id: 'fotografo', nome: 'Fotógrafo', sexo: 'masculino', grupo: 'real', andar: 'normal', inspiracao: 'arquétipo: o fotógrafo de rua',
		personalidade: 'Enxerga a foto antes de todo mundo e não perde um bom ângulo.',
		pecas: { pele: 'retinta', cabelo: 'dreads', corCabelo: 'preto', chapeu: 'gorro', corExtra: '#e0662a', roupa: 'jaqueta', corRoupa: '#c9a36a', baixo: 'cargo', corBaixo: '#4a505b', sapato: 'tenisPreto', naMao: 'camera' }
	},

	// ------------------------------------------- masculinos reais, segunda rodada
	{
		id: 'empolgado', nome: 'Empolgado', sexo: 'masculino', grupo: 'real', andar: 'saltitante', inspiracao: 'ref. 18 (tênis sem marca)',
		personalidade: 'Comemora cada entrega como gol de final: a energia dele contagia o andar inteiro.',
		pecas: { pele: 'media', cabelo: 'careca', barba: 'porFazer', oculos: 'grosso', roupa: 'bomber', corRoupa: '#d23a32', baixo: 'jeansRasgado', corBaixo: '#7f9cc0', sapato: 'tenisVermelho' }
	},
	{
		id: 'recrutador', nome: 'Recrutador', sexo: 'masculino', grupo: 'real', andar: 'apressado', inspiracao: 'ref. 19',
		personalidade: 'Aponta o talento de longe: sabe quem combina com cada vaga antes da entrevista.',
		pecas: { pele: 'morena', cabelo: 'arrepiado', corCabelo: 'preto', barba: 'porFazer', oculos: 'grosso', roupa: 'jaqueta', corRoupa: '#e8792b', baixo: 'calcaSocial', corBaixo: '#d6c3a0', sapato: 'marrom' }
	},
	{
		id: 'marceneiro', nome: 'Marceneiro', sexo: 'masculino', grupo: 'real', andar: 'tranquilo', inspiracao: 'ref. 20',
		personalidade: 'Mão na massa: conserta, monta e ainda explica como fez.',
		pecas: { pele: 'clara', cabelo: 'topete', corCabelo: 'castanho', barba: 'cheia', roupa: 'jaquetaCapuz', corRoupa: '#6b4a36', corExtra: '#3b6ea8', baixo: 'jeans', corBaixo: '#2b3a55', sapato: 'marrom' }
	},
	{
		id: 'conselheiro', nome: 'Conselheiro', sexo: 'masculino', grupo: 'real', andar: 'tranquilo', inspiracao: 'ref. 21',
		personalidade: 'Escuta a história inteira antes de opinar; o conselho dele vale ouro.',
		pecas: { pele: 'clara', cabelo: 'penteadoTras', corCabelo: 'branco', barba: 'curta', oculos: 'grosso', roupa: 'sueter', corRoupa: '#e6dccb', baixo: 'calcaSocial', corBaixo: '#8a7a66', sapato: 'marrom' }
	},
	{
		id: 'arquiteto', nome: 'Arquiteto', sexo: 'masculino', grupo: 'real', andar: 'normal', inspiracao: 'ref. 22',
		personalidade: 'Desenha a solução no guardanapo antes de o problema terminar de ser explicado.',
		pecas: { pele: 'clara', cabelo: 'onduladoCurto', corCabelo: 'preto', roupa: 'camisaCurta', corRoupa: OFF, baixo: 'calcaSocial', corBaixo: '#7f8f5e', sapato: 'marrom', rosto: 'confiante', detalhes: ['relogio'] }
	},
	{
		id: 'ranzinza', nome: 'Ranzinza', sexo: 'masculino', grupo: 'real', andar: 'pesado', inspiracao: 'ref. 23',
		personalidade: 'Desconfia de toda ideia nova, mas quando aprova, defende até o fim.',
		pecas: { pele: 'morena', cabelo: 'curto', corCabelo: 'preto', barba: 'bigodao', roupa: 'camisaCurta', corRoupa: '#e8e0cc', baixo: 'calcaSocial', corBaixo: '#4e4440', sapato: 'chinelo', naMao: 'bracosCruzados', rosto: 'serio', detalhes: ['relogio'] }
	},
	{
		id: 'veterano', nome: 'Veterano', sexo: 'masculino', grupo: 'real', andar: 'tranquilo', inspiracao: 'ref. 24 (sem a estampa e o número)',
		personalidade: 'Programa desde a internet discada: resolve sem pressa e sem drama.',
		pecas: { porte: 'gordinho', pele: 'clara', cabelo: 'ondulado', corCabelo: 'grisalho', barba: 'cheia', oculos: 'grau', roupa: 'camiseta', corRoupa: PRETO, baixo: 'calcaMoletom', corBaixo: '#2e2a28', sapato: 'tenisGrosso', rosto: 'sorrisoFechado', detalhes: ['tatuagem'] }
	},
	{
		id: 'vovo-inverno', nome: 'Vovô Inverno', sexo: 'masculino', grupo: 'real', andar: 'pesado', inspiracao: 'ref. 25 (sem as marcas)',
		personalidade: 'Rodou o mundo de mochila e sempre volta com uma história e um atalho novo.',
		pecas: { pele: 'porcelana', cabelo: 'curto', corCabelo: 'branco', barba: 'longa', chapeu: 'gorro', corExtra: '#b8763a', oculos: 'aviador', roupa: 'casacoPele', corRoupa: '#b65f6a', baixo: 'cargo', corBaixo: '#6f7f95', sapato: 'tenisVermelho', rosto: 'sorrisoFechado', detalhes: ['luvas'] }
	},
	{
		id: 'lutador', nome: 'Lutador', sexo: 'masculino', grupo: 'real', andar: 'gingado', inspiracao: 'ref. 26 (cara própria, sem a marca)',
		personalidade: 'Treina antes do expediente e encara cada bug como adversário de luta.',
		pecas: { porte: 'forte', pele: 'media', cabelo: 'flattop', corCabelo: 'loiro', oculos: 'sol', roupa: 'regata', corRoupa: '#5f9a45', baixo: 'cargo', corBaixo: '#4f6b36', sapato: 'tenisCor', corExtra: '#c98a3a', rosto: 'confiante', detalhes: ['corrente', 'pulseiras', 'suspensorio'] }
	},
	{
		id: 'gala', nome: 'Galã', sexo: 'masculino', grupo: 'real', andar: 'elegante', inspiracao: 'ref. 27',
		personalidade: 'Charme tranquilo: cumprimenta todo mundo pelo nome e fecha a venda.',
		pecas: { porte: 'forte', pele: 'clara', cabelo: 'repicado', corCabelo: 'preto', roupa: 'camisaCurta', corRoupa: '#24272e', baixo: 'jeans', corBaixo: '#3a3d44', sapato: 'marrom', rosto: 'confiante', detalhes: ['relogio'] }
	},
	{
		id: 'tiozao', nome: 'Tiozão', sexo: 'masculino', grupo: 'real', andar: 'tranquilo', inspiracao: 'ref. 36',
		personalidade: 'Faz o churrasco da firma e sabe o nome do filho de todo mundo.',
		pecas: { porte: 'gordinho', pele: 'negra', cabelo: 'calvoLados', corCabelo: 'grisalho', barba: 'cheia', roupa: 'xadrezAberta', corRoupa: '#d9772e', baixo: 'bermuda', corBaixo: '#5e5a55', sapato: 'marrom', rosto: 'sorrisoFechado' }
	},
	{
		id: 'barista', nome: 'Barista', sexo: 'masculino', grupo: 'real', andar: 'normal', inspiracao: 'ref. 41',
		personalidade: 'Acha que todo problema se resolve com um bom café e quase sempre tem razão.',
		pecas: { pele: 'media', cabelo: 'curto', corCabelo: 'preto', chapeu: 'bone', corExtra: PRETO, oculos: 'grosso', barba: 'cheia', roupa: 'camisaListrada', corRoupa: '#8fb6de', baixo: 'calcaLarga', corBaixo: PRETO, sapato: 'tenisLona', naMao: 'cafe', rosto: 'sorrisoFechado' }
	},
	{
		id: 'durao', nome: 'Durão', sexo: 'masculino', grupo: 'real', andar: 'pesado', inspiracao: 'ref. 42 (sem as marcas)',
		personalidade: 'Cara de poucos amigos e coração mole: é quem fica até tarde ajudando.',
		pecas: { pele: 'clara', cabelo: 'raspado', corCabelo: 'preto', barba: 'cheia', oculos: 'grau', roupa: 'puffer', corRoupa: '#3d4046', baixo: 'calcaSocial', corBaixo: '#5b5e64', sapato: 'bota', rosto: 'serio', detalhes: ['relogio'] }
	},
	{
		id: 'redator', nome: 'Redator', sexo: 'masculino', grupo: 'real', andar: 'normal', inspiracao: 'ref. 43',
		personalidade: 'Acha a palavra certa para tudo e ainda corta metade do texto.',
		pecas: { pele: 'clara', cabelo: 'onduladoCurto', corCabelo: 'grisalhoEscuro', barba: 'porFazer', oculos: 'grosso', roupa: 'camisaDobrada', corRoupa: '#7b9cc4', baixo: 'jeans', corBaixo: '#7f9cc0', sapato: 'marrom', detalhes: ['relogio', 'piercing'] }
	},
	{
		id: 'paizao', nome: 'Paizão', sexo: 'masculino', grupo: 'real', andar: 'tranquilo', inspiracao: 'ref. 46',
		personalidade: 'Acena para todo mundo no corredor e sempre tem um lanche na gaveta.',
		pecas: { porte: 'gordinho', pele: 'clara', cabelo: 'social', corCabelo: 'grisalho', barba: 'cavanhaque', roupa: 'camiseta', corRoupa: '#26365e', baixo: 'calcaSocial', corBaixo: '#7a5638', sapato: 'tenisLona', detalhes: ['relogio'] }
	},
	{
		id: 'barao', nome: 'Barão', sexo: 'masculino', grupo: 'real', andar: 'elegante', inspiracao: 'ref. 48',
		personalidade: 'Fala devagar, negocia melhor ainda e não perde a elegância nem no calor.',
		pecas: { pele: 'media', cabelo: 'curto', corCabelo: 'branco', barba: 'cheia', oculos: 'sol', chapeu: 'abaLarga', corExtra: '#efe9dc', roupa: 'ternoColete', corRoupa: '#ece6d8', sapato: 'marrom' }
	},
	{
		id: 'vovo-sorriso', nome: 'Vovô Sorriso', sexo: 'masculino', grupo: 'real', andar: 'tranquilo', inspiracao: 'ref. 50 (vovô genérico, de cardigã)',
		personalidade: 'Recebe todo mundo com um aceno e uma bala no bolso; ninguém sai triste da sala.',
		pecas: { pele: 'porcelana', cabelo: 'calvoLados', corCabelo: 'branco', oculos: 'redondo', roupa: 'cardiga', corRoupa: '#e9dfc9', baixo: 'calcaSocial', corBaixo: '#6b6f78', sapato: 'social' }
	},
	{
		id: 'boleiro', nome: 'Boleiro', sexo: 'masculino', grupo: 'real', andar: 'apressado', inspiracao: 'ref. 51 (jogador genérico, listras de cores próprias)',
		personalidade: 'Joga em equipe até no escritório: passa a bola, cobra o gol e comemora junto.',
		pecas: { pele: 'negra', cabelo: 'afroCurto', corCabelo: 'preto', roupa: 'camisaFutebol', corRoupa: '#6b3fa0', corExtra: '#f2c230', baixo: 'calcao', corBaixo: '#f1efe9', sapato: 'chuteira' }
	},
	{
		id: 'calouro', nome: 'Calouro', sexo: 'masculino', grupo: 'real', andar: 'apressado', inspiracao: 'ref. 52',
		personalidade: 'Primeiro dia todo dia: anota tudo, pergunta tudo e aprende rápido.',
		pecas: { porte: 'magro', pele: 'clara', cabelo: 'social', corCabelo: 'castanho', oculos: 'grosso', roupa: 'colete', corRoupa: '#d4a03a', baixo: 'calcaSocial', corBaixo: '#bfa984', sapato: 'marrom', rosto: 'sorrisoFechado', detalhes: ['mochila'] }
	},

	// ========================================================= masculinos de fantasia
	{
		id: 'ogro', nome: 'Ogro', sexo: 'masculino', grupo: 'fantasia', andar: 'pesado', inspiracao: 'ref. 12 (gigante verde, original)',
		personalidade: 'Cara de bravo, coração mole: é o primeiro a ajudar a carregar peso.',
		pecas: { porte: 'gigante', pele: 'verde', cabelo: 'espetado', corCabelo: 'preto', roupa: 'semCamisa', baixo: 'bermudaRasgada', corBaixo: '#8a6a3e', sapato: 'descalco', rosto: 'bravo', detalhes: ['presas'] }
	},
	{
		id: 'colosso', nome: 'Colosso', sexo: 'masculino', grupo: 'fantasia', andar: 'gingado', inspiracao: 'ref. 13 (gigante de jaqueta jeans, original)',
		personalidade: 'Estilo de sobra e paciência de monge.',
		pecas: { porte: 'gigante', pele: 'lima', cabelo: 'curto', corCabelo: 'preto', oculos: 'sol', roupa: 'jeans', corRoupa: '#4a6fa5', baixo: 'cargo', corBaixo: '#1c1f26', sapato: 'tenisVermelho', corExtra: '#d93a3a', rosto: 'confiante', detalhes: ['corrente', 'relogio'] }
	},
	{
		id: 'brutamontes', nome: 'Brutamontes', sexo: 'masculino', grupo: 'fantasia', andar: 'pesado', inspiracao: 'ref. 11 (gigante rosa, original)',
		personalidade: 'Quieto e leal: come por três e protege a turma inteira.',
		pecas: { porte: 'forte', pele: 'rosa', cabelo: 'moicano', corCabelo: 'roxo', roupa: 'semCamisa', baixo: 'bufante', corBaixo: '#2c7a7b', sapato: 'botaAlta', corExtra: '#1f2230', rosto: 'serio', detalhes: ['orelhaPontuda', 'pulseiras'] }
	},
	{
		id: 'robo', nome: 'Robô', sexo: 'masculino', grupo: 'fantasia', andar: 'robotico', inspiracao: 'arquétipo: robô de escritório',
		personalidade: 'Literal, preciso e educadíssimo: "Tarefa recebida. Processando."',
		pecas: { pele: 'cinza', cabelo: 'careca', roupa: 'robo', corRoupa: '#8d99a8', baixo: 'legging', corBaixo: '#6b7684', sapato: 'botaRobo', corExtra: '#22c7e0', detalhes: ['cabecaRobo', 'antenas'] }
	},
	{
		id: 'alienigena', nome: 'Alienígena', sexo: 'masculino', grupo: 'fantasia', andar: 'flutuante', inspiracao: 'arquétipo: visitante espacial',
		personalidade: 'Veio de longe estudar os humanos e anota tudo num caderninho.',
		pecas: { porte: 'magro', pele: 'lilas', cabelo: 'careca', roupa: 'macacao', corRoupa: PRATA, corExtra: '#7c5cd6', sapato: 'tenis', detalhes: ['antenas', 'olhosBrilhando'] }
	},
	{
		id: 'vampiro', nome: 'Vampiro', sexo: 'masculino', grupo: 'fantasia', andar: 'elegante', inspiracao: 'arquétipo: vampiro clássico',
		personalidade: 'Elegante e noturno: só rende depois do pôr do sol.',
		pecas: { pele: 'palida', cabelo: 'penteadoTras', corCabelo: 'preto', roupa: 'smoking', corRoupa: '#1c1f26', corExtra: '#8c1f33', sapato: 'social', rosto: 'confiante', detalhes: ['capa', 'caninos', 'orelhaPontuda'] }
	},
	{
		id: 'mago', nome: 'Mago', sexo: 'masculino', grupo: 'fantasia', andar: 'tranquilo', inspiracao: 'arquétipo: mago de barba longa',
		personalidade: 'Sábio e misterioso: sempre tem uma solução na manga.',
		pecas: { pele: 'clara', cabelo: 'longo', corCabelo: 'branco', barba: 'longa', chapeu: 'chapeuMago', corExtra: '#2f4a9a', roupa: 'tunica', corRoupa: '#2f4a9a', sapato: 'marrom', naMao: 'cajado', rosto: 'sorrisoFechado' }
	},
	{
		id: 'diabinho', nome: 'Diabinho', sexo: 'masculino', grupo: 'fantasia', andar: 'saltitante', inspiracao: 'arquétipo: diabinho de desenho',
		personalidade: 'Provocador simpático: sempre pergunta "e se a gente arriscar?".',
		pecas: { pele: 'vermelha', cabelo: 'topete', corCabelo: 'preto', barba: 'cavanhaque', roupa: 'terno', corRoupa: '#1c1f26', sapato: 'social', rosto: 'piscada', detalhes: ['chifres', 'cauda'] }
	},
	{
		id: 'heroi', nome: 'Herói', sexo: 'masculino', grupo: 'heroi', andar: 'apressado', inspiracao: 'arquétipo: super-herói de capa (cores e emblema próprios)',
		personalidade: 'Chega voando quando o prazo aperta e salva a entrega.',
		pecas: { porte: 'forte', pele: 'morena', cabelo: 'social', corCabelo: 'preto', roupa: 'uniformeHeroi', corRoupa: '#17915a', baixo: 'legging', corBaixo: '#17915a', corExtra: '#ff6f00', sapato: 'botaAlta', rosto: 'confiante', detalhes: ['capa', 'mascara'] }
	},
	{
		id: 'ninja', nome: 'Ninja', sexo: 'masculino', grupo: 'heroi', andar: 'furtivo', inspiracao: 'arquétipo: ninja',
		personalidade: 'Silencioso e certeiro: quando você percebe, já terminou.',
		pecas: { pele: 'media', cabelo: 'curto', corCabelo: 'preto', chapeu: 'bandana', corExtra: '#d93a3a', roupa: 'quimono', corRoupa: PRETO, sapato: 'sapatilha', rosto: 'serio', detalhes: ['mascaraNinja'] }
	},
	{
		id: 'cacador', nome: 'Caçador noturno', sexo: 'masculino', grupo: 'heroi', andar: 'normal', inspiracao: 'arquétipo: vigilante de capuz',
		personalidade: 'Vigia a noite toda: nada passa sem ele ver.',
		pecas: { pele: 'porcelana', cabelo: 'espetado', corCabelo: 'platinado', chapeu: 'capuz', corExtra: '#2a2d35', oculos: 'aviador', roupa: 'sobretudo', corRoupa: PRETO, baixo: 'calcaSocial', corBaixo: '#1c1f26', sapato: 'bota', rosto: 'serio', detalhes: ['luvas'] }
	},

	{
		id: 'mascarado', nome: 'Mascarado', sexo: 'masculino', grupo: 'heroi', andar: 'gingado', inspiracao: 'ref. 31 (herói nosso: máscara e cores próprias, sem teia nem aranha)',
		personalidade: 'Ninguém sabe quem é, mas o problema some quando ele passa.',
		pecas: { pele: 'negra', cabelo: 'curto', corCabelo: 'preto', chapeu: 'capuz', corExtra: '#e0a020', roupa: 'bomber', corRoupa: '#4b3a8c', baixo: 'bermuda', corBaixo: '#3b3f47', sapato: 'tenisPreto', rosto: 'serio', detalhes: ['mascaraInteira', 'luvas'] }
	},
	{
		id: 'samurai', nome: 'Samurai', sexo: 'masculino', grupo: 'heroi', andar: 'elegante', inspiracao: 'ref. 32 (sem máscara de aranha nem símbolo)',
		personalidade: 'Disciplina antes de tudo: termina o que começa e não deixa ponta solta.',
		pecas: { pele: 'media', cabelo: 'coque', corCabelo: 'preto', chapeu: 'chapeuPalha', corExtra: '#c9a86a', roupa: 'haori', corRoupa: '#2f3f6e', baixo: 'hakama', corBaixo: PRETO, sapato: 'sapatilha', rosto: 'serio', detalhes: ['mascaraNinja', 'espada'] }
	},

	// =============================================== masculinos bichos de roupa
	{
		id: 'urso', nome: 'Urso', sexo: 'masculino', grupo: 'bicho', andar: 'pesado', inspiracao: 'ref. 28',
		personalidade: 'Abraço de urso e paciência de hibernação: nunca perde a calma.',
		pecas: { bicho: 'urso', porte: 'forte', cabelo: 'careca', roupa: 'jaquetaPelucia', corRoupa: '#6b6b3e', baixo: 'calcaSocial', corBaixo: '#2b3240', sapato: 'patas', rosto: 'sorrisoFechado' }
	},
	{
		id: 'guaxinim', nome: 'Guaxinim', sexo: 'masculino', grupo: 'bicho', andar: 'gingado', inspiracao: 'ref. 30 (sem a marca do tênis)',
		personalidade: 'Acha qualquer arquivo perdido no servidor (e uns que ninguém sabia que existiam).',
		pecas: { bicho: 'guaxinim', cabelo: 'careca', chapeu: 'gorro', corExtra: '#b7c9a0', roupa: 'moletom', corRoupa: '#b9cfa2', baixo: 'cargo', corBaixo: '#e6e0d0', sapato: 'tenis', naMao: 'bracosCruzados', rosto: 'confiante', detalhes: ['corrente', 'rabo'] }
	},
	{
		id: 'tigre', nome: 'Tigre', sexo: 'masculino', grupo: 'bicho', andar: 'furtivo', inspiracao: 'ref. 33',
		personalidade: 'Fala pouco e encara o problema de frente; quando ataca, resolve.',
		pecas: { bicho: 'tigre', porte: 'forte', cabelo: 'careca', roupa: 'camiseta', corRoupa: '#f1efe9', baixo: 'calcaSocial', corBaixo: '#2b3240', sapato: 'tenisPreto', naMao: 'bracosCruzados', rosto: 'serio', detalhes: ['rabo'] }
	},
	{
		id: 'golden', nome: 'Golden', sexo: 'masculino', grupo: 'bicho', andar: 'elegante', inspiracao: 'ref. 34',
		personalidade: 'Leal e educado: lembra do aniversário de todo mundo e nunca se atrasa.',
		pecas: { bicho: 'cachorro', cabelo: 'careca', roupa: 'sobretudo', corRoupa: '#b8925e', baixo: 'calcaSocial', corBaixo: '#4a3f38', sapato: 'marrom', corExtra: '#a8643a', rosto: 'sorrisoFechado', detalhes: ['cachecol', 'luvas'] }
	},
	{
		id: 'lobo', nome: 'Lobo', sexo: 'masculino', grupo: 'bicho', andar: 'deslizante', inspiracao: 'ref. 54',
		personalidade: 'Malandro charmoso: negocia qualquer prazo com um sorriso de canto.',
		pecas: { bicho: 'lobo', cabelo: 'careca', oculos: 'solRedondo', roupa: 'terno', corRoupa: '#f1efe9', sapato: 'socialBranco', rosto: 'confiante', detalhes: ['rabo'] }
	},
	{
		id: 'macaco', nome: 'Macaco', sexo: 'masculino', grupo: 'bicho', andar: 'saltitante', inspiracao: 'ref. 55',
		personalidade: 'Brincalhão e esperto: vira a reunião mais chata numa festa (e divide a banana).',
		pecas: { bicho: 'macaco', porte: 'baixinho', cabelo: 'careca', roupa: 'semCamisa', baixo: 'bermuda', corBaixo: '#c9a86a', sapato: 'patas', naMao: 'banana', detalhes: ['rabo'] }
	},

	// ================================================================ femininas reais
	{
		id: 'executiva', nome: 'Executiva', sexo: 'feminino', grupo: 'real', andar: 'elegante', inspiracao: 'ref. 2',
		personalidade: 'Elegante e prática: resolve a reunião difícil sem perder o sorriso.',
		pecas: { pele: 'clara', cabelo: 'ondulado', corCabelo: 'castanhoClaro', roupa: 'blusaAmpla', corRoupa: '#d9cfc1', baixo: 'saiaMidi', corBaixo: '#b8a07a', sapato: 'nude', naMao: 'bolsa', corExtra: OFF, detalhes: ['argolas'] }
	},
	{
		id: 'diretora-criativa', nome: 'Diretora criativa', sexo: 'feminino', grupo: 'real', andar: 'normal', inspiracao: 'ref. 3',
		personalidade: 'Cheia de ideia e de opinião: puxa o time para cima.',
		pecas: { pele: 'porcelana', cabelo: 'chanelCacheado', corCabelo: 'ruivo', roupa: 'blazerVestido', corRoupa: '#3b5fd0', baixo: 'saiaLonga', corBaixo: '#4f8fd6', sapato: 'plataforma', naMao: 'bolsaOmbro', corExtra: OFF, rosto: 'confiante', detalhes: ['lenco', 'argolas'] }
	},
	{
		id: 'analista', nome: 'Analista', sexo: 'feminino', grupo: 'real', andar: 'tranquilo', inspiracao: 'ref. 7',
		personalidade: 'Observadora e calma: acha o detalhe que ninguém viu.',
		pecas: { pele: 'media', cabelo: 'cachosVolumosos', corCabelo: 'mel', oculos: 'redondo', roupa: 'camisaDobrada', corRoupa: '#f3e6cf', baixo: 'pantalona', corBaixo: '#b98a5e', sapato: 'nude', rosto: 'sorrisoFechado', detalhes: ['sardas'] }
	},
	{
		id: 'estilosa', nome: 'Estilosa', sexo: 'feminino', grupo: 'real', andar: 'saltitante', inspiracao: 'ref. 15',
		personalidade: 'Animada e cheia de referência: transforma qualquer briefing em moodboard.',
		pecas: { pele: 'clara', cabelo: 'coque', corCabelo: 'castanho', chapeu: 'laco', corExtra: '#e6d3b3', roupa: 'jaquetaCurta', corRoupa: '#cdb89a', baixo: 'pantalona', corBaixo: '#3d5a80', sapato: 'tenis' }
	},
	{
		id: 'gerente', nome: 'Gerente', sexo: 'feminino', grupo: 'real', andar: 'normal', inspiracao: 'ref. 16',
		personalidade: 'Organizada e gentil: a lista de tarefas está sempre em dia.',
		pecas: { pele: 'clara', cabelo: 'chanel', corCabelo: 'castanhoClaro', roupa: 'camisaDobrada', corRoupa: '#f2e08a', baixo: 'pantalona', corBaixo: '#efe9dc', sapato: 'sandalia', naMao: 'bolsa', corExtra: '#e8d36a', detalhes: ['argolas'] }
	},
	{
		id: 'consultora', nome: 'Consultora', sexo: 'feminino', grupo: 'real', andar: 'gingado', inspiracao: 'ref. 17',
		personalidade: 'Segura e direta: entra na sala e todo mundo presta atenção.',
		pecas: { pele: 'parda', cabelo: 'raboCacheado', corCabelo: 'preto', roupa: 'camisaDobrada', corRoupa: '#8c1f33', baixo: 'calcaSocial', corBaixo: '#2b4170', sapato: 'marrom', rosto: 'confiante', detalhes: ['argolas'] }
	},
	{
		id: 'produtora', nome: 'Produtora', sexo: 'feminino', grupo: 'real', andar: 'apressado', inspiracao: 'arquétipo: a produtora que faz acontecer',
		personalidade: 'Faz acontecer: cronograma na cabeça e três coisas ao mesmo tempo.',
		pecas: { pele: 'negra', cabelo: 'trancas', corCabelo: 'preto', roupa: 'jaqueta', corRoupa: '#e0662a', baixo: 'jeans', sapato: 'tenis', naMao: 'notebook' }
	},
	{
		id: 'vovo', nome: 'Vovó', sexo: 'feminino', grupo: 'real', andar: 'tranquilo', inspiracao: 'arquétipo: a vovó de óculos de leitura',
		personalidade: 'Doce e afiada: lembra de tudo e não deixa ninguém sem lanche.',
		pecas: { pele: 'porcelana', cabelo: 'coque', corCabelo: 'branco', oculos: 'meiaLua', roupa: 'sueter', corRoupa: '#9b7fc8', baixo: 'saiaMidi', corBaixo: '#6b6f78', sapato: 'marrom', naMao: 'cafe' }
	},
	{
		id: 'corredora', nome: 'Corredora', sexo: 'feminino', grupo: 'real', andar: 'saltitante', inspiracao: 'arquétipo: a corredora',
		personalidade: 'Energia de manhã cedo: corre 5 km e ainda chega primeiro.',
		pecas: { porte: 'magro', pele: 'morena', cabelo: 'rabo', corCabelo: 'loiro', roupa: 'top', corRoupa: '#e05a7a', baixo: 'legging', corBaixo: PRETO, sapato: 'tenis', detalhes: ['relogio'] }
	},
	{
		id: 'doutora', nome: 'Doutora', sexo: 'feminino', grupo: 'real', andar: 'apressado', inspiracao: 'arquétipo: a médica',
		personalidade: 'Calma na urgência: examina, explica e resolve.',
		pecas: { pele: 'negra', cabelo: 'coque', corCabelo: 'preto', oculos: 'gatinho', roupa: 'jaleco', corRoupa: BRANCO, baixo: 'calcaSocial', corBaixo: CALCA_ESCURA, sapato: 'social', naMao: 'prancheta', rosto: 'sorrisoFechado' }
	},
	{
		id: 'estudante', nome: 'Estudante', sexo: 'feminino', grupo: 'real', andar: 'apressado', inspiracao: 'arquétipo: a estudante curiosa',
		personalidade: 'Curiosa sem fim: pergunta o porquê de tudo (e anota).',
		pecas: { porte: 'baixinho', pele: 'media', cabelo: 'mariaChiquinha', corCabelo: 'castanho', roupa: 'moletom', corRoupa: '#e05a7a', baixo: 'jeans', sapato: 'tenis', naMao: 'celular' }
	},
	{
		id: 'ceo', nome: 'CEO', sexo: 'feminino', grupo: 'real', andar: 'elegante', inspiracao: 'arquétipo: a CEO de tailleur',
		personalidade: 'Visão longa e passo firme: decide e assume.',
		pecas: { pele: 'negra', cabelo: 'black', corCabelo: 'preto', roupa: 'terno', corRoupa: '#7d2337', sapato: 'salto', rosto: 'confiante', detalhes: ['argolas'] }
	},
	{
		id: 'artista', nome: 'Artista', sexo: 'feminino', grupo: 'real', andar: 'gingado', inspiracao: 'arquétipo: a artista de boina',
		personalidade: 'Vê cor em tudo: rabisca uma ideia antes da reunião acabar.',
		pecas: { pele: 'clara', cabelo: 'joaozinho', corCabelo: 'rosa', chapeu: 'boina', corExtra: '#1c1f26', roupa: 'xadrez', corRoupa: '#2f8f5a', baixo: 'jeans', sapato: 'bota', naMao: 'livro' }
	},
	{
		id: 'dancarina', nome: 'Dançarina', sexo: 'feminino', grupo: 'real', andar: 'gingado', inspiracao: 'arquétipo: a dançarina',
		personalidade: 'Contagiante: transforma até a planilha numa coreografia.',
		pecas: { pele: 'parda', cabelo: 'ondulado', corCabelo: 'mel', roupa: 'top', corRoupa: '#d9a73a', baixo: 'saiaRodada', corBaixo: '#7c5cd6', sapato: 'sandalia', detalhes: ['pulseiras', 'argolas'] }
	},
	{
		id: 'roqueira', nome: 'Roqueira', sexo: 'feminino', grupo: 'real', andar: 'pesado', inspiracao: 'arquétipo: a roqueira de franja',
		personalidade: 'Sincera até demais: aponta o problema e já traz o conserto.',
		pecas: { pele: 'porcelana', cabelo: 'franja', corCabelo: 'preto', roupa: 'jaquetaCouro', corRoupa: '#1c1f26', baixo: 'jeans', corBaixo: PRETO, sapato: 'bota', rosto: 'confiante', detalhes: ['corrente'] }
	},
	{
		id: 'social-media', nome: 'Social media', sexo: 'feminino', grupo: 'real', andar: 'apressado', inspiracao: 'arquétipo: a social media',
		personalidade: 'Sabe o que está bombando antes de todo mundo e já tem a legenda pronta.',
		pecas: { pele: 'media', cabelo: 'rabo', corCabelo: 'castanho', roupa: 'jeans', corRoupa: '#e05a7a', sapato: 'tenis', naMao: 'celular', rosto: 'piscada' }
	},
	{
		id: 'advogada', nome: 'Advogada', sexo: 'feminino', grupo: 'real', andar: 'elegante', inspiracao: 'arquétipo: a advogada',
		personalidade: 'Firme e detalhista: lê as letras miúdas que todo mundo pula.',
		pecas: { pele: 'clara', cabelo: 'chanel', corCabelo: 'preto', roupa: 'terno', corRoupa: MARINHO, sapato: 'social', naMao: 'maleta', corExtra: '#1c1f26', rosto: 'serio' }
	},
	{
		id: 'programadora', nome: 'Programadora', sexo: 'feminino', grupo: 'real', andar: 'normal', inspiracao: 'arquétipo: a programadora de fone',
		personalidade: 'Fone no ouvido e foco total: entrega código limpo e piada ruim.',
		pecas: { pele: 'media', cabelo: 'chanel', corCabelo: 'roxo', oculos: 'grosso', chapeu: 'fone', corExtra: '#ff6f00', roupa: 'moletom', corRoupa: PRETO, baixo: 'jeans', sapato: 'tenisPreto', naMao: 'notebook' }
	},

	// --------------------------------------------- femininas reais, segunda rodada
	{
		id: 'anfitria', nome: 'Anfitriã', sexo: 'feminino', grupo: 'real', andar: 'elegante', inspiracao: 'ref. 37',
		personalidade: 'Recebe cliente como visita em casa: ninguém sai sem café e sem solução.',
		pecas: { pele: 'clara', cabelo: 'coqueSolto', corCabelo: 'mel', roupa: 'vestidoEnvelope', corRoupa: '#7d8a3a', sapato: 'sandalia', naMao: 'bolsa', corExtra: '#d9b45a', rosto: 'sorrisoFechado', detalhes: ['pulseiras'] }
	},
	{
		id: 'romantica', nome: 'Romântica', sexo: 'feminino', grupo: 'real', andar: 'tranquilo', inspiracao: 'ref. 38',
		personalidade: 'Sonhadora com prazo: enfeita a apresentação e ainda entrega no horário.',
		pecas: { pele: 'clara', cabelo: 'chanelOndulado', corCabelo: 'castanho', roupa: 'blusaEnvelope', corRoupa: '#6b7a3a', baixo: 'saiaFlorida', corBaixo: '#8fa070', sapato: 'nude', naMao: 'bolsa', corExtra: '#56632f', rosto: 'sorrisoFechado', detalhes: ['sardas', 'argolas'] }
	},
	{
		id: 'curadora', nome: 'Curadora', sexo: 'feminino', grupo: 'real', andar: 'normal', inspiracao: 'ref. 39 (sem a marca do tênis)',
		personalidade: 'Sabe onde está cada arquivo e cada referência; organiza a bagunça com estilo.',
		pecas: { pele: 'morena', cabelo: 'ondulado', corCabelo: 'castanhoClaro', oculos: 'tartaruga', roupa: 'trenchCurto', corRoupa: '#d8c3a0', baixo: 'calcaLarga', corBaixo: '#9aa0a8', sapato: 'tenisCor', naMao: 'sacola', corExtra: '#8a4f2e', detalhes: ['relogio'] }
	},
	{
		id: 'descolada', nome: 'Descolada', sexo: 'feminino', grupo: 'real', andar: 'gingado', inspiracao: 'ref. 40 (boné e tênis sem marca)',
		personalidade: 'Chega com café gelado e playlist pronta; resolve tudo sem perder a leveza.',
		pecas: { pele: 'parda', cabelo: 'ondulado', corCabelo: 'preto', chapeu: 'bone', corExtra: '#2f7a4a', roupa: 'regata', corRoupa: BRANCO, baixo: 'calcaLarga', corBaixo: '#9cb7d6', sapato: 'tenisCor', naMao: 'cafeGelado', rosto: 'sorrisoFechado', detalhes: ['relogio'] }
	},
	{
		id: 'recepcionista', nome: 'Recepcionista', sexo: 'feminino', grupo: 'real', andar: 'normal', inspiracao: 'ref. 44 (crachá sem escrita nem logo)',
		personalidade: 'Primeiro sorriso de quem chega: sabe quem é quem e onde fica cada coisa.',
		pecas: { pele: 'clara', cabelo: 'ombro', corCabelo: 'castanho', oculos: 'grosso', roupa: 'blazer', corRoupa: '#24272e', baixo: 'calcaSocial', corBaixo: '#24272e', sapato: 'social', detalhes: ['cracha', 'argolas'] }
	},
	{
		id: 'professora', nome: 'Professora', sexo: 'feminino', grupo: 'real', andar: 'normal', inspiracao: 'ref. 45',
		personalidade: 'Transforma assunto difícil em aula boa; ninguém sai da reunião com dúvida.',
		pecas: { pele: 'morena', cabelo: 'coqueSolto', corCabelo: 'castanho', roupa: 'blazer', corRoupa: '#cdb89a', baixo: 'calcaSocial', corBaixo: '#24272e', sapato: 'social', naMao: 'caneta', rosto: 'confiante', detalhes: ['cracha', 'relogio'] }
	},
	{
		id: 'soldada', nome: 'Soldada', sexo: 'feminino', grupo: 'real', andar: 'apressado', inspiracao: 'ref. 47 (sem bandeira, nome nem insígnia)',
		personalidade: 'Missão dada é missão cumprida: organiza o time e não deixa ninguém para trás.',
		pecas: { pele: 'clara', cabelo: 'duasTrancas', corCabelo: 'loiro', chapeu: 'boina', corExtra: '#2f5a35', roupa: 'camuflado', corRoupa: '#5a6b45', sapato: 'coturno', rosto: 'serio' }
	},
	{
		id: 'dama', nome: 'Dama', sexo: 'feminino', grupo: 'real', andar: 'tranquilo', inspiracao: 'ref. 49 (senhora elegante genérica)',
		personalidade: 'Pontual e de opinião firme: quando ela aprova, está aprovado.',
		pecas: { pele: 'porcelana', cabelo: 'permanente', corCabelo: 'branco', chapeu: 'chapeuFlor', roupa: 'casacoLongo', corRoupa: '#d97a96', sapato: 'social', naMao: 'bolsa', rosto: 'serio', detalhes: ['perolas', 'luvas'] }
	},
	{
		id: 'ruivinha', nome: 'Ruivinha', sexo: 'feminino', grupo: 'real', andar: 'saltitante', inspiracao: 'ref. 53',
		personalidade: 'Curiosa e risonha: faz a pergunta que ninguém teve coragem de fazer.',
		pecas: { porte: 'baixinho', pele: 'porcelana', cabelo: 'cachosVolumosos', corCabelo: 'ruivo', roupa: 'trico', corRoupa: '#f1ebe0', baixo: 'jardineira', corBaixo: '#8a8672', sapato: 'tenisCor', corExtra: '#c97a3a', detalhes: ['sardas'] }
	},
	{
		id: 'jogadora', nome: 'Jogadora', sexo: 'feminino', grupo: 'real', andar: 'apressado', inspiracao: 'ref. 51 (versão dela, listras de cores próprias)',
		personalidade: 'Garra de final de campeonato: corre atrás de cada bola e de cada prazo.',
		pecas: { pele: 'negra', cabelo: 'rabo', corCabelo: 'preto', roupa: 'camisaFutebol', corRoupa: '#e0662a', corExtra: MARINHO, baixo: 'calcao', corBaixo: MARINHO, sapato: 'chuteira', rosto: 'confiante' }
	},
	{
		id: 'aventureira', nome: 'Aventureira', sexo: 'feminino', grupo: 'real', andar: 'apressado', inspiracao: 'refs. 25 e 42 (versão dela)',
		personalidade: 'Topa qualquer desafio fora da rotina e volta com o problema resolvido.',
		pecas: { pele: 'retinta', cabelo: 'trancas', corCabelo: 'preto', chapeu: 'gorro', corExtra: '#f2c230', roupa: 'puffer', corRoupa: '#2c7a7b', baixo: 'cargo', corBaixo: '#5b5e64', sapato: 'coturno', detalhes: ['mochila'] }
	},
	{
		id: 'marceneira', nome: 'Marceneira', sexo: 'feminino', grupo: 'real', andar: 'normal', inspiracao: 'ref. 20 (versão dela)',
		personalidade: 'Faz, desmonta e refaz até ficar perfeito: capricho não se terceiriza.',
		pecas: { pele: 'media', cabelo: 'ombro', corCabelo: 'ruivo', roupa: 'jaquetaCapuz', corRoupa: '#7a5a3a', corExtra: '#b03a2e', baixo: 'jeans', corBaixo: '#3d5a80', sapato: 'bota' }
	},

	// ========================================================== femininas de fantasia
	{
		id: 'heroina', nome: 'Heroína', sexo: 'feminino', grupo: 'heroi', andar: 'apressado', inspiracao: 'arquétipo: super-heroína de capa (cores e emblema próprios)',
		personalidade: 'Corajosa e otimista: aparece na hora certa e ainda elogia o time.',
		pecas: { pele: 'parda', cabelo: 'black', corCabelo: 'castanho', roupa: 'uniformeHeroi', corRoupa: '#7c5cd6', baixo: 'legging', corBaixo: '#7c5cd6', corExtra: '#f2c230', sapato: 'botaAlta', rosto: 'confiante', detalhes: ['capa', 'mascara'] }
	},
	{
		id: 'guerreira', nome: 'Guerreira', sexo: 'feminino', grupo: 'heroi', andar: 'furtivo', inspiracao: 'arquétipo: ninja',
		personalidade: 'Focada e veloz: some na hora do almoço e volta com tudo pronto.',
		pecas: { pele: 'media', cabelo: 'rabo', corCabelo: 'preto', chapeu: 'bandana', corExtra: PRETO, roupa: 'quimono', corRoupa: '#8c1f33', sapato: 'sapatilha', rosto: 'serio', detalhes: ['mascaraNinja'] }
	},
	{
		id: 'feiticeira', nome: 'Feiticeira', sexo: 'feminino', grupo: 'fantasia', andar: 'flutuante', inspiracao: 'arquétipo: bruxa simpática',
		personalidade: 'Misteriosa e engraçada: resolve tudo com uma "poção" de planilha.',
		pecas: { pele: 'clara', cabelo: 'longo', corCabelo: 'roxo', chapeu: 'chapeuMago', corExtra: '#1c1f26', roupa: 'tunica', corRoupa: '#3a2d5c', sapato: 'bota', naMao: 'livro', rosto: 'piscada', detalhes: ['aura'] }
	},
	{
		id: 'vampira', nome: 'Vampira', sexo: 'feminino', grupo: 'fantasia', andar: 'deslizante', inspiracao: 'arquétipo: vampira clássica',
		personalidade: 'Charmosa e noturna: tem as melhores ideias depois da meia-noite.',
		pecas: { pele: 'palida', cabelo: 'ondulado', corCabelo: 'preto', roupa: 'vestido', corRoupa: '#5c1426', corExtra: '#1c1f26', sapato: 'salto', rosto: 'confiante', detalhes: ['capa', 'caninos'] }
	},
	{
		id: 'elfa', nome: 'Elfa', sexo: 'feminino', grupo: 'fantasia', andar: 'elegante', inspiracao: 'arquétipo: elfa da floresta',
		personalidade: 'Paciente e precisa: mira no detalhe e acerta de primeira.',
		pecas: { pele: 'porcelana', cabelo: 'longo', corCabelo: 'platinado', chapeu: 'tiara', corExtra: '#e8c25a', roupa: 'vestido', corRoupa: '#2f8f5a', baixo: 'saiaLonga', corBaixo: '#2f8f5a', sapato: 'sandalia', rosto: 'sorrisoFechado', detalhes: ['orelhaPontuda'] }
	},
	{
		id: 'androide', nome: 'Androide', sexo: 'feminino', grupo: 'fantasia', andar: 'robotico', inspiracao: 'arquétipo: androide',
		personalidade: 'Gentil e incansável: responde em milissegundos e nunca esquece um prazo.',
		pecas: { pele: 'cinza', cabelo: 'chanel', corCabelo: 'azul', oculos: 'visor', corExtra: '#22c7e0', roupa: 'robo', corRoupa: PRATA, baixo: 'legging', corBaixo: '#8d99a8', sapato: 'botaRobo', detalhes: ['antenas'] }
	},
	{
		id: 'marciana', nome: 'Marciana', sexo: 'feminino', grupo: 'fantasia', andar: 'flutuante', inspiracao: 'arquétipo: visitante espacial',
		personalidade: 'Fascinada pela Terra: acha o café a melhor invenção humana.',
		pecas: { pele: 'azul', cabelo: 'coque', corCabelo: 'rosa', roupa: 'vestido', corRoupa: PRATA, sapato: 'plataforma', corExtra: PRATA, detalhes: ['antenas', 'olhosBrilhando'] }
	},
	{
		id: 'troll', nome: 'Troll', sexo: 'feminino', grupo: 'fantasia', andar: 'pesado', inspiracao: 'refs. 11 a 13 (gigante, versão dela)',
		personalidade: 'Grandona e risonha: o abraço quebra costela, mas vale a pena.',
		pecas: { porte: 'gigante', pele: 'verde', cabelo: 'trancas', corCabelo: 'ruivo', roupa: 'regata', corRoupa: '#8a6a3e', baixo: 'bermudaRasgada', corBaixo: '#5a3d26', sapato: 'descalco', detalhes: ['presas'] }
	},
	{
		id: 'anjo', nome: 'Anjo', sexo: 'feminino', grupo: 'fantasia', andar: 'flutuante', inspiracao: 'arquétipo: anjo',
		personalidade: 'Paz em pessoa: acalma qualquer crise com uma frase.',
		pecas: { pele: 'negra', cabelo: 'cachosVolumosos', corCabelo: 'platinado', chapeu: 'aureola', corExtra: '#f2c230', roupa: 'vestido', corRoupa: OFF, baixo: 'saiaLonga', corBaixo: OFF, sapato: 'sandalia', rosto: 'sonhador', detalhes: ['asas'] }
	},
	{
		id: 'mascarada', nome: 'Mascarada', sexo: 'feminino', grupo: 'heroi', andar: 'saltitante', inspiracao: 'ref. 31 (versão dela: máscara e cores próprias, sem teia nem aranha)',
		personalidade: 'Aparece do nada quando o sistema cai e some antes de alguém agradecer.',
		pecas: { pele: 'parda', cabelo: 'curto', corCabelo: 'preto', chapeu: 'capuz', corExtra: '#2fb3a0', roupa: 'bomber', corRoupa: '#e05a7a', baixo: 'legging', corBaixo: PRETO, sapato: 'tenisCor', rosto: 'serio', detalhes: ['mascaraInteira'] }
	},
	{
		id: 'espadachim', nome: 'Espadachim', sexo: 'feminino', grupo: 'heroi', andar: 'elegante', inspiracao: 'ref. 32 (versão dela, sem símbolo)',
		personalidade: 'Calma de quem treinou mil vezes: um corte preciso e o problema acabou.',
		pecas: { pele: 'clara', cabelo: 'rabo', corCabelo: 'preto', chapeu: 'chapeuPalha', corExtra: '#d9c08a', roupa: 'haori', corRoupa: '#2f6f6a', baixo: 'hakama', corBaixo: PRETO, sapato: 'sapatilha', rosto: 'serio', detalhes: ['espada'] }
	},

	// ================================================ femininas bichos de roupa
	{
		id: 'panda', nome: 'Panda', sexo: 'feminino', grupo: 'bicho', andar: 'tranquilo', inspiracao: 'ref. 29 (sem a marca do tênis)',
		personalidade: 'Fofa e tranquila por fora, focada por dentro: termina tudo antes do lanche.',
		pecas: { bicho: 'panda', cabelo: 'careca', roupa: 'moletom', corRoupa: '#9a9da3', baixo: 'cargo', corBaixo: '#24262c', sapato: 'tenis', rosto: 'sorrisoFechado' }
	},
	{
		id: 'dalmata', nome: 'Dálmata', sexo: 'feminino', grupo: 'bicho', andar: 'elegante', inspiracao: 'ref. 35',
		personalidade: 'Dita a moda da semana: aparece de lenço e óculos e todo mundo copia.',
		pecas: { bicho: 'dalmata', cabelo: 'careca', chapeu: 'lencoCabeca', corExtra: '#e8862a', oculos: 'lenteColorida', roupa: 'vestido', corRoupa: PRETO, sapato: 'salto', rosto: 'confiante' }
	},
	{
		id: 'coelha', nome: 'Coelha', sexo: 'feminino', grupo: 'bicho', andar: 'saltitante', inspiracao: 'arquétipo: bicho de roupa (versão dela)',
		personalidade: 'Ouve tudo (as orelhas ajudam) e responde antes de você terminar a pergunta.',
		pecas: { bicho: 'coelho', cabelo: 'careca', oculos: 'redondo', roupa: 'cardiga', corRoupa: '#f2c4cf', baixo: 'saiaEvase', corBaixo: '#6b6f78', sapato: 'sapatilha', naMao: 'livro', detalhes: ['rabo'] }
	},
	{
		id: 'gata', nome: 'Gata', sexo: 'feminino', grupo: 'bicho', andar: 'furtivo', inspiracao: 'arquétipo: bicho de roupa (versão dela)',
		personalidade: 'Independente e curiosa: some para pensar e volta com a ideia pronta.',
		pecas: { bicho: 'gato', cabelo: 'careca', oculos: 'gatinho', roupa: 'blusaAmpla', corRoupa: '#9b7fc8', baixo: 'calcaLarga', corBaixo: PRETO, sapato: 'salto', rosto: 'piscada', detalhes: ['rabo'] }
	}
];

/** Todos os personagens, na ordem da tela de escolha (em cada sexo, reais primeiro; depois fantasia, heróis e bichos). */
export const PERSONAGENS: readonly Personagem[] = FICHAS.map(montar);

export const PERSONAGEM_POR_ID: ReadonlyMap<string, Personagem> = new Map(PERSONAGENS.map((p) => [p.id, p]));

/** Os personagens de um sexo, na ordem do catálogo. */
export function personagensDoSexo(sexo: Sexo): Personagem[] {
	return PERSONAGENS.filter((p) => p.sexo === sexo);
}

/** O personagem de um id (ou null se não existe). */
export function personagemDe(id: unknown): Personagem | null {
	return (typeof id === 'string' && PERSONAGEM_POR_ID.get(id)) || null;
}

/**
 * Para um agente novo não repetir ninguém: o primeiro personagem do sexo (e,
 * se dado, do grupo) que ainda não está em uso. Esgotou: o menos usado.
 */
export function sugerirPersonagem(sexo: Sexo, emUso: Iterable<string>, grupo?: GrupoPersonagem): Personagem {
	const contagem = new Map<string, number>();
	for (const id of emUso) contagem.set(id, (contagem.get(id) ?? 0) + 1);
	const candidatos = personagensDoSexo(sexo).filter((p) => !grupo || p.grupo === grupo);
	const lista = candidatos.length ? candidatos : personagensDoSexo(sexo);
	let melhor = lista[0];
	for (const p of lista) if ((contagem.get(p.id) ?? 0) < (contagem.get(melhor.id) ?? 0)) melhor = p;
	return melhor;
}
