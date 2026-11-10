// Os agentes do DGathe no jogo: o que vem do banco (dgathe_agentes_agora,
// migration 0101), onde cada um fica no mapa e a leitura a cada 3 s.
//
// Pedido do Bruno (09/11/2026): passar tarefa pelo jogo e ver o que cada
// agente está fazendo. Quem faz o trabalho é a ponte do Mac (ponte/ponte.mjs);
// aqui é só a tela.
//
// Onde cada um fica:
//   - trabalhando, ou esperando uma resposta: sentado na cadeira dele (a
//     "Cadeira do gerente" do setor, ou a que o agente tiver no banco)
//   - livre, ou com tarefa na fila: na Copa, "onde os agentes esperam a próxima
//     tarefa". Primeiro os pufes e o sofá; lotou, em pé por lá
// A cadeira de cada agente fica reservada mesmo com ele na copa: ninguém do
// rodízio de quem está parado senta nela (Jogo.definirAssentosDeAgentes).

import type { SupabaseClient } from '@supabase/supabase-js';
import { assentos, type Assento } from './assentos';
import { lerAparencia, type Aparencia } from './aparencia';
import { SALA_POR_ID, celulaLivre, zonaDaCelula } from './mapa';

export type EstadoAgente = 'livre' | 'fila' | 'trabalhando' | 'esperando';
export type StatusTarefa = 'fila' | 'trabalhando' | 'esperando' | 'concluida' | 'falhou' | 'cancelada';
export type Nivel = 'editar' | 'ver' | 'nenhum';

export type TarefaAtual = {
	id: string | null;
	status: StatusTarefa;
	titulo: string | null;
	atividade: string | null;
	/** Há quantos segundos começou (ou entrou na fila). */
	desde: number;
};

export type Agente = {
	id: string;
	nome: string;
	cargo: string;
	sala: string;
	cadeira: string;
	aparencia: Aparencia;
	ordem: number;
	naFila: number;
	pedidos: number;
	tarefa: TarefaAtual | null;
	estado: EstadoAgente;
};

export type EstadoPonte = { ligada: boolean; vistaHa: number | null; trabalhando: number };
export type LeituraAgentes = { pode: Nivel; ponte: EstadoPonte; agentes: Agente[] };

/** Sem sinal da ponte há mais que isso (s): desligada. Ela dá sinal a cada 20 s. */
export const PONTE_VALIDADE = 75;
/** As ids dos agentes dentro do jogo, para não esbarrar nas das pessoas. */
export const PREFIXO_AGENTE = 'agente:';
export const COR_AGENTE = '#8b5cf6';

const STATUS: StatusTarefa[] = ['fila', 'trabalhando', 'esperando', 'concluida', 'falhou', 'cancelada'];

export const NOME_DO_ESTADO: Record<EstadoAgente, string> = {
	livre: 'livre',
	fila: 'na fila',
	trabalhando: 'trabalhando',
	esperando: 'precisa de você'
};

export const NOME_DO_STATUS: Record<StatusTarefa, string> = {
	fila: 'Na fila',
	trabalhando: 'Trabalhando',
	esperando: 'Precisa de você',
	concluida: 'Concluída',
	falhou: 'Parou com erro',
	cancelada: 'Parada'
};

const txt = (v: unknown, padrao = '') => (typeof v === 'string' ? v : padrao);
const num = (v: unknown, padrao = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || padrao);

function lerTarefa(bruto: unknown): TarefaAtual | null {
	if (!bruto || typeof bruto !== 'object') return null;
	const t = bruto as Record<string, unknown>;
	const status = STATUS.includes(t.status as StatusTarefa) ? (t.status as StatusTarefa) : null;
	if (!status) return null;
	return {
		id: typeof t.id === 'string' ? t.id : null,
		status,
		titulo: typeof t.titulo === 'string' ? t.titulo : null,
		atividade: typeof t.atividade === 'string' ? t.atividade : null,
		desde: num(t.desde)
	};
}

