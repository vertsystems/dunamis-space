// O motor do DGathe: câmera, entrada (mouse, toque, teclado), movimento do
// avatar, minimapa e o laço que desenha cada quadro.
//
// Controles (pedido do Bruno): botão DIREITO anda até o ponto; botão ESQUERDO
// interage (seleciona sala, objeto ou o próprio avatar). Arrastar com o
// esquerdo move a câmera; a roda dá zoom. No toque, um toque no chão anda e um
// toque em algo seleciona.

import { paraTela, paraMundo, cruzam, dentroDoPoligono, contornoCaixa, LADRILHO_L, type Ponto, type Retangulo } from './iso';
import {
	LARGURA,
	ALTURA,
	ITENS,
	SEGMENTOS,
	TAPETES,
	SALAS,
	SALA_POR_ID,
	INICIO,
	PREDIO,
	celulaLivre,
	paredeEntre,
	zonaNoPonto,
	zonaDaCelula,
	pisoDaCelula,
	chegadaDaSala,
	type Item,
	type Segmento
} from './mapa';
import { aEstrela, suavizar, livreMaisProxima, type Grade } from './caminho';
import { ordenar, posicaoDinamica, telaDaCaixa, chave, type Desenhavel } from './profundidade';
import {
	desenharLadrilho,
	desenharTapete,
	desenharSegmento,
	desenharDecoracoes,
	desenharItem,
	caixaDoItem,
	caixaDoSegmento,
	estilo,
	poli
} from './desenho';
import { desenharAvatar, areaDoAvatar, sobraNoAlto, ABAIXA_SENTADO } from './avatar';
import { APARENCIA_PADRAO, andarDe, type Aparencia } from './aparencia';
import type { Pessoa, Situacao } from './presenca';
import { alvos, deveMover } from './movimento';
import { SENTADO_MEIA, type Assento } from './assentos';
import { COR_AGENTE, COR_DO_ESTADO, NOME_DO_ESTADO, PREFIXO_AGENTE, textoAguardando, type Agente, type EstadoAgente } from './agentes';
import { NOME_DA_ATIVIDADE, type Destino } from './rotina';

export const GRADE: Grade = { largura: LARGURA, altura: ALTURA, livre: celulaLivre, parede: paredeEntre };

/**
 * O que o agente faz agora pela rotina (rotina.ts): no posto, na pausa (com a
 * atividade) ou em reunião. O Escritorio.svelte calcula e passa em definirAgentes.
 */
export type MomentoDoAgente = Pick<Destino, 'motivo' | 'atividade'>;

export type Selecao = { tipo: 'avatar' } | { tipo: 'sala'; id: string; objeto?: string } | { tipo: 'pessoa'; id: string };

/** Quem mais está no escritório, resumido para o painel. */
export type OutroResumo = {
	id: string;
	nome: string;
	cargo: string;
	foto: string | null;
	cor: string | null;
	sala: string | null;
	andando: boolean;
	/** inativo = 15 min sem mexer (sentado em algum lugar); offline = saiu (sofá da recepção). */
	situacao: Situacao;
	/** Preenchido quando é um agente (id com PREFIXO_AGENTE). */
	agente: Agente | null;
};

export type Avisos = {
	/** O que está selecionado mudou (painel de baixo). */
	selecao(s: Selecao): void;
	/** O avatar entrou noutra sala (null = lado de fora). */
	local(salaId: string | null): void;
	/** Começou ou parou de andar; `destino` é a sala para onde vai. */
	movimento(andando: boolean, destino: string | null): void;
	/** Recado curto no topo da tela. */
	aviso(texto: string): void;
	/** Comecei a andar por este trajeto (para os outros verem); `assento` = vou sentar no fim. */
	rota?(pontos: Ponto[], assento?: string | null): void;
	/** Parei aqui (sentado em `assento`, se for o caso). */
	parou?(x: number, y: number, dirX: number, dirY: number, assento?: string | null): void;
	/** Quem mais está no escritório mudou: entrou, saiu, trocou de sala, andou ou parou. */
	outros?(lista: OutroResumo[]): void;
};

export type OpcoesJogo = {
	nome: string;
	cargo: string;
	/** Como o meu bonequinho é montado (editor do Meu Perfil). */
	aparencia?: Aparencia;
	/** Meu id: entra na conta de quem senta em qual assento (igual em todas as telas). */
	id?: string | null;
};

type Peca = Desenhavel & ({ tipo: 'item'; item: Item; contorno: Ponto[] } | { tipo: 'parede'; seg: Segmento });

type Hover = { tipo: 'avatar' } | { tipo: 'pessoa'; id: string } | { tipo: 'item'; item: Item } | { tipo: 'sala'; id: string } | null;

/** Um bonequinho que anda: o meu e o de cada pessoa online. */
type Corpo = {
	x: number;
	y: number;
	dirX: number;
	dirY: number;
	andando: boolean;
	fase: number;
	caminho: Ponto[];
	/** Onde está sentado (o corpo fica na beira do assento). */
	sentado?: Assento | null;
	/** Ao chegar no fim do caminho, senta aqui. */
	vaiSentar?: Assento | null;
};
type Outro = Corpo & {
	pessoa: Pessoa;
	/** Para onde olhar ao chegar (a direção de quem andou). */
	fim: { dirX: number; dirY: number } | null;
	sala: string | null;
	mov: number;
	situacao: Situacao;
	/** O alvo que está valendo (movimento.ts). */
	chave: string;
	/** É um agente (agentes.ts): anda entre o posto, a pausa e a reunião. */
	agente?: Agente | null;
	/** O momento da rotina do agente (crachá e texto do mouse). */
	momento?: MomentoDoAgente | null;
};
type Desenho = { peca: Desenhavel; atras: boolean; desenhar: () => void };

const primeiroNome = (nome: string) => nome.split(/\s+/)[0] || nome;

/**
 * O que o crachá do agente diz: o estado da tarefa e, sem tarefa, o momento da
 * rotina (no posto, a atividade da pausa, em reunião). "Precisa de você" vale
 * mais que tudo; em reunião, o crachá diz a reunião e o ponto, o estado.
 */
export function estadoNoCracha(a: Agente, m: MomentoDoAgente | null | undefined): string {
	if (a.estado === 'esperando') return NOME_DO_ESTADO.esperando;
	if (m?.motivo === 'reuniao') return 'em reunião';
	if (a.estado !== 'livre') return NOME_DO_ESTADO[a.estado];
	if (m?.motivo === 'pausa' && m.atividade) return NOME_DA_ATIVIDADE[m.atividade];
	if (m?.motivo === 'posto') return 'no posto';
	return NOME_DO_ESTADO.livre;
}

/** O texto do mouse em cima do agente: cargo, onde está e o que faz. */
export function agenteNoMouse(a: Agente, m: MomentoDoAgente | null | undefined): string {
	const partes = [a.nome, a.cargo];
	if (m?.motivo === 'reuniao') partes.push('em reunião de alinhamento');
	if (a.estado === 'aguardando') partes.push(textoAguardando(a.tarefa?.subtarefasAbertas ?? null));
	else if (a.estado !== 'livre') partes.push(a.tarefa?.atividade ?? NOME_DO_ESTADO[a.estado]);
	else if (m?.motivo === 'pausa' && m.atividade) partes.push(NOME_DA_ATIVIDADE[m.atividade]);
	else if (m?.motivo === 'posto') partes.push('no posto, esperando a próxima tarefa');
	else if (!m) partes.push(NOME_DO_ESTADO.livre);
	return partes.join(' · ');
}

/** Jogando pingue-pongue: o agente parado na ponta da mesa, de raquete na mão. */
const jogaPingue = (o: Outro) => !o.andando && !o.sentado && o.momento?.motivo === 'pausa' && o.momento.atividade === 'pinguePongue';

/** A mesma aparência com a raquete na mão (guardada: o jogo pede a cada quadro). */
const comRaquete = new WeakMap<Aparencia, Aparencia>();
function raqueteNaMao(a: Aparencia): Aparencia {
	let r = comRaquete.get(a);
	if (!r) {
		r = { ...a, naMao: 'raquete' };
		comRaquete.set(a, r);
	}
	return r;
}

