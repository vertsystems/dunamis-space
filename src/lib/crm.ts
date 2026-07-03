// ============================================================
// CRM Master — tipos, constantes e helpers de UI
// Módulo de vendas: contatos (leads), negócios (pipeline), atividades.
// ============================================================
import type { BadgeTone } from '$lib/components/ui';
import { formatBRL } from '$lib/clientes';

export { formatBRL };

// ---------- Status do negócio ----------
export const NEGOCIO_STATUS = [
	{ value: 'aberto', label: 'Aberto' },
	{ value: 'ganho', label: 'Ganho' },
	{ value: 'perdido', label: 'Perdido' }
] as const;

export type NegocioStatus = (typeof NEGOCIO_STATUS)[number]['value'];

export function negocioStatusTone(status: string): BadgeTone {
	switch (status) {
		case 'ganho':
			return 'success';
		case 'perdido':
			return 'danger';
		default:
			return 'info';
	}
}

export function negocioStatusLabel(status: string): string {
	return NEGOCIO_STATUS.find((s) => s.value === status)?.label ?? status;
}

// ---------- Tipos de atividade ----------
export const ATIVIDADE_TIPOS = [
	{ value: 'ligacao', label: 'Ligação', icon: 'phone', tone: 'info' },
	{ value: 'reuniao', label: 'Reunião', icon: 'calendar', tone: 'brand' },
	{ value: 'email', label: 'E-mail', icon: 'mail', tone: 'neutral' },
	{ value: 'whatsapp', label: 'WhatsApp', icon: 'message', tone: 'success' },
	{ value: 'tarefa', label: 'Tarefa', icon: 'check', tone: 'warning' },
	{ value: 'nota', label: 'Nota', icon: 'edit', tone: 'neutral' }
] as const;

export type AtividadeTipo = (typeof ATIVIDADE_TIPOS)[number]['value'];

export function atividadeTipo(tipo: string) {
	return ATIVIDADE_TIPOS.find((t) => t.value === tipo) ?? ATIVIDADE_TIPOS[4];
}

// ---------- Origens sugeridas (texto livre, mas com sugestões) ----------
export const ORIGENS = [
	'Indicação',
	'Instagram',
	'Site',
	'WhatsApp',
	'Google',
	'Evento',
	'Outbound',
	'Outro'
] as const;

// ---------- Cores de etapa (token de tom -> classes) ----------
export type StageCor = 'neutral' | 'info' | 'brand' | 'warning' | 'success' | 'danger';

const STAGE_DOT: Record<string, string> = {
	neutral: 'bg-grey',
	info: 'bg-navy',
	brand: 'bg-brand',
	warning: 'bg-brand-amber',
	success: 'bg-brand-green',
	danger: 'bg-brand-danger'
};

/** Classe do "ponto" colorido da etapa no kanban/selects. */
export function stageDot(cor: string | null | undefined): string {
	return STAGE_DOT[cor ?? 'neutral'] ?? STAGE_DOT.neutral;
}

/** O tom (BadgeTone) da etapa reaproveita o próprio token de cor. */
export function stageTone(cor: string | null | undefined): BadgeTone {
	const c = (cor ?? 'neutral') as BadgeTone;
	return (['neutral', 'info', 'brand', 'warning', 'success', 'danger'] as const).includes(
		c as StageCor
	)
		? c
		: 'neutral';
}

// ---------- Datas ----------
/** Data pura ou timestamp -> "dd/mm/aaaa" (evita shift de timezone em datas puras). */
export function formatData(v: string | null | undefined): string {
	if (!v) return '—';
	const d = v.length <= 10 ? new Date(v + 'T00:00:00') : new Date(v);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('pt-BR');
}

