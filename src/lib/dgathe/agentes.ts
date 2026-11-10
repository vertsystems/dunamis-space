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
//
// Equipes (10/11/2026, departamento de Desenvolvimento & IA, migration 0102 e
// docs/dgathe/contrato-equipes.md): o líder distribui o trabalho em subtarefas
// e, enquanto a equipe trabalha, a tarefa dele fica "aguardando". Ele espera
// sentado na mesa dele, não na copa.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { assentos, type Assento } from './assentos';
import { lerAparencia, type Aparencia } from './aparencia';
import { destinosDosAgentes, type Destino } from './rotina';
import { SALA_POR_ID, celulaLivre, zonaDaCelula } from './mapa';

export type EstadoAgente = 'livre' | 'fila' | 'trabalhando' | 'esperando' | 'aguardando';
export type StatusTarefa = 'fila' | 'trabalhando' | 'esperando' | 'aguardando' | 'concluida' | 'falhou' | 'cancelada';
export type Nivel = 'editar' | 'ver' | 'nenhum';

export type TarefaAtual = {
	id: string | null;
	status: StatusTarefa;
	titulo: string | null;
	atividade: string | null;
	/** Há quantos segundos começou (ou entrou na fila; em "aguardando", há quanto espera a equipe). */
	desde: number;
	/** A tarefa-pai, quando esta é uma subtarefa (null sem o detalhe). */
	paiId: string | null;
	/** Subtarefas ainda rodando (null sem o detalhe ou com o banco de antes da 0102). */
	subtarefasAbertas: number | null;
};

export type Agente = {
	id: string;
	nome: string;
	cargo: string;
	/** A equipe (ex.: 'dev'); null = agente avulso, como o assessor. */
	equipe: string | null;
	/** Lidera a equipe: é quem distribui o trabalho. */
	lider: boolean;
	sala: string;
	cadeira: string;
	aparencia: Aparencia;
	ordem: number;
	naFila: number;
	pedidos: number;
	tarefa: TarefaAtual | null;
	estado: EstadoAgente;
	/** Reunião em que está agora (migration 0103): vai para a sala dela e, no fim, volta ao posto. */
	reuniao?: ReuniaoDoAgente | null;
};

export type ReuniaoDoAgente = { id: string; sala: string; titulo: string; ate: number };
export type Reuniao = ReuniaoDoAgente & { participantes: string[]; criadaPor: string };

export type EstadoPonte = { ligada: boolean; vistaHa: number | null; trabalhando: number };
export type LeituraAgentes = {
	pode: Nivel;
	ponte: EstadoPonte;
	agentes: Agente[];
	/** Hora do servidor (s desde 1970) na leitura: a rotina de pausas dá igual em todas as telas. */
	agora?: number | null;
	/** Reuniões em andamento. */
	reunioes?: Reuniao[];
};

function lerReuniao(bruto: unknown): ReuniaoDoAgente | null {
	if (!bruto || typeof bruto !== 'object') return null;
	const r = bruto as Record<string, unknown>;
	const sala = typeof r.sala === 'string' ? r.sala : '';
	if (typeof r.id !== 'string' || !SALA_POR_ID.has(sala)) return null;
	return { id: r.id, sala, titulo: typeof r.titulo === 'string' ? r.titulo : 'Reunião', ate: Number(r.ate) || 0 };
}

/** Sem sinal da ponte há mais que isso (s): desligada. Ela dá sinal a cada 20 s. */
export const PONTE_VALIDADE = 75;
/** As ids dos agentes dentro do jogo, para não esbarrar nas das pessoas. */
export const PREFIXO_AGENTE = 'agente:';
export const COR_AGENTE = '#8b5cf6';

const STATUS: StatusTarefa[] = ['fila', 'trabalhando', 'esperando', 'aguardando', 'concluida', 'falhou', 'cancelada'];
/** Subtarefa "aberta": ainda vai rodar ou está rodando. */
export const STATUS_ABERTOS: StatusTarefa[] = ['fila', 'trabalhando', 'esperando'];

