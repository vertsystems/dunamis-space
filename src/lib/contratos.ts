export { formatBRL } from './clientes';

export const CONTRATO_STATUS = [
	{ value: 'ativo', label: 'Ativo' },
	{ value: 'suspenso', label: 'Suspenso' },
	{ value: 'encerrado', label: 'Encerrado' }
] as const;

export function contratoStatusStyle(status: string): { bg: string; fg: string } {
	switch (status) {
		case 'ativo':
			return { bg: '#e6f4ea', fg: '#1e7e34' };
		case 'suspenso':
			return { bg: '#fff4d6', fg: '#8a6500' };
		case 'encerrado':
			return { bg: '#eeeeee', fg: '#555555' };
		default:
			return { bg: '#eeeeee', fg: '#333333' };
	}
}

export function contratoStatusLabel(status: string): string {
	return CONTRATO_STATUS.find((s) => s.value === status)?.label ?? status;
}

function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

function num(fd: FormData, k: string): number | null {
	const s = str(fd, k);
	return s === null ? null : Number(s.replace(/\./g, '').replace(',', '.'));
}

function int(fd: FormData, k: string): number | null {
	const s = str(fd, k);
	return s === null ? null : parseInt(s, 10);
}

export function planoFromForm(fd: FormData) {
	return {
		nome: str(fd, 'nome') ?? '',
		descricao: str(fd, 'descricao'),
		valor_mensal: num(fd, 'valor_mensal') ?? 0,
		limite_posts: int(fd, 'limite_posts'),
		limite_stories: int(fd, 'limite_stories'),
		limite_reels: int(fd, 'limite_reels'),
		ativo: fd.get('ativo') !== null
	};
}

export function contratoFromForm(fd: FormData) {
	return {
		cliente_id: str(fd, 'cliente_id'),
		plano_id: str(fd, 'plano_id'),
		valor_mensal: num(fd, 'valor_mensal') ?? 0,
		data_inicio: str(fd, 'data_inicio'),
		data_fim: str(fd, 'data_fim'),
		status: str(fd, 'status') ?? 'ativo',
		renovacao_automatica: fd.get('renovacao_automatica') !== null
	};
}
