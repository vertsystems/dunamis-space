// ============================================================
// Registro de Ponto — domínio puro (sem Supabase, sem Svelte).
// ------------------------------------------------------------
// Tudo que decide "qual a próxima batida", "quantas horas deu o dia" e
// "quanto está o saldo do mês" mora aqui, para ser testável (ponto.test.ts)
// e usado igual no servidor e na tela.
//
// Fuso: as batidas são timestamptz (instantes). A tela e a edição pensam em
// hora de São Paulo, então toda conversão passa por horaSP()/instanteSP() —
// nunca por toISOString().slice(), que formata em UTC e erra depois das 21h.
// ============================================================

import { hojeISO } from '$lib/datas';

const FUSO = 'America/Sao_Paulo';

export const CAMPOS = ['entrada', 'almoco_saida', 'almoco_volta', 'saida'] as const;
export type Campo = (typeof CAMPOS)[number];

export type Batida = {
	campo: Campo;
	/** Rótulo do que já aconteceu ("Entrada"). */
	label: string;
	/** Texto do botão que registra esta batida ("Bater entrada"). */
	acao: string;
	icon: string;
};

export const BATIDAS: Batida[] = [
	{ campo: 'entrada', label: 'Entrada', acao: 'Registrar entrada', icon: 'zap' },
	{ campo: 'almoco_saida', label: 'Saída p/ almoço', acao: 'Sair para o almoço', icon: 'clock' },
	{ campo: 'almoco_volta', label: 'Volta do almoço', acao: 'Voltar do almoço', icon: 'refresh' },
	{ campo: 'saida', label: 'Fim do expediente', acao: 'Encerrar o expediente', icon: 'logout' }
];

export function batida(campo: Campo): Batida {
	return BATIDAS.find((b) => b.campo === campo) ?? BATIDAS[0];
}

/** Registro de um dia (as quatro batidas, em ISO com fuso, ou null). */
export type Registro = {
	id?: string;
	colaborador_id?: string;
	data: string; // YYYY-MM-DD
	entrada: string | null;
	almoco_saida: string | null;
	almoco_volta: string | null;
	saida: string | null;
	observacao?: string | null;
};

export type Jornada = {
	/** Minutos esperados por dia de trabalho. */
	minutos: number;
	/** Dias da semana com jornada (0=Domingo … 6=Sábado). */
	dias: number[];
};

export const JORNADA_PADRAO: Jornada = { minutos: 480, dias: [1, 2, 3, 4, 5] };

export function jornadaDe(
	c: { jornada_minutos?: number | null; jornada_dias?: number[] | null } | null | undefined
): Jornada {
	return {
		minutos: c?.jornada_minutos ?? JORNADA_PADRAO.minutos,
		dias: c?.jornada_dias?.length ? c.jornada_dias : JORNADA_PADRAO.dias
	};
}

export function registroVazio(data: string, colaborador_id?: string): Registro {
	return {
		colaborador_id,
		data,
		entrada: null,
		almoco_saida: null,
		almoco_volta: null,
		saida: null
	};
}

/* ---------------- Fuso de São Paulo ---------------- */

/** Hora de um instante ISO no fuso de SP, como "HH:MM" (ou '' se null). */
export function horaSP(iso: string | null | undefined): string {
	if (!iso) return '';
	return new Intl.DateTimeFormat('pt-BR', {
		timeZone: FUSO,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).format(new Date(iso));
}

/** Data (YYYY-MM-DD) de um instante ISO no fuso de SP. */
export function dataSP(iso: string | Date): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: FUSO,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(typeof iso === 'string' ? new Date(iso) : iso);
}

/**
 * Deslocamento do fuso de SP naquela data ("-03:00"). Calculado, e não fixo em
 * -03:00, para que a volta do horário de verão não desloque batidas antigas.
 */
function offsetSP(data: string): string {
	const partes = new Intl.DateTimeFormat('en-US', {
		timeZone: FUSO,
		timeZoneName: 'longOffset'
	}).formatToParts(new Date(`${data}T12:00:00Z`));
	const tz = partes.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-03:00';
	const off = tz.replace('GMT', '').trim();
	return off || '+00:00';
}

/**
 * Instante ISO de uma hora local de SP ("2026-08-09" + "08:15" → com offset).
 * Devolve null para hora vazia — é assim que a tela apaga uma batida.
 */
export function instanteSP(data: string, hhmm: string | null | undefined): string | null {
	const h = (hhmm ?? '').trim();
	if (!/^\d{1,2}:\d{2}$/.test(h)) return null;
	const [hora, min] = h.split(':');
	const hh = hora.padStart(2, '0');
	if (Number(hh) > 23 || Number(min) > 59) return null;
	return `${data}T${hh}:${min}:00${offsetSP(data)}`;
}