export const NOME_DO_ESTADO: Record<EstadoAgente, string> = {
	livre: 'disponível',
	fila: 'na fila',
	trabalhando: 'trabalhando',
	esperando: 'precisa de você',
	aguardando: 'esperando a equipe'
};

export const NOME_DO_STATUS: Record<StatusTarefa, string> = {
	fila: 'Na fila',
	trabalhando: 'Trabalhando',
	esperando: 'Precisa de você',
	aguardando: 'Esperando a equipe',
	concluida: 'Concluída',
	falhou: 'Parou com erro',
	cancelada: 'Parada'
};

/** O ponto colorido de cada estado nas listas do escritório. */
export const COR_DO_ESTADO: Record<EstadoAgente, string> = {
	livre: '#8b5cf6',
	fila: '#c4b5fd',
	trabalhando: '#34d399',
	esperando: '#f5a524',
	aguardando: '#38bdf8'
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
		desde: num(t.desde),
		paiId: typeof t.pai_id === 'string' ? t.pai_id : null,
		subtarefasAbertas: typeof t.subtarefas_abertas === 'number' || (typeof t.subtarefas_abertas === 'string' && t.subtarefas_abertas !== '') ? num(t.subtarefas_abertas) : null
	};
}

/**
 * O que um agente "começando" está fazendo (tarefa na fila com a ponte ligada:
 * a ponte espera 15 s, mas na tela ele já trabalha). Sai da atividade que a
 * ponte e o banco gravaram ao pôr a tarefa na fila.
 */
export function atividadeComecando(atividade: string | null): string {
	if (atividade === 'Na fila para continuar') return 'Lendo a sua mensagem';
	if (atividade === 'Na fila com o retorno da equipe') return 'Lendo o retorno da equipe';
	return 'Lendo o pedido';
}

/** A linha de estado do líder enquanto a equipe trabalha. */
export function textoAguardando(abertas: number | null): string {
	if (abertas === null) return 'Esperando a equipe';
	if (abertas <= 0) return 'A equipe terminou: já vai revisar';
	return `Esperando a equipe: ${abertas} subtarefa${abertas > 1 ? 's abertas' : ' aberta'}`;
}

/**
 * O estado que o jogo mostra. Tarefa na fila com a ponte ligada já conta como
 * trabalho: a ponte espera 15 s antes de agir (folga para o banco, pedido do
 * Bruno em 10/11/2026), mas na tela o agente vai para a mesa na hora. Só fica
 * "na fila" com a ponte desligada. "aguardando" é o líder esperando a equipe
 * terminar as subtarefas (não tem sessão aberta, então nem a ponte conta).
 */
export function estadoDe(tarefa: Pick<TarefaAtual, 'status'> | null, pedidos: number, ponteLigada = false): EstadoAgente {
	if (pedidos > 0 || tarefa?.status === 'esperando') return 'esperando';
	if (tarefa?.status === 'trabalhando') return 'trabalhando';
	if (tarefa?.status === 'aguardando') return 'aguardando';
	if (tarefa?.status === 'fila') return ponteLigada ? 'trabalhando' : 'fila';
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
		// Começando (fila com a ponte ligada): o balão e o painel já dizem o que ele faz
		if (tarefa?.status === 'fila' && ponte.ligada) tarefa.atividade = atividadeComecando(tarefa.atividade);
		const equipe = txt(a.equipe).trim();
		agentes.push({
			id,
			nome: txt(a.nome, id),
			cargo: txt(a.cargo, 'Agente'),
			equipe: equipe || null,
			lider: a.lider === true,
			sala,
			cadeira: txt(a.cadeira, 'Cadeira do gerente'),
			aparencia: lerAparencia(a.aparencia, COR_AGENTE),
			ordem: num(a.ordem),
			naFila: num(a.na_fila),
			pedidos,
			tarefa,
			estado: estadoDe(tarefa, pedidos, ponte.ligada),
			reuniao: lerReuniao(a.reuniao)
		});
	}
	const agora = typeof b.agora === 'number' && Number.isFinite(b.agora) ? b.agora : null;
	const reunioes: Reuniao[] = [];
	for (const x of Array.isArray(b.reunioes) ? b.reunioes : []) {
		const r = lerReuniao(x);
		const o = x as Record<string, unknown>;
		if (r) reunioes.push({ ...r, participantes: Array.isArray(o.participantes) ? o.participantes.map(String) : [], criadaPor: txt(o.criada_por) });
	}
	return { pode, ponte, agentes, agora, reunioes };
}