export function estadoDe(tarefa: TarefaAtual | null, pedidos: number): EstadoAgente {
	if (pedidos > 0 || tarefa?.status === 'esperando') return 'esperando';
	if (tarefa?.status === 'trabalhando') return 'trabalhando';
	if (tarefa?.status === 'fila') return 'fila';
	return 'livre';
}

/** Lê a resposta de dgathe_agentes_agora; o que não reconhece fica de fora. */
export function lerAgentes(bruto: unknown): LeituraAgentes | null {
	if (!bruto || typeof bruto !== 'object') return null;
	const b = bruto as Record<string, unknown>;
	const pode: Nivel = b.pode === 'editar' || b.pode === 'ver' ? b.pode : 'nenhum';
	const p = b.ponte && typeof b.ponte === 'object' ? (b.ponte as Record<string, unknown>) : null;
	const vistaHa = p ? num(p.visto_ha, Infinity) : null;
	const ponte: EstadoPonte = {
		ligada: vistaHa !== null && vistaHa < PONTE_VALIDADE,
		vistaHa,
		trabalhando: p ? num(p.trabalhando) : 0
	};
	const agentes: Agente[] = [];
	for (const linha of Array.isArray(b.agentes) ? b.agentes : []) {
		if (!linha || typeof linha !== 'object') continue;
		const a = linha as Record<string, unknown>;
		const id = txt(a.id);
		const sala = txt(a.sala);
		if (!id || !SALA_POR_ID.has(sala)) continue;
		const tarefa = lerTarefa(a.tarefa);
		const pedidos = num(a.pedidos);
		agentes.push({
			id,
			nome: txt(a.nome, id),
			cargo: txt(a.cargo, 'Agente'),
			sala,
			cadeira: txt(a.cadeira, 'Cadeira do gerente'),
			aparencia: lerAparencia(a.aparencia, COR_AGENTE),
			ordem: num(a.ordem),
			naFila: num(a.na_fila),
			pedidos,
			tarefa,
			estado: estadoDe(tarefa, pedidos)
		});
	}
	return { pode, ponte, agentes };
}

/** Lugares em pé na copa, para quando os pufes e o sofá lotarem. */
function emPeNaCopa(ocupadas: Set<string>): Assento[] {
	const copa = SALA_POR_ID.get('copa');
	if (!copa) return [];
	const lista: Assento[] = [];
	const usadas: { x: number; y: number }[] = [];
	for (let y = copa.y0; y <= copa.y1; y++) {
		for (let x = copa.x0; x <= copa.x1; x++) {
			if (!celulaLivre(x, y) || zonaDaCelula(x, y) !== 'copa' || ocupadas.has(`${x},${y}`)) continue;
			// Um do lado do outro, mas sem colar (uma casa de folga)
			if (usadas.some((u) => Math.abs(u.x - x) + Math.abs(u.y - y) < 2)) continue;
			usadas.push({ x, y });
			const cx = x + 0.5;
			const cy = y + 0.5;
			lista.push({ id: `copa:agente-em-pe:${x},${y}`, sala: 'copa', movel: 'em-pe', nome: 'Em pé', x: cx, y: cy, sx: cx, sy: cy, ox: cx, oy: cy, dirX: 0.7, dirY: 0.7, sentado: false });
		}
	}
	return lista;
}

/**
 * Onde cada agente fica agora e os assentos que ficam fora do rodízio das
 * pessoas. A mesma lista dá o mesmo resultado em qualquer tela.
 */