/** Tira `folga` do fim do trajeto (para parar ao lado de alguém, e não em cima). */
function encurtar(rota: Ponto[], folga: number) {
	let resta = folga;
	while (rota.length >= 2 && resta > 0) {
		const a = rota[rota.length - 2];
		const b = rota[rota.length - 1];
		const d = Math.hypot(b.x - a.x, b.y - a.y);
		if (d > resta) {
			rota[rota.length - 1] = { x: b.x - ((b.x - a.x) / d) * resta, y: b.y - ((b.y - a.y) / d) * resta };
			return;
		}
		resta -= d;
		if (rota.length === 2) {
			rota[1] = { ...a };
			return;
		}
		rota.pop();
	}
}

const VELOCIDADE = 3.4; // células por segundo
/** Tamanho do balão do agente na tela (o do zoom padrão, 1,25). */
const BALAO_ESCALA = 1.25;
/** Espaço que o balão ocupa acima do crachá (px de tela). */
const BALAO_ALTO = 21;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.4;
const CHAVE_POSICAO = 'dgathe:posicao:2';
/**
 * A posição guardada antes de 10/11/2026, quando o prédio cresceu 16 casas
 * para a esquerda: ela anda junto, para cada um voltar ao mesmo lugar.
 */
const CHAVE_ANTIGA = 'dgathe:posicao';
const AMPLIACAO_X = 16;

/** Folga do desenho além da caixa (copa da árvore, luz do poste…), em px. */
const FOLGA: Partial<Record<Item['tipo'], number>> = { arvore: 42, pinheiro: 32, planta: 16, poste: 24, nucleo: 24, luzAnel: 14, softbox: 12 };

function expandir(r: Retangulo, f: number): Retangulo {
	return { x0: r.x0 - f, y0: r.y0 - f, x1: r.x1 + f, y1: r.y1 + f };
}

function ler<T>(chave: string): T | null {
	try {
		const v = localStorage.getItem(chave);
		return v ? (JSON.parse(v) as T) : null;
	} catch {
		return null;
	}
}

function gravar(chave: string, valor: unknown) {
	try {
		localStorage.setItem(chave, JSON.stringify(valor));
	} catch {
		// Aba anônima ou armazenamento bloqueado: a posição só não fica guardada.
	}
}

export class Jogo {
	private readonly ctx: CanvasRenderingContext2D;
	private readonly aparencia: Aparencia;
	private dpr = 1;
	private largura = 0;
	private altura = 0;
	private zoom = 1.25;
	private cam: Ponto = { x: 0, y: 0 };
	private t = 0;
	private ultimo = 0;
	private raf = 0;

	private av: Corpo = { x: INICIO.x, y: INICIO.y, dirX: 1, dirY: 1, andando: false, fase: 0, caminho: [] };
	private outros = new Map<string, Outro>();
	/** Assentos ocupados por agentes (próxima fase): ninguém senta neles. */
	private assentosDeAgentes = new Set<string>();
	private destino: { x: number; y: number; t0: number } | null = null;
	private salaAtual: string | null = null;
	private destinoSala: string | null = null;

	private atras: Peca[] = [];
	private frente: Peca[] = [];
	private altas: Segmento[] = [];

	private selecao: Selecao = { tipo: 'avatar' };
	private hover: Hover = null;
	private mouse = { x: 0, y: 0, dentro: false };
	private arrasto: { x0: number; y0: number; camX: number; camY: number; moveu: boolean; botao: number } | null = null;
	private teclas = new Set<string>();
	private mostrarNomes = true;

	private chao: HTMLCanvasElement | null = null;
	private chaoChave = '';
	private ultimoDesenho = 0;
	private ultimaInteracao = 0;

	private miniBase: HTMLCanvasElement | null = null;
	private miniTamanho = '';
	private miniEscala = 1;
	private miniOrigem: Ponto = { x: 0, y: 0 };
	private miniArrasto = false;
	private miniUltimo = 0;
	private readonly limpezas: (() => void)[] = [];

	constructor(
		private readonly tela: HTMLCanvasElement,
		private readonly mini: HTMLCanvasElement | null,
		private readonly avisos: Avisos,
		private readonly opcoes: OpcoesJogo
	) {
		const ctx = tela.getContext('2d');
		if (!ctx) throw new Error('Canvas 2D indisponível');
		this.ctx = ctx;
		this.aparencia = opcoes.aparencia ?? APARENCIA_PADRAO;

		this.montarPecas();

		const antiga = ler<{ x: number; y: number }>(CHAVE_ANTIGA);
		const salva = ler<{ x: number; y: number }>(CHAVE_POSICAO) ?? (antiga ? { x: antiga.x + AMPLIACAO_X, y: antiga.y } : null);
		if (salva && Number.isFinite(salva.x) && Number.isFinite(salva.y) && celulaLivre(Math.floor(salva.x), Math.floor(salva.y))) {
			this.av.x = salva.x;
			this.av.y = salva.y;
		}
		this.salaAtual = zonaNoPonto(this.av.x, this.av.y);

		this.ajustarTamanho();
		this.centralizar();
		this.ligarEventos();
		this.montarMinimapa();
		this.avisos.local(this.salaAtual);
		this.avisos.selecao(this.selecao);
		this.raf = requestAnimationFrame((t) => this.quadro(t));
	}

	// -------------------------------------------------------------- montagem

	private montarPecas() {
		const atras: Peca[] = [];
		const frente: Peca[] = [];
		const fundoDoPredio = (c: { x1: number; y1: number }) => c.x1 <= PREDIO.x0 + 0.01 || c.y1 <= PREDIO.y0 + 0.01;
		for (const seg of SEGMENTOS) {
			if (seg.alta) {
				this.altas.push(seg);
				continue;
			}
			const caixa = caixaDoSegmento(seg);
			frente.push({ tipo: 'parede', seg, caixa, tela: telaDaCaixa(caixa) });
		}
		for (const item of ITENS) {
			const caixa = caixaDoItem(item);
			const peca: Peca = {
				tipo: 'item',
				item,
				caixa,
				tela: expandir(telaDaCaixa(caixa), FOLGA[item.tipo] ?? 2),
				contorno: contornoCaixa(caixa)
			};
			(fundoDoPredio(caixa) ? atras : frente).push(peca);
		}
		// Parede alta: primeiro a de trás (norte), depois a da esquerda (oeste).
		this.altas.sort((a, b) => (a.orient === b.orient ? a.x + a.y - (b.x + b.y) : a.orient === 'x' ? -1 : 1));
		this.atras = ordenar(atras);
		this.frente = ordenar(frente);
	}

	// ------------------------------------------------------------ coordenadas

	/** Posição no canvas (px CSS) → coordenada de tela do zoom 1. */
	private paraCena(sx: number, sy: number): Ponto {
		return { x: this.cam.x + (sx - this.largura / 2) / this.zoom, y: this.cam.y + (sy - this.altura / 2) / this.zoom };
	}

	private daCena(p: Ponto): Ponto {
		return { x: (p.x - this.cam.x) * this.zoom + this.largura / 2, y: (p.y - this.cam.y) * this.zoom + this.altura / 2 };
	}

	private visivel(): Retangulo {
		const a = this.paraCena(0, 0);
		const b = this.paraCena(this.largura, this.altura);
		return expandir({ x0: a.x, y0: a.y, x1: b.x, y1: b.y }, 40);
	}

	private limitarCamera() {
		const min = paraTela(0, ALTURA);
		const max = paraTela(LARGURA, 0);
		const baixo = paraTela(LARGURA, ALTURA);
		this.cam.x = Math.max(min.x, Math.min(max.x, this.cam.x));
		this.cam.y = Math.max(0, Math.min(baixo.y, this.cam.y));
	}

	// ----------------------------------------------------------------- API

	centralizar() {
		this.ultimaInteracao = performance.now();
		const p = paraTela(this.av.x, this.av.y, 0.6);
		this.cam = { x: p.x, y: p.y };
		this.limitarCamera();
	}

