// O mapa dos Bandoletes (pedido do Bruno em 10/11/2026): um botão no topo do
// DGathe que abre o fluxo do trabalho, como o mapa de agentes do Claude Code.
// Cada pedido vira uma árvore: o Bandolete que recebeu (o líder, numa equipe)
// e, ligados a ele, os da equipe com as subtarefas. Desde a diretoria
// (11/11/2026) a árvore pode ter dois níveis: diretor → gerente → equipe.
//
// Os dados vêm de dgathe_mapa (migration 0109); aqui ficam a leitura, a
// montagem das árvores e os textos curtos de cada cartão. A tela é
// components/dgathe/MapaBandoletes.svelte.

import type { StatusTarefa } from './agentes';

export type NoDoFluxo = {
	id: string;
	paiId: string | null;
	agenteId: string;
	agenteNome: string;
	agenteCargo: string;
	titulo: string;
	status: StatusTarefa;
	atividade: string | null;
	criadaPor: string;
	resumo: string | null;
	erro: string | null;
	passos: number;
	/** Tokens em contexto na última chamada ao modelo (null antes da ponte 1.4 ou antes da 1ª chamada). */
	tokens: number | null;
	/** O modelo da sessão, como o Claude Code dá (ex.: claude-opus-5-5). */
	modelo: string | null;
	/** Pedidos de licença ou perguntas esperando resposta. */
	pedidos: number;
	/** Segundos de trabalho na leitura (do começo até o fim, ou até agora). */
	duracao: number;
	criadaHa: number;
	terminadaHa: number | null;
};

/** Quem recebeu de quem está em cima, e a equipe que ele chamou (o gerente que recebeu de um diretor). */
export type Ramo = { no: NoDoFluxo; equipe: NoDoFluxo[] };
/** Um pedido: quem recebeu e quem ele chamou (vazio fora de equipe). */
export type Projeto = { raiz: NoDoFluxo; equipe: Ramo[]; aberto: boolean };

/** Todos os cartões de um pedido, de cima para baixo. */
export function nosDoProjeto(p: Projeto): NoDoFluxo[] {
	return [p.raiz, ...p.equipe.flatMap((r) => [r.no, ...r.equipe])];
}

/** O ponto de cada cartão: o status da tarefa, com "precisa" na frente de tudo. */
export type EstadoDoNo = 'precisa' | 'trabalhando' | 'aguardando' | 'fila' | 'concluida' | 'falhou' | 'parada';

const STATUS: StatusTarefa[] = ['fila', 'trabalhando', 'esperando', 'aguardando', 'concluida', 'falhou', 'cancelada'];
/** Ainda corre o relógio: o tempo do cartão sobe sozinho entre uma leitura e outra. */
const RODANDO: StatusTarefa[] = ['trabalhando', 'esperando', 'aguardando'];
const ABERTOS: StatusTarefa[] = ['fila', 'trabalhando', 'esperando', 'aguardando'];

export const COR_DO_NO: Record<EstadoDoNo, string> = {
	precisa: '#f5a524',
	trabalhando: '#34d399',
	aguardando: '#38bdf8',
	fila: '#c4b5fd',
	concluida: '#7c8597',
	falhou: '#f87171',
	parada: '#7c8597'
};

export const NOME_DO_NO: Record<EstadoDoNo, string> = {
	precisa: 'Precisa de você',
	trabalhando: 'Trabalhando',
	aguardando: 'Esperando a equipe',
	fila: 'Na fila',
	concluida: 'Concluída',
	falhou: 'Parou com erro',
	parada: 'Parada'
};

const txt = (v: unknown) => (typeof v === 'string' ? v : '');
const talvez = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
function num(v: unknown): number | null {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
	return null;
}

/** Lê a resposta de dgathe_mapa; o que não reconhece fica de fora. null = sem permissão ou resposta estranha. */
export function lerFluxo(bruto: unknown): NoDoFluxo[] | null {
	if (!bruto || typeof bruto !== 'object') return null;
	const lista = (bruto as Record<string, unknown>).tarefas;
	if (!Array.isArray(lista)) return null;
	const nos: NoDoFluxo[] = [];
	for (const linha of lista) {
		if (!linha || typeof linha !== 'object') continue;
		const t = linha as Record<string, unknown>;
		const status = STATUS.includes(t.status as StatusTarefa) ? (t.status as StatusTarefa) : null;
		const id = txt(t.id);
		const agenteId = txt(t.agente_id);
		if (!id || !agenteId || !status) continue;
		const tokens = num(t.tokens);
		nos.push({
			id,
			paiId: talvez(t.pai_id),
			agenteId,
			agenteNome: txt(t.agente_nome) || agenteId,
			agenteCargo: txt(t.agente_cargo),
			titulo: txt(t.titulo) || 'Tarefa',
			status,
			atividade: talvez(t.atividade),
			criadaPor: txt(t.criada_por_nome),
			resumo: talvez(t.resumo),
			erro: talvez(t.erro),
			passos: Math.max(0, num(t.passos) ?? 0),
			tokens: tokens !== null && tokens > 0 ? tokens : null,
			modelo: talvez(t.modelo),
			pedidos: Math.max(0, num(t.pedidos) ?? 0),
			duracao: Math.max(0, num(t.duracao) ?? 0),
			criadaHa: Math.max(0, num(t.criada_ha) ?? 0),
			terminadaHa: num(t.terminada_ha)
		});
	}
	return nos;
}

export function estadoDoNo(no: Pick<NoDoFluxo, 'status' | 'pedidos'>): EstadoDoNo {
	if (no.status === 'esperando' || (no.pedidos > 0 && RODANDO.includes(no.status))) return 'precisa';
	if (no.status === 'cancelada') return 'parada';
	if (no.status === 'concluida' || no.status === 'falhou' || no.status === 'fila' || no.status === 'aguardando') return no.status;
	return 'trabalhando';
}