export function lugaresDosAgentes(lista: Agente[]): { lugar: Map<string, Assento>; reservados: Set<string> } {
	const todos = assentos();
	const reservados = new Set<string>();
	const mesa = new Map<string, Assento>();
	const ordenados = [...lista].sort((a, b) => a.ordem - b.ordem || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

	// A cadeira de trabalho: a do nome pedido na sala; se não houver (ou já for de
	// outro agente), a primeira livre da sala
	for (const a of ordenados) {
		const daSala = todos.filter((s) => s.sala === a.sala && s.sentado && !reservados.has(s.id));
		const c = daSala.find((s) => s.nome === a.cadeira) ?? daSala.find((s) => s.movel === 'cadeira') ?? daSala[0];
		if (!c) continue;
		mesa.set(a.id, c);
		reservados.add(c.id);
	}

	const lugar = new Map<string, Assento>();
	const naCopa = todos.filter((s) => s.sala === 'copa' && s.sentado);
	const chao = new Set(naCopa.map((s) => `${Math.floor(s.x)},${Math.floor(s.y)}`));
	let emPe: Assento[] | null = null;
	for (const a of ordenados) {
		const m = mesa.get(a.id);
		if (m && (a.estado === 'trabalhando' || a.estado === 'esperando')) {
			lugar.set(a.id, m);
			continue;
		}
		let s = naCopa.find((x) => !reservados.has(x.id));
		if (!s) {
			emPe ??= emPeNaCopa(chao);
			s = emPe.find((x) => !reservados.has(x.id));
		}
		const fim = s ?? m;
		if (!fim) continue;
		lugar.set(a.id, fim);
		reservados.add(fim.id);
	}
	return { lugar, reservados };
}

type Ouvintes = {
	leitura(l: LeituraAgentes): void;
	/** Duas leituras seguidas falharam (rede, banco). */
	falha?(e: unknown): void;
};

/** Lê os agentes a cada 3 s (10 s com a aba escondida). */
export class Agentes {
	private timer: ReturnType<typeof setTimeout> | undefined;
	private parado = false;
	private lendo = false;
	private falhas = 0;

	constructor(
		private readonly supabase: SupabaseClient,
		private readonly ouvintes: Ouvintes
	) {}

	iniciar() {
		this.parado = false;
		void this.ler();
	}

	/** Leia já (depois de passar uma tarefa, por exemplo). */
	agora() {
		clearTimeout(this.timer);
		void this.ler();
	}

	parar() {
		this.parado = true;
		clearTimeout(this.timer);
	}

	private async ler() {
		if (this.parado || this.lendo) return;
		this.lendo = true;
		try {
			const { data, error } = await this.supabase.rpc('dgathe_agentes_agora');
			if (this.parado) return;
			if (error) throw error;
			const l = lerAgentes(data);
			if (!l) throw new Error('resposta inesperada');
			this.falhas = 0;
			this.ouvintes.leitura(l);
		} catch (e) {
			this.falhas++;
			if (this.falhas === 2) {
				console.warn('[DGathe] sem leitura dos agentes:', e);
				this.ouvintes.falha?.(e);
			}
		} finally {
			this.lendo = false;
			if (!this.parado) {
				const escondida = typeof document !== 'undefined' && document.hidden;
				this.timer = setTimeout(() => void this.ler(), escondida ? 10_000 : 3000);
			}
		}
	}
}

/** "há 2 min", "há 3 h". */
export function haQuanto(segundos: number): string {
	const s = Math.max(0, Math.round(segundos));
	if (s < 45) return 'agora';
	const m = Math.round(s / 60);
	if (m < 60) return `há ${m} min`;
	const h = Math.round(m / 60);
	if (h < 24) return `há ${h} h`;
	const d = Math.round(h / 24);
	return `há ${d} dia${d > 1 ? 's' : ''}`;
}

/** "45 s", "3 min", "1 h 20 min". */
export function duracao(segundos: number): string {
	const s = Math.max(0, Math.round(segundos));
	if (s < 60) return `${s} s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m} min`;
	const h = Math.floor(m / 60);
	const r = m % 60;
	return r ? `${h} h ${r} min` : `${h} h`;
}