/** "dd/mm HH:MM" para atividades com hora. */
export function formatDataHora(v: string | null | undefined): string {
	if (!v) return '';
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export type Vencimento = 'atrasada' | 'hoje' | 'em_breve' | 'futura' | 'sem_data';

/**
 * Classifica o vencimento de uma atividade em relação a "agora".
 * Regra única (usada tanto na agenda quanto no KPI de atrasadas):
 * qualquer instante já passado é "atrasada"; caso contrário classifica por dia.
 */
export function vencimentoDe(dataHora: string | null | undefined, agora = new Date()): Vencimento {
	if (!dataHora) return 'sem_data';
	const d = new Date(dataHora);
	if (Number.isNaN(d.getTime())) return 'sem_data';
	if (d.getTime() < agora.getTime()) return 'atrasada';
	const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
	const alvo = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	const diffDias = Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
	if (diffDias === 0) return 'hoje';
	if (diffDias <= 7) return 'em_breve';
	return 'futura';
}

export function vencimentoTone(v: Vencimento): BadgeTone {
	switch (v) {
		case 'atrasada':
			return 'danger';
		case 'hoje':
			return 'warning';
		case 'em_breve':
			return 'info';
		default:
			return 'neutral';
	}
}

export function vencimentoLabel(v: Vencimento): string {
	return {
		atrasada: 'Atrasada',
		hoje: 'Hoje',
		em_breve: 'Em breve',
		futura: 'Futura',
		sem_data: 'Sem data'
	}[v];
}

// ---------- Normalização de FormData ----------
function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

/**
 * Converte um valor monetário digitado -> Number, tolerante a pt-BR e a ponto decimal.
 * Heurística: se há vírgula, ela é o decimal e pontos são milhar ("1.234,56" -> 1234.56).
 * Sem vírgula: um único ponto com 1–2 casas é decimal ("1234.56" -> 1234.56, "1.5" -> 1.5);
 * pontos com 3 casas ou múltiplos pontos são milhar ("1.500" -> 1500, "1.234.567" -> 1234567).
 */
export function parseValor(raw: string | null): number {
	if (raw === null) return 0;
	let s = raw.trim();
	if (!s) return 0;
	if (s.includes(',')) {
		s = s.replace(/\./g, '').replace(',', '.');
	} else {
		const pontos = (s.match(/\./g) ?? []).length;
		if (pontos > 1) {
			s = s.replace(/\./g, '');
		} else if (pontos === 1) {
			const casas = (s.split('.')[1] ?? '').length;
			if (casas === 3) s = s.replace('.', ''); // milhar pt-BR: 1.500 -> 1500
		}
	}
	const n = Number(s.replace(/[^\d.-]/g, ''));
	return Number.isFinite(n) ? n : 0;
}

/** "tag1, tag2 ; tag3" -> ['tag1','tag2','tag3'] */
export function parseTags(raw: string | null): string[] {
	if (!raw) return [];
	return raw
		.split(/[,;]/)
		.map((t) => t.trim())
		.filter(Boolean);
}

export function contatoFromForm(fd: FormData) {
	return {
		nome: str(fd, 'nome') ?? '',
		empresa: str(fd, 'empresa'),
		cargo: str(fd, 'cargo'),
		email: str(fd, 'email'),
		telefone: str(fd, 'telefone'),
		whatsapp: str(fd, 'whatsapp'),
		origem: str(fd, 'origem'),
		segmento: str(fd, 'segmento'),
		tags: parseTags(str(fd, 'tags')),
		responsavel_id: str(fd, 'responsavel_id'),
		cliente_id: str(fd, 'cliente_id'),
		observacoes: str(fd, 'observacoes')
	};
}

export function negocioFromForm(fd: FormData) {
	return {
		titulo: str(fd, 'titulo') ?? '',
		contato_id: str(fd, 'contato_id'),
		pipeline_id: str(fd, 'pipeline_id'),
		stage_id: str(fd, 'stage_id'),
		valor: parseValor(str(fd, 'valor')),
		previsao_fechamento: str(fd, 'previsao_fechamento'),
		responsavel_id: str(fd, 'responsavel_id'),
		observacoes: str(fd, 'observacoes')
	};
}

export function atividadeFromForm(fd: FormData) {
	return {
		negocio_id: str(fd, 'negocio_id'),
		contato_id: str(fd, 'contato_id'),
		tipo: (str(fd, 'tipo') ?? 'tarefa') as AtividadeTipo,
		titulo: str(fd, 'titulo'),
		descricao: str(fd, 'descricao'),
		data_hora: str(fd, 'data_hora'),
		responsavel_id: str(fd, 'responsavel_id')
	};
}

// ---------- Shapes usados no client (load -> componentes) ----------
export type Colaborador = { id: string; nome: string };

export type Stage = {
	id: string;
	pipeline_id: string;
	nome: string;
	ordem: number;
	cor: string;
	probabilidade: number;
};

export type Pipeline = { id: string; nome: string; ordem: number };

export type ContatoLite = {
	id: string;
	nome: string;
	empresa: string | null;
};

export type Negocio = {
	id: string;
	titulo: string;
	valor: number;
	status: NegocioStatus;
	stage_id: string | null;
	pipeline_id: string;
	ordem: number;
	previsao_fechamento: string | null;
	motivo_perda: string | null;
	observacoes: string | null;
	ganho_em: string | null;
	perdido_em: string | null;
	created_at: string;
	contato_id: string | null;
	contato_nome: string | null;
	contato_empresa: string | null;
	responsavel_id: string | null;
	responsavel_nome: string | null;
	// derivados no load:
	prox_atividade: string | null; // data_hora da próxima atividade pendente
};

export type Contato = {
	id: string;
	nome: string;
	empresa: string | null;
	cargo: string | null;
	email: string | null;
	telefone: string | null;
	whatsapp: string | null;
	origem: string | null;
	segmento: string | null;
	tags: string[];
	observacoes: string | null;
	cliente_id: string | null;
	created_at: string;
	responsavel_id: string | null;
	responsavel_nome: string | null;
	// agregados no load:
	negocios_qtd: number;
	valor_total: number;
};

export type Atividade = {
	id: string;
	tipo: AtividadeTipo;
	titulo: string | null;
	descricao: string | null;
	data_hora: string | null;
	concluida: boolean;
	concluida_em: string | null;
	created_at: string;
	negocio_id: string | null;
	negocio_titulo: string | null;
	contato_id: string | null;
	contato_nome: string | null;
	responsavel_id: string | null;
	responsavel_nome: string | null;
};

export type Kpis = {
	abertos_qtd: number;
	valor_aberto: number;
	valor_ponderado: number;
	ganhos_mes: number;
	valor_ganho_mes: number;
	taxa_conversao: number;
	atividades_atrasadas: number;
};

/**
 * KPIs derivados no cliente a partir dos arrays reativos — assim o painel
 * fica sempre consistente com o quadro/lista (inclusive em updates otimistas).
 */
export function computeKpis(
	negocios: Negocio[],
	atividades: Atividade[],
	stages: Stage[],
	agora = new Date()
): Kpis {
	const prob = new Map(stages.map((s) => [s.id, s.probabilidade]));
	const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
	let abertos_qtd = 0,
		valor_aberto = 0,
		valor_ponderado = 0,
		ganhos_mes = 0,
		valor_ganho_mes = 0,
		ganhosTotal = 0,
		perdidosTotal = 0;
	for (const n of negocios) {
		if (n.status === 'aberto') {
			abertos_qtd++;
			valor_aberto += n.valor;
			valor_ponderado += (n.valor * (prob.get(n.stage_id ?? '') ?? 0)) / 100;
		} else if (n.status === 'ganho') {
			ganhosTotal++;
			if (n.ganho_em && new Date(n.ganho_em).getTime() >= inicioMes) {
				ganhos_mes++;
				valor_ganho_mes += n.valor;
			}
		} else if (n.status === 'perdido') {
			perdidosTotal++;
		}
	}
	const fechados = ganhosTotal + perdidosTotal;
	const atividades_atrasadas = atividades.filter(
		(a) => !a.concluida && vencimentoDe(a.data_hora, agora) === 'atrasada'
	).length;
	return {
		abertos_qtd,
		valor_aberto,
		valor_ponderado,
		ganhos_mes,
		valor_ganho_mes,
		taxa_conversao: fechados ? Math.round((ganhosTotal / fechados) * 100) : 0,
		atividades_atrasadas
	};
}

/** Iniciais para avatar (mesmo padrão do app shell). */
export function iniciais(nome: string | null | undefined): string {
	const n = (nome ?? '').trim();
	if (!n) return '—';
	const partes = n.split(/\s+/);
	const ini = (partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '');
	return ini.toUpperCase() || '—';
}
