import type { BadgeTone } from '$lib/components/ui';

/** Etapas fixas do processo, na ordem do fluxo. */
export const PROCESSO_ETAPAS = [
	{ key: 'dfd', label: 'DFD' },
	{ key: 'etp', label: 'ETP' },
	{ key: 'termo_referencia', label: 'Termo de Referência' },
	{ key: 'cotacao', label: 'Cotação' },
	{ key: 'contabilidade', label: 'Contabilidade' },
	{ key: 'controle_interno', label: 'Controle Interno' },
	{ key: 'licitacao', label: 'Licitação' }
] as const;

export type EtapaKey = (typeof PROCESSO_ETAPAS)[number]['key'];
export type EtapaStatus = 'pendente' | 'em_andamento' | 'concluido' | 'atrasado';
export type EtapasMap = Partial<Record<string, EtapaStatus>>;

export const ETAPA_STATUS = [
	{ value: 'pendente', label: 'Pendente' },
	{ value: 'em_andamento', label: 'Em andamento' },
	{ value: 'concluido', label: 'Concluído' },
	{ value: 'atrasado', label: 'Atrasado/Devolvido' }
] as const;

/** Estilo da célula de etapa (cor de fundo + glifo) — espelha o formato do print. */
export function etapaCelula(status: EtapaStatus | undefined): { cls: string; glyph: string } {
	switch (status) {
		case 'concluido':
			return { cls: 'bg-brand-green text-white', glyph: '✓' };
		case 'em_andamento':
			return { cls: 'bg-blue-600 text-white', glyph: '→' };
		case 'atrasado':
			return { cls: 'bg-brand-danger text-white', glyph: '!' };
		default:
			return { cls: 'bg-grey-200/50 text-grey', glyph: '·' };
	}
}

export const PROCESSO_SITUACAO = [
	{ value: 'ativo', label: 'Ativo' },
	{ value: 'atrasado', label: 'Atrasado' },
	{ value: 'devolvido', label: 'Devolvido' },
	{ value: 'concluido', label: 'Concluído' }
] as const;

export function situacaoTone(situacao: string): BadgeTone {
	switch (situacao) {
		case 'concluido':
			return 'success';
		case 'atrasado':
			return 'danger';
		case 'devolvido':
			return 'warning';
		default:
			return 'info';
	}
}

export function situacaoLabel(situacao: string): string {
	return PROCESSO_SITUACAO.find((s) => s.value === situacao)?.label ?? situacao;
}

/** Mapa de etapas padrão (todas pendentes) para um processo novo. */
export function etapasPadrao(): EtapasMap {
	return Object.fromEntries(PROCESSO_ETAPAS.map((e) => [e.key, 'pendente'])) as EtapasMap;
}

function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

const STATUS_VALIDOS = new Set<string>(ETAPA_STATUS.map((s) => s.value));
const SITUACAO_VALIDA = new Set<string>(PROCESSO_SITUACAO.map((s) => s.value));

export function processoFromForm(fd: FormData) {
	const etapas: EtapasMap = {};
	for (const e of PROCESSO_ETAPAS) {
		const v = str(fd, `etapa_${e.key}`);
		etapas[e.key] = (v && STATUS_VALIDOS.has(v) ? v : 'pendente') as EtapaStatus;
	}
	const situacao = str(fd, 'situacao') ?? 'ativo';
	return {
		numero: str(fd, 'numero'),
		nome: str(fd, 'nome') ?? '',
		secretaria: str(fd, 'secretaria'),
		responsavel: str(fd, 'responsavel'),
		prazo: str(fd, 'prazo'),
		situacao: SITUACAO_VALIDA.has(situacao) ? situacao : 'ativo',
		etapas
	};
}