/** Dia da semana (0-6) de uma data YYYY-MM-DD, sem borda de fuso. */
export function diaSemana(data: string): number {
	return new Date(`${data}T12:00:00Z`).getUTCDay();
}

/* ---------------- Estado do dia ---------------- */

export type Status = 'nao_iniciado' | 'trabalhando' | 'almoco' | 'encerrado';

export function statusDe(r: Registro | null | undefined): Status {
	if (!r?.entrada) return 'nao_iniciado';
	if (r.saida) return 'encerrado';
	if (r.almoco_saida && !r.almoco_volta) return 'almoco';
	return 'trabalhando';
}

export const STATUS_LABEL: Record<Status, string> = {
	nao_iniciado: 'Não iniciado',
	trabalhando: 'Trabalhando',
	almoco: 'Em almoço',
	encerrado: 'Expediente encerrado'
};

export const STATUS_TONE: Record<Status, 'neutral' | 'success' | 'warning' | 'info'> = {
	nao_iniciado: 'neutral',
	trabalhando: 'success',
	almoco: 'warning',
	encerrado: 'info'
};

/** Próxima batida pendente do dia, ou null se o expediente já foi encerrado. */
export function proximaBatida(r: Registro | null | undefined): Campo | null {
	if (!r?.entrada) return 'entrada';
	if (!r.almoco_saida) return 'almoco_saida';
	if (!r.almoco_volta) return 'almoco_volta';
	if (!r.saida) return 'saida';
	return null;
}

/**
 * Minutos trabalhados no dia. Enquanto o expediente está aberto conta até
 * `agora` (o card do Meu Dia anda sozinho); em almoço, congela na saída para o
 * almoço. Dia sem entrada = 0.
 *
 * Dia PASSADO deixado em aberto (esqueceu de bater a saída) conta só os blocos
 * que fecharam — senão o relógio correria para sempre e uma batida esquecida
 * viraria 300h de crédito no mês.
 */
export function minutosTrabalhados(r: Registro | null | undefined, agora: Date = new Date()): number {
	if (!r?.entrada) return 0;
	const t = (iso: string | null) => (iso ? new Date(iso).getTime() : null);
	const entrada = t(r.entrada)!;
	const almocoSaida = t(r.almoco_saida);
	const almocoVolta = t(r.almoco_volta);
	const saida = t(r.saida);
	const emCurso = r.data === dataSP(agora);

	// Em almoço: o dia parou na saída para o almoço.
	if (almocoSaida && !almocoVolta) return Math.max(0, Math.round((almocoSaida - entrada) / 60000));

	let fim: number;
	if (saida) fim = saida;
	else if (emCurso) fim = agora.getTime();
	// Passado sem saída: só o bloco da manhã (se fechou) conta.
	else if (almocoSaida) return Math.max(0, Math.round((almocoSaida - entrada) / 60000));
	else return 0;

	let total = fim - entrada;
	if (almocoSaida && almocoVolta) total -= almocoVolta - almocoSaida;
	return Math.max(0, Math.round(total / 60000));
}

/** Minutos de intervalo de almoço (0 se não houve par completo). */
export function minutosAlmoco(r: Registro | null | undefined): number {
	if (!r?.almoco_saida || !r.almoco_volta) return 0;
	const ms = new Date(r.almoco_volta).getTime() - new Date(r.almoco_saida).getTime();
	return Math.max(0, Math.round(ms / 60000));
}

/** Minutos esperados naquela data para a jornada (0 em dia sem jornada). */
export function esperadoNoDia(data: string, j: Jornada): number {
	return j.dias.includes(diaSemana(data)) ? j.minutos : 0;
}

/**
 * Saldo do dia (trabalhado − esperado). O dia em curso só entra no saldo
 * depois de encerrado: enquanto a pessoa trabalha, "faltam 3h" não é dívida.
 */
export function saldoDoDia(r: Registro | null | undefined, data: string, j: Jornada, hoje: string): number {
	const esperado = esperadoNoDia(data, j);
	const trabalhado = minutosTrabalhados(r);
	if (data >= hoje && statusDe(r) !== 'encerrado') return 0;
	return trabalhado - esperado;
}

/** Dia útil (tem jornada) sem nenhuma batida, já passado = falta. */
export function ehFalta(r: Registro | null | undefined, data: string, j: Jornada, hoje: string): boolean {
	if (data >= hoje) return false;
	return esperadoNoDia(data, j) > 0 && !r?.entrada;
}

/* ---------------- Formatação ---------------- */