const PESO: Record<EstadoDoNo, number> = { precisa: 0, trabalhando: 1, fila: 2, aguardando: 3, falhou: 4, concluida: 5, parada: 6 };

/** O estado que mais pede atenção num pedido inteiro (o líder esperando e alguém da equipe precisando de você = precisa). */
export function estadoDoProjeto(p: Projeto): EstadoDoNo {
	let melhor = estadoDoNo(p.raiz);
	for (const n of nosDoProjeto(p)) {
		const e = estadoDoNo(n);
		if (PESO[e] < PESO[melhor]) melhor = e;
	}
	return melhor;
}

/**
 * As árvores, abertas primeiro. Aberto = alguém do pedido ainda vai trabalhar.
 * Entre os abertos, quem precisa de você sobe; depois, o mais recente. Entre os
 * terminados, o que terminou por último. Cada equipe fica na ordem em que foi
 * chamada. Subtarefa sem o pai na lista vira um pedido próprio; abaixo do
 * segundo nível não existe (a trava do banco não deixa).
 */
export function montarProjetos(nos: NoDoFluxo[]): { abertos: Projeto[]; terminados: Projeto[] } {
	const ids = new Set(nos.map((n) => n.id));
	const filhos = new Map<string, NoDoFluxo[]>();
	for (const n of nos) {
		if (!n.paiId || !ids.has(n.paiId)) continue;
		if (!filhos.has(n.paiId)) filhos.set(n.paiId, []);
		filhos.get(n.paiId)!.push(n);
	}
	const naOrdem = (lista: NoDoFluxo[] | undefined) => [...(lista ?? [])].sort((a, b) => b.criadaHa - a.criadaHa);
	const todos: Projeto[] = nos
		.filter((n) => !n.paiId || !ids.has(n.paiId))
		.map((raiz) => ({
			raiz,
			equipe: naOrdem(filhos.get(raiz.id)).map((no) => ({ no, equipe: naOrdem(filhos.get(no.id)) })),
			aberto: false
		}));
	for (const p of todos) p.aberto = nosDoProjeto(p).some((n) => ABERTOS.includes(n.status));
	const abertos = todos
		.filter((p) => p.aberto)
		.sort((a, b) => {
			const pa = estadoDoProjeto(a) === 'precisa' ? 0 : 1;
			const pb = estadoDoProjeto(b) === 'precisa' ? 0 : 1;
			return pa - pb || a.raiz.criadaHa - b.raiz.criadaHa;
		});
	const terminados = todos.filter((p) => !p.aberto).sort((a, b) => (a.raiz.terminadaHa ?? Infinity) - (b.raiz.terminadaHa ?? Infinity));
	return { abertos, terminados };
}

/** O tempo do cartão agora: o da leitura mais o que passou desde ela, se o relógio ainda corre. */
export function duracaoAgora(no: Pick<NoDoFluxo, 'status' | 'duracao'>, segundosDesdeALeitura: number): number {
	return no.duracao + (RODANDO.includes(no.status) ? Math.max(0, segundosDesdeALeitura) : 0);
}

/** 42s · 7m 27s · 1h 05m · 2d 3h */
export function duracaoCurta(segundos: number): string {
	const s = Math.max(0, Math.floor(segundos));
	if (s < 60) return `${s}s`;
	if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
	if (s < 86400) return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
	return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

/** 820 · 197,3 mil · 1,2 mi (como o "197.3k" do Claude Code, em português). */
export function tokensCurtos(n: number): string {
	const v = Math.max(0, Math.round(n));
	const umaCasa = (x: number) => x.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
	if (v < 1000) return String(v);
	if (v < 999_950) return `${umaCasa(v / 1000)} mil`;
	return `${umaCasa(v / 1_000_000)} mi`;
}

/** claude-opus-5-5 → Opus 5.5 · claude-sonnet-4-5-20250929 → Sonnet 4.5 · claude-3-5-haiku-… → Haiku 3.5. */
export function nomeDoModelo(id: string | null): string | null {
	if (!id) return null;
	const limpo = id.replace(/\[[^\]]*\]$/, '').trim().toLowerCase();
	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	const novo = limpo.match(/^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/);
	if (novo) return `${cap(novo[1])} ${novo[2]}${novo[3] ? `.${novo[3]}` : ''}`;
	const velho = limpo.match(/^claude-(\d+)(?:-(\d))?-([a-z]+)(?:-\d{8})?$/);
	if (velho) return `${cap(velho[3])} ${velho[1]}${velho[2] ? `.${velho[2]}` : ''}`;
	return id;
}

/** "4 Bandoletes · 2 trabalhando · 1 precisa de você", só com os pedidos abertos. */
export function resumoDoMapa(abertos: Projeto[]): string {
	const nos = abertos.flatMap(nosDoProjeto);
	const vivos = nos.filter((n) => ABERTOS.includes(n.status));
	const quem = new Set(vivos.map((n) => n.agenteId)).size;
	if (!quem) return 'Nenhum Bandolete trabalhando agora';
	const partes = [`${quem} Bandolete${quem > 1 ? 's' : ''}`];
	const trab = new Set(vivos.filter((n) => estadoDoNo(n) === 'trabalhando').map((n) => n.agenteId)).size;
	const precisa = new Set(vivos.filter((n) => estadoDoNo(n) === 'precisa').map((n) => n.agenteId)).size;
	if (trab) partes.push(`${trab} trabalhando`);
	if (precisa) partes.push(`${precisa} precisa${precisa > 1 ? 'm' : ''} de você`);
	return partes.join(' · ');
}