/** Uma subtarefa na tarefa do líder (campo `subtarefas` de dgathe_tarefa, migration 0102). */
export type Subtarefa = {
	id: string;
	agente_id: string;
	agente_nome: string;
	agente_cargo: string;
	titulo: string;
	status: StatusTarefa;
	atividade: string | null;
	/** Começo do resultado (até 300 caracteres). */
	resumo: string | null;
	erro: string | null;
	passos: number;
	/** Perguntas ou licenças esperando resposta no painel do especialista. */
	pedidos: number;
	rodada_do_pai: number | null;
	/** O resultado já foi entregue ao líder num "Retorno da equipe". */
	relatada: boolean;
	criada_ha: number;
	duracao: number;
};

/** A tarefa-pai de uma subtarefa (campo `pai` de dgathe_tarefa). */
export type PaiDaTarefa = { id: string; titulo: string; status: StatusTarefa; agente_id: string; agente_nome: string };

const statusOu = (v: unknown, padrao: StatusTarefa): StatusTarefa => (STATUS.includes(v as StatusTarefa) ? (v as StatusTarefa) : padrao);
const textoOuNulo = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);

/** Lê a lista de subtarefas; com o banco de antes da 0102 (sem o campo), fica vazia. */
export function lerSubtarefas(bruto: unknown): Subtarefa[] {
	if (!Array.isArray(bruto)) return [];
	const lista: Subtarefa[] = [];
	for (const linha of bruto) {
		if (!linha || typeof linha !== 'object') continue;
		const s = linha as Record<string, unknown>;
		const id = txt(s.id);
		const agente = txt(s.agente_id);
		if (!id || !agente) continue;
		lista.push({
			id,
			agente_id: agente,
			agente_nome: txt(s.agente_nome, agente),
			agente_cargo: txt(s.agente_cargo),
			titulo: txt(s.titulo, 'Tarefa'),
			status: statusOu(s.status, 'fila'),
			atividade: textoOuNulo(s.atividade),
			resumo: textoOuNulo(s.resumo),
			erro: textoOuNulo(s.erro),
			passos: num(s.passos),
			pedidos: num(s.pedidos),
			rodada_do_pai: s.rodada_do_pai === null || s.rodada_do_pai === undefined ? null : num(s.rodada_do_pai),
			relatada: s.relatada === true,
			criada_ha: num(s.criada_ha),
			duracao: num(s.duracao)
		});
	}
	return lista;
}

/** Lê a tarefa-pai; null quando não é subtarefa (ou o banco ainda não manda). */
export function lerPai(bruto: unknown): PaiDaTarefa | null {
	if (!bruto || typeof bruto !== 'object') return null;
	const p = bruto as Record<string, unknown>;
	const id = txt(p.id);
	const agente = txt(p.agente_id);
	if (!id || !agente) return null;
	return { id, titulo: txt(p.titulo, 'Tarefa'), status: statusOu(p.status, 'concluida'), agente_id: agente, agente_nome: txt(p.agente_nome, agente) };
}

export const contarAbertas = (subs: { status: StatusTarefa }[]) => subs.filter((s) => STATUS_ABERTOS.includes(s.status)).length;

/**
 * Subtarefa que vai começar (na fila, a ponte ligada e ela é a tarefa atual do
 * especialista): na lista do líder aparece trabalhando, como no resto do jogo.
 * Se o especialista ainda está noutra tarefa, ela fica "na fila" de verdade.
 */