/** 465 → "7h45". Minutos soltos viram "45min"; zero vira "0h". */
export function formatMinutos(min: number): string {
	const neg = min < 0;
	const abs = Math.abs(Math.round(min));
	const h = Math.floor(abs / 60);
	const m = abs % 60;
	const txt = h ? (m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`) : `${m}min`;
	return neg ? `−${txt}` : txt;
}

/** Saldo com sinal explícito: "+1h20", "−45min", "0h". */
export function formatSaldo(min: number): string {
	const r = Math.round(min);
	if (r === 0) return '0h';
	return r > 0 ? `+${formatMinutos(r)}` : formatMinutos(r);
}

export function saldoTone(min: number): 'success' | 'danger' | 'neutral' {
	if (Math.abs(min) < 5) return 'neutral';
	return min > 0 ? 'success' : 'danger';
}

/* ---------------- Períodos ---------------- */

/** Mês de referência (YYYY-MM) — hoje em SP quando não informado. */
export function mesAtual(): string {
	return hojeISO().slice(0, 7);
}

/** Primeiro e último dia do mês YYYY-MM. */
export function intervaloDoMes(mes: string): { inicio: string; fim: string } {
	const [ano, m] = mes.split('-').map(Number);
	const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate();
	return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

/** Todas as datas (YYYY-MM-DD) de um intervalo, inclusive as pontas. */
export function diasDoIntervalo(inicio: string, fim: string): string[] {
	const dias: string[] = [];
	let d = new Date(`${inicio}T12:00:00Z`);
	const ate = new Date(`${fim}T12:00:00Z`);
	while (d <= ate) {
		dias.push(d.toISOString().slice(0, 10));
		d = new Date(d.getTime() + 86400000);
	}
	return dias;
}

/** Nome do mês por extenso ("Agosto de 2026"). */
export function labelMes(mes: string): string {
	const [ano, m] = mes.split('-').map(Number);
	const nome = new Date(Date.UTC(ano, m - 1, 1)).toLocaleDateString('pt-BR', {
		month: 'long',
		timeZone: 'UTC'
	});
	return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}`;
}

/** Mês anterior/seguinte a YYYY-MM. */
export function deslocaMes(mes: string, passos: number): string {
	const [ano, m] = mes.split('-').map(Number);
	const d = new Date(Date.UTC(ano, m - 1 + passos, 1));
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export type Resumo = {
	/** Dias com pelo menos a entrada batida. */
	diasTrabalhados: number;
	/** Dias úteis já passados sem nenhuma batida. */
	faltas: number;
	minutosTrabalhados: number;
	minutosEsperados: number;
	saldo: number;
};

/**
 * Consolida um período para uma pessoa. `hoje` delimita o que já conta:
 * o futuro não gera dívida, e o dia em curso só entra quando encerrado.
 */
export function resumoPeriodo(
	registros: Registro[],
	j: Jornada,
	inicio: string,
	fim: string,
	hoje: string
): Resumo {
	const porData = new Map(registros.map((r) => [r.data, r]));
	const r: Resumo = {
		diasTrabalhados: 0,
		faltas: 0,
		minutosTrabalhados: 0,
		minutosEsperados: 0,
		saldo: 0
	};
	for (const dia of diasDoIntervalo(inicio, fim)) {
		if (dia > hoje) continue;
		const reg = porData.get(dia) ?? null;
		const esperado = esperadoNoDia(dia, j);
		const trabalhado = minutosTrabalhados(reg);
		const encerrado = statusDe(reg) === 'encerrado';
		if (reg?.entrada) r.diasTrabalhados++;
		if (ehFalta(reg, dia, j, hoje)) r.faltas++;
		// O dia em curso ainda não fecha conta: entra no total de horas
		// (para a tela mostrar o andamento), mas não no esperado nem no saldo.
		r.minutosTrabalhados += trabalhado;
		if (dia < hoje || encerrado) {
			r.minutosEsperados += esperado;
			r.saldo += trabalhado - esperado;
		}
	}
	return r;
}

/* ---------------- CSV ---------------- */

/** Espelho do mês em CSV (ponto e vírgula, como o Excel pt-BR espera). */
export function csvDoMes(
	linhas: { nome: string; data: string; registro: Registro | null; jornada: Jornada }[],
	hoje: string
): string {
	const cab = [
		'Colaborador',
		'Data',
		'Entrada',
		'Saída almoço',
		'Volta almoço',
		'Saída',
		'Horas',
		'Esperado',
		'Saldo'
	];
	const esc = (v: string) => (v.includes(';') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
	const corpo = linhas.map(({ nome, data, registro, jornada }) => {
		const trab = minutosTrabalhados(registro);
		const esp = esperadoNoDia(data, jornada);
		return [
			esc(nome),
			data.split('-').reverse().join('/'),
			horaSP(registro?.entrada),
			horaSP(registro?.almoco_saida),
			horaSP(registro?.almoco_volta),
			horaSP(registro?.saida),
			formatMinutos(trab),
			formatMinutos(esp),
			formatSaldo(saldoDoDia(registro, data, jornada, hoje))
		].join(';');
	});
	return [cab.join(';'), ...corpo].join('\n');
}