	zoomEm(fator: number, sx = this.largura / 2, sy = this.altura / 2) {
		this.ultimaInteracao = performance.now();
		const antes = this.paraCena(sx, sy);
		this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom * fator));
		const depois = this.paraCena(sx, sy);
		this.cam.x += antes.x - depois.x;
		this.cam.y += antes.y - depois.y;
		this.limitarCamera();
	}

	alternarNomes() {
		this.ultimaInteracao = performance.now();
		this.mostrarNomes = !this.mostrarNomes;
		return this.mostrarNomes;
	}

	selecionar(s: Selecao) {
		this.ultimaInteracao = performance.now();
		this.selecao = s;
		this.avisos.selecao(s);
	}

	/** Leva o avatar até a sala (o lugar livre mais perto do meio dela). */
	irPara(salaId: string) {
		const alvo = chegadaDaSala(salaId);
		if (!alvo) return;
		this.andarAte(alvo, salaId);
	}

	/** Onde estou agora (para avisar os outros quando entro). */
	posicao() {
		return { x: this.av.x, y: this.av.y, dirX: this.av.dirX, dirY: this.av.dirY };
	}

	/**
	 * Quem já entrou no escritório (vem do banco, presenca.ts): online, inativo
	 * (sentado onde escolheu) ou offline (sofá da recepção). Ninguém pula: quem
	 * muda de alvo faz o caminho aqui, levantando antes se estava sentado.
	 */
	definirPessoas(lista: Pessoa[]) {
		const metas = alvos(lista, { agentes: this.assentosDeAgentes });
		const vistos = new Set<string>();
		for (const p of lista) {
			vistos.add(p.id);
			const alvo = metas.get(p.id)!;
			const o = this.outros.get(p.id);
			if (!o) {
				// Primeira vez: aparece direto no lugar (ou já sentado), sem andar
				const a = alvo.assento;
				const novo: Outro = {
					pessoa: p,
					x: a ? (a.sentado ? a.sx : a.x) : alvo.x,
					y: a ? (a.sentado ? a.sy : a.y) : alvo.y,
					dirX: a ? a.dirX : p.dirX,
					dirY: a ? a.dirY : p.dirY,
					andando: false,
					fase: 0,
					caminho: [],
					sentado: a?.sentado ? a : null,
					vaiSentar: null,
					sala: null,
					mov: alvo.mov,
					situacao: p.situacao,
					chave: alvo.chave,
					fim: null
				};
				novo.sala = zonaNoPonto(novo.x, novo.y);
				this.outros.set(p.id, novo);
				continue;
			}
			o.pessoa = p;
			o.situacao = p.situacao;
			if (!deveMover(o, alvo)) continue;
			o.chave = alvo.chave;
			o.mov = Math.max(o.mov, alvo.mov);
			if (alvo.assento) this.levarOutro(o, alvo.assento, null);
			else this.levarOutro(o, null, { x: alvo.x, y: alvo.y, dirX: p.dirX, dirY: p.dirY });
		}
		for (const [id, o] of [...this.outros]) if (!vistos.has(id) && !o.agente) this.outros.delete(id);
		if (this.selecao.tipo === 'pessoa' && !this.outros.has(this.selecao.id)) this.selecionar({ tipo: 'avatar' });
		this.ultimaInteracao = performance.now();
		this.emitirOutros();
	}

	/** As cadeiras dos agentes ficam fora do rodízio de quem está parado. */
	definirAssentosDeAgentes(ids: Iterable<string>) {
		this.assentosDeAgentes = new Set(ids);
	}

	/**
	 * Os agentes (agentes.ts) e onde cada um deve estar (o posto, a pausa ou a
	 * reunião, pela rotina). Mudou o lugar, ele anda até lá. `momento` é o que
	 * ele faz lá (o crachá e o texto do mouse dizem). `reservados` são os
	 * assentos que as pessoas não usam.
	 */
	definirAgentes(lista: { agente: Agente; lugar: Assento; momento?: MomentoDoAgente | null }[], reservados: Iterable<string>) {
		this.assentosDeAgentes = new Set(reservados);
		const vistos = new Set<string>();
		for (const { agente: a, lugar, momento = null } of lista) {
			const id = PREFIXO_AGENTE + a.id;
			vistos.add(id);
			const pessoa: Pessoa = {
				id,
				nome: a.nome,
				cargo: a.cargo,
				foto: null,
				cor: COR_AGENTE,
				x: lugar.x,
				y: lugar.y,
				dirX: lugar.dirX,
				dirY: lugar.dirY,
				mov: 0,
				aparencia: a.aparencia,
				situacao: 'online',
				assento: lugar.id,
				ceo: false,
				paradoDesde: null,
				paradoHa: 0
			};
			const chave = `a:${lugar.id}`;
			const o = this.outros.get(id);
			if (!o) {
				const novo: Outro = {
					pessoa,
					x: lugar.sentado ? lugar.sx : lugar.x,
					y: lugar.sentado ? lugar.sy : lugar.y,
					dirX: lugar.dirX,
					dirY: lugar.dirY,
					andando: false,
					fase: 0,
					caminho: [],
					sentado: lugar.sentado ? lugar : null,
					vaiSentar: null,
					sala: null,
					mov: 0,
					situacao: 'online',
					chave,
					fim: null,
					agente: a,
					momento
				};
				novo.sala = zonaNoPonto(novo.x, novo.y);
				this.outros.set(id, novo);
				continue;
			}
			o.pessoa = pessoa;
			o.agente = a;
			o.momento = momento;
			if (o.chave !== chave) {
				o.chave = chave;
				this.levarOutro(o, lugar, null);
			}
		}
		for (const [id, o] of [...this.outros]) if (o.agente && !vistos.has(id)) this.outros.delete(id);
		if (this.selecao.tipo === 'pessoa' && !this.outros.has(this.selecao.id)) this.selecionar({ tipo: 'avatar' });
		this.ultimaInteracao = performance.now();
		this.emitirOutros();
	}

	/** O caminho até um ponto, ou até um assento (o chão ao lado e, por fim, a beira dele). */
	private planejar(c: Corpo, assento: Assento | null, ponto: Ponto | null): Ponto[] | null {
		const alvo = assento ? { x: assento.x, y: assento.y } : ponto!;
		const rota = Math.hypot(alvo.x - c.x, alvo.y - c.y) < 0.05 ? [{ x: c.x, y: c.y }, alvo] : this.caminhoEntre(c, alvo);
		if (!rota) return null;
		if (assento?.sentado) rota.push({ x: assento.sx, y: assento.sy });
		return rota;
	}

	/** Faz o caminho de outra pessoa (sem caminho: aparece lá). */
	private levarOutro(o: Outro, assento: Assento | null, ponto: (Ponto & { dirX: number; dirY: number }) | null) {
		o.sentado = null;
		o.vaiSentar = assento;
		o.fim = ponto ? { dirX: ponto.dirX, dirY: ponto.dirY } : null;
		const rota = this.planejar(o, assento, ponto);
		if (rota && rota.length > 1) {
			o.caminho = rota.slice(1);
			o.andando = true;
			return;
		}
		const fim = assento ? (assento.sentado ? { x: assento.sx, y: assento.sy } : assento) : ponto!;
		o.x = fim.x;
		o.y = fim.y;
		o.caminho = [];
		o.andando = false;
		this.chegou(o);
	}

	/** Terminou o caminho: senta, se ia sentar; senão olha para onde a pessoa olhava. */
	private chegou(o: Outro) {
		const a = o.vaiSentar;
		if (a) {
			o.dirX = a.dirX;
			o.dirY = a.dirY;
			o.sentado = a.sentado ? a : null;
		} else if (o.fim) {
			o.dirX = o.fim.dirX;
			o.dirY = o.fim.dirY;
		}
		o.vaiSentar = null;
		o.fim = null;
	}

	/** O meu boneco vai sentar (15 min sem mexer, com o DGathe aberto). */
	sentarEm(a: Assento): boolean {
		const rota = this.planejar(this.av, a, null);
		if (!rota) return false;
		this.av.sentado = null;
		this.av.vaiSentar = a;
		this.av.caminho = rota.slice(1);
		// Para os outros, o destino é o chão ao lado do lugar, com o assento
		this.avisos.rota?.(a.sentado ? rota.slice(0, -1) : rota, a.id);
		this.destinoSala = a.sala;
		this.avisos.movimento(true, a.sala);
		return true;
	}

	/** Mexeu de novo: o meu boneco levanta e fica de pé ao lado do lugar. */
	levantar() {
		const a = this.av.sentado ?? this.av.vaiSentar;
		this.av.vaiSentar = null;
		if (!a) return;
		this.av.sentado = null;
		const rota = [{ x: this.av.x, y: this.av.y }, { x: a.x, y: a.y }];
		this.av.caminho = rota.slice(1);
		this.avisos.rota?.(rota, null);
		this.avisos.movimento(true, a.sala);
	}

	/** Vai até a pessoa e para ao lado dela. */
	irAte(id: string) {
		const o = this.outros.get(id);
		if (!o) return;
		this.andarAte({ x: o.x, y: o.y }, o.sala, 0.75);
	}

	private emitirOutros() {
		this.avisos.outros?.(
			[...this.outros.values()].map((o) => ({
				id: o.pessoa.id,
				nome: o.pessoa.nome,
				cargo: o.pessoa.cargo,
				foto: o.pessoa.foto,
				cor: o.pessoa.cor,
				sala: o.sala,
				andando: o.caminho.length > 0,
				situacao: o.situacao,
				agente: o.agente ?? null
			}))
		);
	}

	destruir() {
		cancelAnimationFrame(this.raf);
		for (const f of this.limpezas) f();
	}

	// --------------------------------------------------------------- andar

	private andarAte(p: Ponto, salaDestino: string | null = null, folga = 0): boolean {
		// Mandou andar: se estava sentado, levanta
		this.av.sentado = null;
		this.av.vaiSentar = null;
		const rota = this.caminhoEntre(this.av, p);
		if (!rota) {
			this.avisos.aviso('Sem passagem até esse ponto');
			return false;
		}
		if (folga > 0) encurtar(rota, folga);
		this.av.caminho = rota.slice(1);
		this.avisos.rota?.(rota);
		const fim = rota[rota.length - 1];
		this.destino = { x: fim.x, y: fim.y, t0: this.t };
		this.destinoSala = salaDestino ?? zonaNoPonto(fim.x, fim.y);
		this.avisos.movimento(true, this.destinoSala);
		return true;
	}

	/** O caminho de `de` até `p` (ou até o chão livre mais perto de `p`), já suavizado. */
	private caminhoEntre(de: Ponto, p: Ponto): Ponto[] | null {
		let inicio = { x: Math.floor(de.x), y: Math.floor(de.y) };
		// Levantando de um assento (dentro do móvel): sai pelo chão livre ao lado
		if (!celulaLivre(inicio.x, inicio.y)) inicio = livreMaisProxima(GRADE, de, 2) ?? inicio;
		const cx = Math.floor(p.x);
		const cy = Math.floor(p.y);

		// Clicou num móvel ou parede: procura as células livres em volta, da
		// mais perto para a mais longe, e fica com a primeira que tem caminho.
		const candidatas: { x: number; y: number; d: number }[] = [];
		if (celulaLivre(cx, cy)) candidatas.push({ x: cx, y: cy, d: 0 });
		else {
			for (let y = cy - 3; y <= cy + 3; y++) {
				for (let x = cx - 3; x <= cx + 3; x++) {
					if (celulaLivre(x, y)) candidatas.push({ x, y, d: Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) });
				}
			}
			candidatas.sort((a, b) => a.d - b.d);
		}

		for (const alvo of candidatas.slice(0, 10)) {
			const celulas = aEstrela(GRADE, inicio, alvo);
			if (!celulas) continue;
			const pontos: Ponto[] = celulas.map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 }));
			pontos[0] = { x: de.x, y: de.y };
			if (alvo.d === 0) {
				// No chão livre, vai até o ponto exato do clique (com folga da borda).
				pontos[pontos.length - 1] = {
					x: Math.min(cx + 0.78, Math.max(cx + 0.22, p.x)),
					y: Math.min(cy + 0.78, Math.max(cy + 0.22, p.y))
				};
			}
			if (pontos.length === 1) pontos.push(pontos[0]);
			return suavizar(GRADE, pontos);
		}
		return null;
	}

	private atualizar(dt: number) {
		this.t += dt;

		// Câmera pelo teclado
		const vel = (720 * dt) / this.zoom;
		const k = this.teclas;
		if (k.has('arrowleft') || k.has('a')) this.cam.x -= vel;
		if (k.has('arrowright') || k.has('d')) this.cam.x += vel;
		if (k.has('arrowup') || k.has('w')) this.cam.y -= vel;
		if (k.has('arrowdown') || k.has('s')) this.cam.y += vel;
		if (k.size) this.limitarCamera();

		// Meu avatar
		const av = this.av;
		if (av.caminho.length && this.mover(av, dt, this.aparencia)) {
			this.avisos.movimento(false, null);
			const a = av.vaiSentar;
			av.vaiSentar = null;
			if (a) {
				// Sentou: para os outros (e para a próxima visita) vale o chão ao lado
				av.sentado = a.sentado ? a : null;
				av.dirX = a.dirX;
				av.dirY = a.dirY;
				this.avisos.parou?.(a.x, a.y, a.dirX, a.dirY, a.id);
				gravar(CHAVE_POSICAO, { x: a.x, y: a.y });
			} else {
				this.avisos.parou?.(av.x, av.y, av.dirX, av.dirY);
				gravar(CHAVE_POSICAO, { x: av.x, y: av.y });
			}
		}

		// Os outros
		let mudou = false;
		for (const o of this.outros.values()) {
			if (o.caminho.length && this.mover(o, dt, o.pessoa.aparencia)) {
				this.chegou(o);
				mudou = true;
			}
			const s = zonaNoPonto(o.x, o.y);
			if (s !== o.sala) {
				o.sala = s;
				mudou = true;
			}
		}
		if (mudou) this.emitirOutros();

		const sala = zonaNoPonto(av.x, av.y);
		if (sala !== this.salaAtual) {
			this.salaAtual = sala;
			this.avisos.local(sala);
		}
	}

	/**
	 * Anda um pedaço do caminho; devolve true quando chega ao fim. Cada um anda
	 * do seu jeito (o andar do personagem, ANDARES em aparencia.ts): o
	 * apressado vai mais rápido e com passada mais curta e ligeira, o pesado
	 * devagar. Todas as telas fazem a mesma conta, então ninguém se adianta.
	 */
	private mover(c: Corpo, dt: number, aparencia: Aparencia): boolean {
		const jeito = andarDe(aparencia.andar);
		let resta = VELOCIDADE * jeito.velocidade * dt;
		while (resta > 0 && c.caminho.length) {
			const alvo = c.caminho[0];
			const dx = alvo.x - c.x;
			const dy = alvo.y - c.y;
			const dist = Math.hypot(dx, dy);
			if (dist > 1e-4) {
				c.dirX = dx / dist;
				c.dirY = dy / dist;
			}
			if (dist <= resta) {
				c.x = alvo.x;
				c.y = alvo.y;
				c.caminho.shift();
				resta -= dist;
			} else {
				c.x += (dx / dist) * resta;
				c.y += (dy / dist) * resta;
				resta = 0;
			}
		}
		c.fase += dt * 10.5 * jeito.cadencia;
		c.andando = c.caminho.length > 0;
		return !c.andando;
	}

	// ---------------------------------------------------------------- quadro

	private quadro(agora: number) {
		const dt = this.ultimo ? Math.min(0.05, (agora - this.ultimo) / 1000) : 0;
		this.ultimo = agora;
		this.atualizar(dt);
		// Parado e sem ninguém mexendo no mouse, 15 quadros por segundo bastam para
		// os LEDs e o núcleo de IA: poupa bateria com a aba aberta o dia inteiro.
		const mexendo =
			this.av.caminho.length > 0 ||
			[...this.outros.values()].some((o) => o.caminho.length > 0) ||
			this.teclas.size > 0 || !!this.arrasto || this.miniArrasto || !!this.destino || agora - this.ultimaInteracao < 500;
		if (mexendo || agora - this.ultimoDesenho >= 66) {
			this.desenhar();
			this.ultimoDesenho = agora;
		}
		if (this.mini && agora - this.miniUltimo > 80) {
			this.miniUltimo = agora;
			this.desenharMinimapa();
		}
		this.raf = requestAnimationFrame((t) => this.quadro(t));
	}

	/**
	 * O chão (ladrilhos e tapetes) só muda quando a câmera muda. Fica guardado
	 * num canvas do tamanho da tela e é reaproveitado, inclusive enquanto o
	 * avatar anda, que é quando mais se desenha.
	 */
	private prepararChao(s: number, ox: number, oy: number) {
		const w = this.tela.width;
		const h = this.tela.height;
		const chave = `${ox.toFixed(2)}|${oy.toFixed(2)}|${s}|${w}|${h}`;
		if (this.chao && chave === this.chaoChave) return this.chao;
		const chao = this.chao ?? document.createElement('canvas');
		if (chao.width !== w || chao.height !== h) {
			chao.width = w;
			chao.height = h;
		}
		const c = chao.getContext('2d')!;
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.fillStyle = '#18261d';
		c.fillRect(0, 0, w, h);
		c.setTransform(s, 0, 0, s, ox, oy);

		const vis = this.visivel();
		const cantos = [paraMundo(vis.x0, vis.y0), paraMundo(vis.x1, vis.y0), paraMundo(vis.x0, vis.y1), paraMundo(vis.x1, vis.y1)];
		const xs = cantos.map((p) => p.x);
		const ys = cantos.map((p) => p.y);
		const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 1);
		const x1 = Math.min(LARGURA - 1, Math.ceil(Math.max(...xs)) + 1);
		const y0 = Math.max(0, Math.floor(Math.min(...ys)) - 1);
		const y1 = Math.min(ALTURA - 1, Math.ceil(Math.max(...ys)) + 1);
		const meioL = LADRILHO_L / 2;
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				const p = paraTela(x + 0.5, y + 0.5);
				if (p.x < vis.x0 - meioL || p.x > vis.x1 + meioL || p.y < vis.y0 - 20 || p.y > vis.y1 + 20) continue;
				desenharLadrilho(c, x, y);
			}
		}
		for (const tp of TAPETES) desenharTapete(c, tp);
		this.chao = chao;
		this.chaoChave = chave;
		return chao;
	}

	private desenhar() {
		const { ctx, dpr, zoom } = this;
		const s = dpr * zoom;
		const ox = dpr * (this.largura / 2) - this.cam.x * s;
		const oy = dpr * (this.altura / 2) - this.cam.y * s;
		estilo.lw = 1 / zoom;

		const chao = this.prepararChao(s, ox, oy);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.drawImage(chao, 0, 0);
		ctx.setTransform(s, 0, 0, s, ox, oy);

		const vis = this.visivel();

		this.desenharDestaquesDeSala();
		this.desenharMarcadorDeDestino();
		this.desenharAneis();

		// Peças: atrás do prédio → paredes altas do fundo → resto. Cada bonequinho
		// entra na lista do lado do prédio em que está.
		const corpos = this.corposParaDesenhar();
		this.desenharLista(this.atras, vis, corpos.filter((c) => c.atras));
		for (const seg of this.altas) desenharSegmento(ctx, seg);
		desenharDecoracoes(ctx, this.t);
		this.desenharLista(this.frente, vis, corpos.filter((c) => !c.atras));

		if (this.hover?.tipo === 'item') {
			const h = this.hover.item;
			poli(ctx, contornoCaixa(caixaDoItem(h)), 'rgba(245, 165, 36, 0.08)', 'rgba(245, 165, 36, 0.95)', 2 / zoom);
		}

		this.desenharRotulos();
	}

	private corposParaDesenhar(): Desenho[] {
		const lista: Desenho[] = [];
		const add = (c: Corpo, aparencia: Aparencia, o?: Outro) => {
			// Sentado, a ordem de desenho usa o ponto do assento (assentos.ts), que
			// decide se o encosto fica atrás ou na frente do boneco
			const s = c.sentado;
			const m = s ? SENTADO_MEIA : 0.22;
			const cx = s ? s.ox : c.x;
			const cy = s ? s.oy : c.y;
			const caixa = { x0: cx - m, y0: cy - m, z0: 0, x1: cx + m, y1: cy + m, z1: 1.4 };
			lista.push({
				peca: { caixa, tela: expandir(telaDaCaixa(caixa), 16) },
				atras: c.x < PREDIO.x0 || c.y < PREDIO.y0,
				desenhar: () => {
					desenharAvatar(
						this.ctx,
						{ x: c.x, y: c.y, dirX: c.dirX, dirY: c.dirY, andando: c.andando, fase: c.fase, t: this.t, sentado: !!s },
						aparencia
					);
					if (o && o.situacao !== 'online' && !c.andando) this.desenharSono(c, !!s, sobraNoAlto(aparencia, !!s));
					// O balão do agente sai com o crachá (desenharRotulos), em cima dele
				}
			});
		};
		for (const o of this.outros.values()) add(o, o.agente && jogaPingue(o) ? raqueteNaMao(o.pessoa.aparencia) : o.pessoa.aparencia, o);
		add(this.av, this.aparencia);
		return lista;
	}

	/**
	 * "z z z" subindo da cabeça de quem está ausente ou offline. `sobra`: o
	 * quanto o chapéu alto, o gigante ou quem flutua passam da altura de sempre.
	 */
	private desenharSono(onde: Ponto, sentado: boolean, sobra: number) {
		const ctx = this.ctx;
		const b = paraTela(onde.x, onde.y, 0);
		const topo = b.y - 54 - sobra + (sentado ? ABAIXA_SENTADO : 0);
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		for (let i = 0; i < 3; i++) {
			const k = (this.t * 0.45 + i / 3) % 1;
			ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9;
			ctx.font = `800 ${5 + k * 4}px Inter, system-ui, sans-serif`;
			ctx.fillStyle = '#6b7a99';
			ctx.fillText('z', b.x + 7 + k * 7, topo - k * 12);
		}
		ctx.restore();
	}

	/**
	 * O balão do agente, logo acima do crachá (na tela, do tamanho do zoom
	 * padrão): três pontinhos digitando quando trabalha; a mão levantada (um "!"
	 * laranja que pula) quando espera uma resposta; a ampulheta quando o líder
	 * espera a equipe terminar. Fica em cima do crachá, e não da cabeça, porque o
	 * crachá (desenhado por último) cobria o balão no zoom de sempre.
	 */
	private desenharBalaoDoAgente(estado: EstadoAgente, x: number, y: number) {
		const ctx = this.ctx;
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(BALAO_ESCALA, BALAO_ESCALA);
		if (estado === 'esperando') {
			const pulo = Math.abs(Math.sin(this.t * 4)) * 3;
			const cy = -pulo;
			ctx.beginPath();
			ctx.arc(0, cy, 6.4 + Math.sin(this.t * 6) * 0.6 + 2.2, 0, Math.PI * 2);
			ctx.fillStyle = 'rgba(245, 165, 36, 0.28)';
			ctx.fill();
			ctx.beginPath();
			ctx.arc(0, cy, 6.4, 0, Math.PI * 2);
			ctx.fillStyle = '#f5a524';
			ctx.fill();
			ctx.lineWidth = 1.1;
			ctx.strokeStyle = '#232a3a';
			ctx.stroke();
			ctx.fillStyle = '#1c2534';
			ctx.font = '900 9px Inter, system-ui, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('!', 0, cy + 0.5);
		} else if (estado === 'aguardando') {
			this.desenharAmpulheta(0, 0);
		} else {
			ctx.beginPath();
			ctx.roundRect(-9, -5.5, 18, 11, 5.5);
			ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
			ctx.fill();
			ctx.lineWidth = 0.9;
			ctx.strokeStyle = '#232a3a';
			ctx.stroke();
			for (let i = 0; i < 3; i++) {
				const fase = (this.t * 2.2 - i * 0.22) % 1;
				const sobe = fase < 0.5 ? Math.sin(fase * 2 * Math.PI) * 1.6 : 0;
				ctx.beginPath();
				ctx.arc(-4.6 + i * 4.6, -sobe, 1.35, 0, Math.PI * 2);
				ctx.fillStyle = COR_AGENTE;
				ctx.fill();
			}
		}
		ctx.restore();
	}

	/**
	 * O balão do líder esperando a equipe: uma ampulheta no balão branco, com a
	 * areia descendo; a cada 2,4 s ela vira (o mesmo traço dos outros balões).
	 */
	private desenharAmpulheta(cx: number, cy: number) {
		const ctx = this.ctx;
		ctx.beginPath();
		ctx.arc(cx, cy, 6.6, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
		ctx.fill();
		ctx.lineWidth = 0.9;
		ctx.strokeStyle = '#232a3a';
		ctx.stroke();
		const k = (this.t % 2.4) / 2.4;
		// No fim do ciclo, gira meia volta (a areia toda embaixo vira a de cima)
		const vira = k > 0.84 ? (k - 0.84) / 0.16 : 0;
		const desceu = Math.min(1, k / 0.84);
		const w = 2.7;
		const h = 3.7;
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(vira * vira * (3 - 2 * vira) * Math.PI);
		const vidro = () => {
			ctx.beginPath();
			ctx.moveTo(-w, -h);
			ctx.lineTo(w, -h);
			ctx.lineTo(0.45, 0);
			ctx.lineTo(w, h);
			ctx.lineTo(-w, h);
			ctx.lineTo(-0.45, 0);
			ctx.closePath();
		};
		vidro();
		ctx.fillStyle = '#e4f5fd';
		ctx.fill();
		const areia = COR_DO_ESTADO.aguardando;
		ctx.fillStyle = areia;
		// Em cima: um triângulo que encolhe (a área cai com o quadrado do lado)
		const f = Math.sqrt(1 - desceu);
		if (f > 0.05) {
			ctx.beginPath();
			ctx.moveTo(0, -0.2);
			ctx.lineTo(-w * f * 0.92, -h * f * 0.92);
			ctx.lineTo(w * f * 0.92, -h * f * 0.92);
			ctx.closePath();
			ctx.fill();
		}
		// Embaixo: o montinho cresce; no meio, o fio de areia caindo
		if (desceu > 0.05) {
			ctx.beginPath();
			ctx.moveTo(-w * 0.92, h);
			ctx.lineTo(w * 0.92, h);
			ctx.lineTo(0, h - h * 0.85 * Math.sqrt(desceu));
			ctx.closePath();
			ctx.fill();
		}
		if (!vira && desceu < 1) {
			ctx.fillRect(-0.3, 0, 0.6, h * 0.9);
		}
		vidro();
		ctx.lineWidth = 0.6;
		ctx.strokeStyle = '#232a3a';
		ctx.stroke();
		ctx.lineCap = 'round';
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.moveTo(-w - 0.7, -h);
		ctx.lineTo(w + 0.7, -h);
		ctx.moveTo(-w - 0.7, h);
		ctx.lineTo(w + 0.7, h);
		ctx.stroke();
		ctx.restore();
	}

	/** Desenha as peças em ordem e encaixa cada bonequinho no lugar certo da fila. */
	private desenharLista(lista: Peca[], vis: Retangulo, corpos: Desenho[]) {
		const ctx = this.ctx;
		const encaixes = corpos
			.map((c) => ({ c, i: posicaoDinamica(lista, c.peca) }))
			.sort((a, b) => a.i - b.i || chave(a.c.peca.caixa) - chave(b.c.peca.caixa));
		let k = 0;
		for (let i = 0; i < lista.length; i++) {
			while (k < encaixes.length && encaixes[k].i === i) encaixes[k++].c.desenhar();
			const p = lista[i];
			if (!cruzam(p.tela, vis)) continue;
			if (p.tipo === 'parede') desenharSegmento(ctx, p.seg);
			else desenharItem(ctx, p.item, this.t);
		}
		while (k < encaixes.length) encaixes[k++].c.desenhar();
	}

	private poligonoDaSala(id: string): Ponto[] | null {
		const s = SALA_POR_ID.get(id);
		if (!s) return null;
		return [paraTela(s.x0, s.y0), paraTela(s.x1 + 1, s.y0), paraTela(s.x1 + 1, s.y1 + 1), paraTela(s.x0, s.y1 + 1)];
	}

	private desenharDestaquesDeSala() {
		const ctx = this.ctx;
		const selecionada = this.selecao.tipo === 'sala' ? this.selecao.id : null;
		const sobre = this.hover?.tipo === 'sala' ? this.hover.id : this.hover?.tipo === 'item' ? this.hover.item.sala : null;
		if (sobre && sobre !== selecionada) {
			const pol = this.poligonoDaSala(sobre);
			const cor = SALA_POR_ID.get(sobre)!.cor;
			if (pol) poli(ctx, pol, cor + '14', cor + '99', 1.5 / this.zoom);
		}
		if (selecionada) {
			const pol = this.poligonoDaSala(selecionada);
			const cor = SALA_POR_ID.get(selecionada)!.cor;
			const pulso = Math.round(150 + 80 * Math.sin(this.t * 3)).toString(16).padStart(2, '0');
			if (pol) poli(ctx, pol, cor + '22', cor + pulso, 2.5 / this.zoom);
		}
	}

	private desenharMarcadorDeDestino() {
		if (!this.destino) return;
		const idade = this.t - this.destino.t0;
		if (idade > 1.6 && !this.av.caminho.length) {
			this.destino = null;
			return;
		}
		const ctx = this.ctx;
		const c = paraTela(this.destino.x, this.destino.y, 0);
		for (let i = 0; i < 2; i++) {
			const k = ((idade * 1.4 + i * 0.5) % 1 + 1) % 1;
			ctx.beginPath();
			ctx.ellipse(c.x, c.y, 6 + k * 16, 3 + k * 8, 0, 0, Math.PI * 2);
			ctx.strokeStyle = `rgba(245, 165, 36, ${(1 - k) * 0.95})`;
			ctx.lineWidth = 2 / this.zoom;
			ctx.stroke();
		}
		ctx.beginPath();
		ctx.ellipse(c.x, c.y, 3.5, 1.8, 0, 0, Math.PI * 2);
		ctx.fillStyle = '#f5a524';
		ctx.fill();
	}

	private desenharAneis() {
		const ctx = this.ctx;
		const anel = (x: number, y: number, cor: string, largura: number) => {
			const c = paraTela(x, y, 0);
			ctx.beginPath();
			ctx.ellipse(c.x, c.y, 15, 7.5, 0, 0, Math.PI * 2);
			ctx.strokeStyle = cor;
			ctx.lineWidth = largura / this.zoom;
			ctx.stroke();
		};
		const ouro = 'rgba(245, 165, 36, 0.95)';
		for (const o of this.outros.values()) {
			const sel = this.selecao.tipo === 'pessoa' && this.selecao.id === o.pessoa.id;
			// Quem está sentado na recepção só ganha anel quando selecionado
			if (o.sentado && !sel) continue;
			anel(o.x, o.y, sel ? ouro : 'rgba(255, 255, 255, 0.45)', sel ? 2.2 : 1.2);
		}
		const eu = this.selecao.tipo === 'avatar';
		anel(this.av.x, this.av.y, eu ? ouro : 'rgba(255, 255, 255, 0.7)', eu ? 2.2 : 1.4);
	}

	/** Nomes das salas, crachá do avatar e a dica do que está sob o mouse (em px de tela). */
	private desenharRotulos() {
		const ctx = this.ctx;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		const pilula = (texto: string, x: number, y: number, o: { cor?: string; fundo?: string; ponto?: string; tamanho?: number } = {}) => {
			const tam = o.tamanho ?? 11;
			ctx.font = `600 ${tam}px Inter, system-ui, sans-serif`;
			const w = ctx.measureText(texto).width + (o.ponto ? 22 : 14);
			const h = tam + 9;
			ctx.beginPath();
			ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
			ctx.fillStyle = o.fundo ?? 'rgba(11, 18, 32, 0.74)';
			ctx.fill();
			if (o.ponto) {
				ctx.beginPath();
				ctx.arc(x - w / 2 + 10, y, 3.5, 0, Math.PI * 2);
				ctx.fillStyle = o.ponto;
				ctx.fill();
			}
			ctx.fillStyle = o.cor ?? '#f3f6fb';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(texto, x + (o.ponto ? 5 : 0), y + 0.5);
		};

		if (this.mostrarNomes && this.zoom >= 0.45) {
			for (const s of SALAS) {
				if (s.id === 'corredor') continue;
				const c = this.daCena(paraTela((s.x0 + s.x1 + 1) / 2, (s.y0 + s.y1 + 1) / 2, 0));
				if (c.x < -80 || c.y < -20 || c.x > this.largura + 80 || c.y > this.altura + 20) continue;
				pilula(s.nome, c.x, c.y, { ponto: s.cor });
			}
		}

		// Crachás: o meu fica no lugar; o de quem está colado sobe um degrau para
		// não cobrir o outro. Desenha os dos outros primeiro e o meu por cima.
		type Cracha = { texto: string; x: number; y: number; o: Parameters<typeof pilula>[3]; balao?: EstadoAgente | null };
		const crachas: Cracha[] = [];
		const pe = (x: number, y: number) => this.daCena(paraTela(x, y, 0));
		const meu = pe(this.av.x, this.av.y);
		crachas.push({
			texto: `${this.opcoes.nome} · ${this.opcoes.cargo}`,
			x: meu.x,
			y: meu.y - (62 + sobraNoAlto(this.aparencia, !!this.av.sentado) - (this.av.sentado ? ABAIXA_SENTADO : 0)) * this.zoom - 6,
			o: { fundo: 'rgba(11, 18, 32, 0.86)', cor: '#ffd58a' }
		});
		for (const o of this.outros.values()) {
			const c = pe(o.x, o.y);
			// Chapéu alto, gigante e quem flutua: o crachá sobe junto
			const y = c.y - (62 + sobraNoAlto(o.pessoa.aparencia, !!o.sentado) - (o.sentado ? ABAIXA_SENTADO : 0)) * this.zoom - 6;
			if (o.agente) {
				const a = o.agente;
				const espera = a.estado === 'esperando';
				const pisca = espera && Math.sin(this.t * 5) > 0;
				const comBalao = !o.andando && (a.estado === 'trabalhando' || a.estado === 'esperando' || a.estado === 'aguardando');
				crachas.push({
					texto: `${a.nome} · ${estadoNoCracha(a, o.momento)}`,
					x: c.x,
					y,
					balao: comBalao ? a.estado : null,
					o: espera
						? { fundo: pisca ? 'rgba(245, 165, 36, 0.98)' : 'rgba(224, 140, 20, 0.94)', cor: '#1c2534', ponto: '#1c2534' }
						: {
								fundo: 'rgba(52, 33, 102, 0.88)',
								cor: '#efe9ff',
								// O ponto do estado (o mesmo das listas); sem tarefa, cinza
								ponto: a.estado === 'livre' ? '#9aa6ba' : COR_DO_ESTADO[a.estado]
							}
				});
				continue;
			}
			const ausente = o.situacao !== 'online';
			crachas.push({
				texto: `${primeiroNome(o.pessoa.nome)} · ${o.situacao === 'inativo' ? 'ausente' : o.situacao === 'offline' ? 'offline' : o.pessoa.cargo}`,
				x: c.x,
				y,
				o: ausente
					? { fundo: 'rgba(60, 68, 86, 0.72)', cor: '#d5dbe6', ponto: '#9aa6ba' }
					: { fundo: 'rgba(11, 18, 32, 0.8)', cor: '#ffffff', ponto: o.pessoa.cor ?? '#9aa6ba' }
			});
		}
		ctx.font = '600 11px Inter, system-ui, sans-serif';
		const ocupados: { x0: number; y0: number; x1: number; y1: number }[] = [];
		for (const c of crachas) {
			const w = ctx.measureText(c.texto).width + (c.o?.ponto ? 22 : 14);
			const h = 20;
			for (let tentativa = 0; tentativa < 6; tentativa++) {
				// O balão do agente fica em cima do crachá: entra na conta do espaço
				const r = { x0: c.x - w / 2, y0: c.y - h / 2 - (c.balao ? BALAO_ALTO : 0), x1: c.x + w / 2, y1: c.y + h / 2 };
				if (!ocupados.some((q) => r.x0 < q.x1 && q.x0 < r.x1 && r.y0 < q.y1 && q.y0 < r.y1)) {
					ocupados.push(r);
					break;
				}
				c.y -= h + 3;
			}
		}
		for (let i = crachas.length - 1; i >= 0; i--) pilula(crachas[i].texto, crachas[i].x, crachas[i].y, crachas[i].o);
		for (const c of crachas) if (c.balao) this.desenharBalaoDoAgente(c.balao, c.x + 10, c.y - 10 - BALAO_ALTO / 2);

		if (this.mouse.dentro && this.hover && !this.arrasto?.moveu) {
			let texto = '';
			if (this.hover.tipo === 'avatar') texto = `${this.opcoes.nome} (você)`;
			else if (this.hover.tipo === 'pessoa') {
				const o = this.outros.get(this.hover.id);
				const a = o?.agente;
				texto = a
					? agenteNoMouse(a, o?.momento)
					: o
						? `${o.pessoa.nome} · ${o.situacao === 'inativo' ? 'ausente (15 min sem mexer)' : o.situacao === 'offline' ? 'offline, na recepção' : o.pessoa.cargo}`
						: '';
			}
			else if (this.hover.tipo === 'sala') texto = SALA_POR_ID.get(this.hover.id)?.nome ?? '';
			else {
				const sala = this.hover.item.sala ? SALA_POR_ID.get(this.hover.item.sala)?.nome : null;
				texto = sala && this.hover.item.sala !== 'corredor' ? `${this.hover.item.nome} · ${sala}` : this.hover.item.nome;
			}
			if (texto) {
				ctx.font = '600 12px Inter, system-ui, sans-serif';
				const w = ctx.measureText(texto).width + 16;
				const x = Math.min(this.mouse.x + 14 + w / 2, this.largura - w / 2 - 6);
				pilula(texto, x, this.mouse.y + 22, { fundo: 'rgba(245, 165, 36, 0.95)', cor: '#1c2534', tamanho: 12 });
			}
		}
	}

	// ---------------------------------------------------------- pontaria

	private oQueEstaEm(sx: number, sy: number): Hover {
		const p = this.paraCena(sx, sy);
		const a = areaDoAvatar(this.av.x, this.av.y, !!this.av.sentado, sobraNoAlto(this.aparencia, !!this.av.sentado));
		if (p.x >= a.x0 && p.x <= a.x1 && p.y >= a.y0 && p.y <= a.y1) return { tipo: 'avatar' };
		for (const o of this.outros.values()) {
			const b = areaDoAvatar(o.x, o.y, !!o.sentado, sobraNoAlto(o.pessoa.aparencia, !!o.sentado));
			if (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1) return { tipo: 'pessoa', id: o.pessoa.id };
		}
		for (const lista of [this.frente, this.atras]) {
			for (let i = lista.length - 1; i >= 0; i--) {
				const peca = lista[i];
				if (peca.tipo !== 'item') continue;
				if (p.x < peca.tela.x0 || p.x > peca.tela.x1 || p.y < peca.tela.y0 || p.y > peca.tela.y1) continue;
				if (dentroDoPoligono(p, peca.contorno)) return { tipo: 'item', item: peca.item };
			}
		}
		const m = paraMundo(p.x, p.y);
		const sala = zonaDaCelula(Math.floor(m.x), Math.floor(m.y));
		return sala ? { tipo: 'sala', id: sala } : null;
	}

	private interagir(sx: number, sy: number) {
		const alvo = this.oQueEstaEm(sx, sy);
		if (!alvo) {
			this.selecionar({ tipo: 'avatar' });
			return;
		}
		if (alvo.tipo === 'avatar') this.selecionar({ tipo: 'avatar' });
		else if (alvo.tipo === 'pessoa') this.selecionar({ tipo: 'pessoa', id: alvo.id });
		else if (alvo.tipo === 'sala') this.selecionar({ tipo: 'sala', id: alvo.id });
		else if (alvo.item.sala) this.selecionar({ tipo: 'sala', id: alvo.item.sala, objeto: alvo.item.nome });
		else this.avisos.aviso(alvo.item.nome);
	}

	private comandarMovimento(sx: number, sy: number) {
		const alvo = this.oQueEstaEm(sx, sy);
		if (alvo?.tipo === 'pessoa') {
			this.irAte(alvo.id);
			return;
		}
		if (alvo?.tipo === 'item') {
			const it = alvo.item;
			this.andarAte({ x: it.x + it.w / 2, y: it.y + it.d / 2 });
			return;
		}
		const p = this.paraCena(sx, sy);
		const m = paraMundo(p.x, p.y);
		if (m.x < 0 || m.y < 0 || m.x >= LARGURA || m.y >= ALTURA) return;
		this.andarAte(m);
	}

	// ------------------------------------------------------------- eventos

	private ajustarTamanho() {
		const r = this.tela.getBoundingClientRect();
		this.dpr = Math.min(window.devicePixelRatio || 1, 2);
		this.largura = Math.max(1, r.width);
		this.altura = Math.max(1, r.height);
		this.tela.width = Math.round(this.largura * this.dpr);
		this.tela.height = Math.round(this.altura * this.dpr);
	}

	private ligarEventos() {
		const tela = this.tela;
		const on = <K extends keyof HTMLElementEventMap>(alvo: HTMLElement, tipo: K, f: (e: HTMLElementEventMap[K]) => void, opcoes?: AddEventListenerOptions) => {
			alvo.addEventListener(tipo, f as EventListener, opcoes);
			this.limpezas.push(() => alvo.removeEventListener(tipo, f as EventListener, opcoes));
		};
		const pos = (e: MouseEvent) => {
			const r = tela.getBoundingClientRect();
			return { x: e.clientX - r.left, y: e.clientY - r.top };
		};

		const ro = new ResizeObserver(() => this.ajustarTamanho());
		ro.observe(tela);
		this.limpezas.push(() => ro.disconnect());

		on(tela, 'contextmenu', (e) => e.preventDefault());

		const mexeu = () => (this.ultimaInteracao = performance.now());

		on(tela, 'pointerdown', (e) => {
			mexeu();
			tela.focus({ preventScroll: true });
			const p = pos(e);
			if (e.button === 2) {
				this.comandarMovimento(p.x, p.y);
				return;
			}
			if (e.button === 0 || e.button === 1) {
				this.arrasto = { x0: p.x, y0: p.y, camX: this.cam.x, camY: this.cam.y, moveu: false, botao: e.button };
				tela.setPointerCapture(e.pointerId);
			}
		});

		on(tela, 'pointermove', (e) => {
			mexeu();
			const p = pos(e);
			this.mouse = { x: p.x, y: p.y, dentro: true };
			if (this.arrasto) {
				const dx = p.x - this.arrasto.x0;
				const dy = p.y - this.arrasto.y0;
				if (!this.arrasto.moveu && Math.hypot(dx, dy) > 5) this.arrasto.moveu = true;
				if (this.arrasto.moveu) {
					this.cam.x = this.arrasto.camX - dx / this.zoom;
					this.cam.y = this.arrasto.camY - dy / this.zoom;
					this.limitarCamera();
					tela.style.cursor = 'grabbing';
				}
				return;
			}
			this.hover = this.oQueEstaEm(p.x, p.y);
			tela.style.cursor = this.hover && this.hover.tipo !== 'sala' ? 'pointer' : 'default';
		});

		on(tela, 'pointerup', (e) => {
			const a = this.arrasto;
			this.arrasto = null;
			tela.style.cursor = 'default';
			if (!a || a.moveu || a.botao !== 0) return;
			const p = pos(e);
			if (e.pointerType === 'mouse') {
				this.interagir(p.x, p.y);
				return;
			}
			// Toque: tocar em algo seleciona; tocar no chão anda.
			const alvo = this.oQueEstaEm(p.x, p.y);
			if (alvo && alvo.tipo !== 'sala') this.interagir(p.x, p.y);
			else this.comandarMovimento(p.x, p.y);
		});

		on(tela, 'pointerleave', () => {
			this.mouse.dentro = false;
			this.hover = null;
		});

		on(
			tela,
			'wheel',
			(e) => {
				e.preventDefault();
				mexeu();
				const p = pos(e);
				this.zoomEm(Math.exp(-e.deltaY * 0.0016), p.x, p.y);
			},
			{ passive: false }
		);

		on(tela, 'keydown', (e) => {
			mexeu();
			const k = e.key.toLowerCase();
			if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(k)) {
				this.teclas.add(k);
				e.preventDefault();
			} else if (k === ' ' || k === 'c') {
				this.centralizar();
				e.preventDefault();
			} else if (k === '+' || k === '=') this.zoomEm(1.15);
			else if (k === '-') this.zoomEm(1 / 1.15);
			else if (k === 'n') this.alternarNomes();
			else if (k === 'escape') this.selecionar({ tipo: 'avatar' });
		});
		on(tela, 'keyup', (e) => this.teclas.delete(e.key.toLowerCase()));
		on(tela, 'blur', () => this.teclas.clear());

		if (this.mini) {
			const mini = this.mini;
			const paraMundoDoMini = (e: PointerEvent): Ponto => {
				const r = mini.getBoundingClientRect();
				const mx = e.clientX - r.left;
				const my = e.clientY - r.top;
				return { x: (mx - this.miniOrigem.x) / this.miniEscala, y: (my - this.miniOrigem.y) / this.miniEscala };
			};
			on(mini, 'contextmenu', (e) => e.preventDefault());
			on(mini, 'pointerdown', (e) => {
				mexeu();
				const p = paraMundoDoMini(e);
				if (e.button === 2) {
					const m = paraMundo(p.x, p.y);
					if (m.x >= 0 && m.y >= 0 && m.x < LARGURA && m.y < ALTURA) this.andarAte(m);
					return;
				}
				this.miniArrasto = true;
				mini.setPointerCapture(e.pointerId);
				this.cam = p;
				this.limitarCamera();
			});
			on(mini, 'pointermove', (e) => {
				if (!this.miniArrasto) return;
				this.cam = paraMundoDoMini(e);
				this.limitarCamera();
			});
			on(mini, 'pointerup', () => (this.miniArrasto = false));
		}
	}

	// ------------------------------------------------------------- minimapa

	private montarMinimapa() {
		if (!this.mini) return;
		const r = this.mini.getBoundingClientRect();
		const w = Math.max(1, r.width);
		const h = Math.max(1, r.height);
		this.miniTamanho = `${w}x${h}x${this.dpr}`;
		const larguraMapa = (LARGURA + ALTURA) * (LADRILHO_L / 2);
		const alturaMapa = larguraMapa / 2;
		this.miniEscala = Math.min((w - 8) / larguraMapa, (h - 8) / alturaMapa);
		// paraTela(0, ALTURA).x é a ponta esquerda do losango; paraTela(0,0).y a de cima.
		this.miniOrigem = { x: w / 2 - ((LARGURA - ALTURA) * (LADRILHO_L / 4)) * this.miniEscala, y: (h - alturaMapa * this.miniEscala) / 2 };

		const base = document.createElement('canvas');
		base.width = Math.round(w * this.dpr);
		base.height = Math.round(h * this.dpr);
		const c = base.getContext('2d')!;
		c.setTransform(this.dpr * this.miniEscala, 0, 0, this.dpr * this.miniEscala, this.dpr * this.miniOrigem.x, this.dpr * this.miniOrigem.y);
		const corDoChao: Record<string, string> = { grama: '#6f9f4f', calcada: '#cfc3ad', asfalto: '#555c67' };
		for (let y = 0; y < ALTURA; y++) {
			for (let x = 0; x < LARGURA; x++) {
				const sala = zonaDaCelula(x, y);
				const cor = sala ? SALA_POR_ID.get(sala)!.cor : corDoChao[pisoDaCelula(x, y)] ?? '#6f9f4f';
				c.globalAlpha = sala && sala !== 'corredor' ? 0.85 : 1;
				c.fillStyle = sala === 'corredor' ? '#d8cfbf' : cor;
				const pts = [paraTela(x, y), paraTela(x + 1, y), paraTela(x + 1, y + 1), paraTela(x, y + 1)];
				c.beginPath();
				c.moveTo(pts[0].x, pts[0].y);
				for (const p of pts.slice(1)) c.lineTo(p.x, p.y);
				c.closePath();
				c.fill();
				c.strokeStyle = c.fillStyle;
				c.lineWidth = 1 / this.miniEscala;
				c.stroke();
			}
		}
		c.globalAlpha = 1;
		for (const it of ITENS) {
			if (it.tipo !== 'arvore' && it.tipo !== 'pinheiro') continue;
			const p = paraTela(it.x + it.w / 2, it.y + it.d / 2);
			c.beginPath();
			c.arc(p.x, p.y, 22, 0, Math.PI * 2);
			c.fillStyle = '#3f7a3a';
			c.fill();
		}
		this.miniBase = base;
	}

	private desenharMinimapa() {
		const mini = this.mini;
		if (!mini || !this.miniBase) return;
		const r = mini.getBoundingClientRect();
		if (`${Math.max(1, r.width)}x${Math.max(1, r.height)}x${this.dpr}` !== this.miniTamanho) this.montarMinimapa();
		const w = Math.round(r.width * this.dpr);
		const h = Math.round(r.height * this.dpr);
		if (mini.width !== w || mini.height !== h) {
			mini.width = w;
			mini.height = h;
		}
		const c = mini.getContext('2d')!;
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.clearRect(0, 0, w, h);
		c.drawImage(this.miniBase, 0, 0);
		c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		const m = (p: Ponto) => ({ x: p.x * this.miniEscala + this.miniOrigem.x, y: p.y * this.miniEscala + this.miniOrigem.y });

		// O que a câmera está mostrando
		const a = m(this.paraCena(0, 0));
		const b = m(this.paraCena(this.largura, this.altura));
		c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
		c.lineWidth = 1.2;
		c.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);

		if (this.destino) {
			const d = m(paraTela(this.destino.x, this.destino.y));
			c.beginPath();
			c.arc(d.x, d.y, 2.2, 0, Math.PI * 2);
			c.fillStyle = '#f5a524';
			c.fill();
		}
		for (const o of this.outros.values()) {
			const q = m(paraTela(o.x, o.y));
			c.beginPath();
			c.arc(q.x, q.y, 3, 0, Math.PI * 2);
			c.fillStyle = o.situacao !== 'online' ? '#9aa6ba' : (o.pessoa.cor ?? '#ffffff');
			c.fill();
			c.strokeStyle = '#ffffff';
			c.lineWidth = 1.2;
			c.stroke();
		}
		const v = m(paraTela(this.av.x, this.av.y));
		c.beginPath();
		c.arc(v.x, v.y, 3.6, 0, Math.PI * 2);
		c.fillStyle = '#ffd58a';
		c.fill();
		c.strokeStyle = '#1c2534';
		c.lineWidth = 1.4;
		c.stroke();
	}
}