export function subtarefaComecando(s: Pick<Subtarefa, 'id' | 'agente_id' | 'status'>, agentes: Pick<Agente, 'id' | 'tarefa'>[], ponteLigada: boolean): boolean {
	return s.status === 'fila' && ponteLigada && agentes.some((a) => a.id === s.agente_id && a.tarefa?.id === s.id);
}

/** A primeira linha com texto, sem a marcação do markdown (título, item, negrito). */
export function primeiraLinha(texto: string | null): string | null {
	for (const bruta of (texto ?? '').split('\n')) {
		const l = bruta
			.replace(/^\s*(#{1,6}\s+|[-*>]\s+|\d+[.)]\s+)/, '')
			.replace(/\*\*|`/g, '')
			.trim();
		if (l) return l;
	}
	return null;
}

/**
 * A linha de baixo de uma subtarefa na lista da equipe: o que faz agora
 * (aberta), o começo do resultado (concluída) ou o erro (parou).
 */
export function linhaDaSubtarefa(s: Pick<Subtarefa, 'status' | 'atividade' | 'resumo' | 'erro'>, comecando = false): string {
	if (comecando) return atividadeComecando(s.atividade);
	if (s.status === 'fila') return s.atividade ?? 'Na fila';
	if (s.status === 'trabalhando' || s.status === 'esperando') return s.atividade ?? NOME_DO_STATUS[s.status];
	if (s.status === 'concluida') return primeiraLinha(s.resumo) ?? '(terminou sem texto final)';
	if (s.status === 'cancelada') return s.erro ?? '(parada antes de terminar)';
	return s.erro ?? NOME_DO_STATUS[s.status];
}

/**
 * O "Retorno da equipe" (equipe.ts, mensagemDaEquipe) pronto para o blocos():
 * a linha "Tarefa: …" e a "Erro: …" ficam num parágrafo só delas (no texto da
 * ponte o resultado vem logo embaixo, e o markdown juntaria os dois) e o "---"
 * antes do fecho vira só um respiro. Dentro de bloco de código nada muda.
 */
export function textoDoRetorno(conteudo: string): string {
	const saida: string[] = [];
	let codigo = false;
	for (const linha of conteudo.split('\n')) {
		if (/^\s*```/.test(linha)) codigo = !codigo;
		if (!codigo && /^\s*-{3,}\s*$/.test(linha)) {
			saida.push('');
			continue;
		}
		saida.push(linha);
		if (!codigo && /^(Tarefa|Erro): /.test(linha)) saida.push('');
	}
	return saida.join('\n');
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
/**
 * Onde cada agente fica agora. Com `agoraS` (a hora do servidor), vale a rotina
 * (rotina.ts): reunião, posto com tarefa, 20% de pausas, senão o posto. Sem ela,
 * a regra antiga: livre na copa.
 */
export function lugaresDosAgentes(
	lista: Agente[],
	agoraS?: number | null
): { lugar: Map<string, Assento>; reservados: Set<string>; momento: Map<string, Destino> } {
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
	const momento = new Map<string, Destino>();
	if (typeof agoraS === 'number' && Number.isFinite(agoraS)) {
		const destinos = destinosDosAgentes(
			ordenados.map((a) => ({ id: a.id, sala: a.sala, ordem: a.ordem, ocupado: a.estado !== 'livre', reuniao: a.reuniao?.sala ?? null })),
			agoraS,
			mesa,
			reservados
		);
		for (const [id, d] of destinos) {
			lugar.set(id, d.lugar);
			reservados.add(d.lugar.id);
			momento.set(id, d);
		}
		return { lugar, reservados, momento };
	}
	const naCopa = todos.filter((s) => s.sala === 'copa' && s.sentado);
	const chao = new Set(naCopa.map((s) => `${Math.floor(s.x)},${Math.floor(s.y)}`));
	let emPe: Assento[] | null = null;
	for (const a of ordenados) {
		const m = mesa.get(a.id);
		// Na mesa: trabalhando, esperando resposta ou (o líder) esperando a equipe
		if (m && (a.estado === 'trabalhando' || a.estado === 'esperando' || a.estado === 'aguardando')) {
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
	return { lugar, reservados, momento };
}

type Ouvintes = {
	leitura(l: LeituraAgentes): void;
	/** Duas leituras seguidas falharam (rede, banco). */
	falha?(e: unknown): void;
	/** O banco avisou que algo mudou (migration 0104): `tarefa` é a tarefa que mudou, se houver. */
	mudou?(tarefa: string | null): void;
	/** Os avisos na hora estão chegando (true) ou caíram e vale só a leitura periódica (false). */
	aoVivo?(sim: boolean): void;
};

/** O canal privado dos avisos (migration 0104). */
export const CANAL_DOS_AVISOS = 'dgathe:agentes';

/**
 * Lê os agentes e fica ouvindo os avisos do banco (Supabase Realtime, canal
 * privado): mudou algo, relê na hora. Com os avisos chegando, a leitura
 * periódica vira reserva (a cada 12 s); sem eles, a cada 3 s como antes.
 */
export class Agentes {
	private timer: ReturnType<typeof setTimeout> | undefined;
	private parado = false;
	private lendo = false;
	private deNovo = false;
	private falhas = 0;
	private canal: RealtimeChannel | null = null;
	private vivo = false;
	private juntar: ReturnType<typeof setTimeout> | undefined;
	private religar: ReturnType<typeof setTimeout> | undefined;

	constructor(
		private readonly supabase: SupabaseClient,
		private readonly ouvintes: Ouvintes
	) {}

	iniciar() {
		this.parado = false;
		void this.ler();
		void this.ouvir();
	}

	/** Leia já (depois de passar uma tarefa, ou porque o banco avisou). */
	agora() {
		if (this.lendo) {
			this.deNovo = true;
			return;
		}
		clearTimeout(this.timer);
		void this.ler();
	}

	parar() {
		this.parado = true;
		clearTimeout(this.timer);
		clearTimeout(this.juntar);
		clearTimeout(this.religar);
		const c = this.canal;
		this.canal = null;
		if (c) void this.supabase.removeChannel(c);
	}

	/**
	 * Entra no canal dos avisos. Antes, tira um canal de mesmo nome que tenha
	 * sobrado: o supabase-js devolve o canal antigo (ainda saindo) e ele não se
	 * inscreve de novo (o defeito da presença em 09/11/2026).
	 */
	private async ouvir() {
		if (this.parado) return;
		for (const c of this.supabase.getChannels()) {
			if (c.topic === `realtime:${CANAL_DOS_AVISOS}`) await this.supabase.removeChannel(c);
		}
		if (this.parado) return;
		const canal = this.supabase.channel(CANAL_DOS_AVISOS, { config: { private: true } });
		this.canal = canal;
		canal
			.on('broadcast', { event: 'mudou' }, (msg) => {
				const tarefa = typeof msg?.payload?.tarefa === 'string' ? msg.payload.tarefa : null;
				this.ouvintes.mudou?.(tarefa);
				// Vários avisos juntos (o agente andando rápido) viram uma leitura só
				clearTimeout(this.juntar);
				this.juntar = setTimeout(() => this.agora(), 250);
			})
			.subscribe((estado) => {
				if (this.parado || this.canal !== canal) return;
				const vivo = estado === 'SUBSCRIBED';
				if (vivo !== this.vivo) {
					this.vivo = vivo;
					this.ouvintes.aoVivo?.(vivo);
				}
				if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
					// Tenta de novo daqui a pouco; até lá, a leitura periódica cobre
					clearTimeout(this.religar);
					this.religar = setTimeout(() => {
						if (this.canal === canal) {
							this.canal = null;
							void this.supabase.removeChannel(canal).then(() => this.ouvir());
						}
					}, 30_000);
				}
			});
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
				if (this.deNovo) {
					this.deNovo = false;
					this.timer = setTimeout(() => void this.ler(), 0);
				} else {
					const escondida = typeof document !== 'undefined' && document.hidden;
					this.timer = setTimeout(() => void this.ler(), escondida ? 15_000 : this.vivo ? 12_000 : 3000);
				}
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
