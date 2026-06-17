export { formatBRL } from './clientes';

export const TRANSACAO_TIPO = [
	{ value: 'receita', label: 'Receita' },
	{ value: 'despesa', label: 'Despesa' }
] as const;

export const TRANSACAO_STATUS = [
	{ value: 'previsto', label: 'Previsto' },
	{ value: 'pago', label: 'Pago' },
	{ value: 'atrasado', label: 'Atrasado' }
] as const;

export function statusStyle(status: string): { bg: string; fg: string } {
	switch (status) {
		case 'pago':
			return { bg: '#e6f4ea', fg: '#1e7e34' };
		case 'previsto':
			return { bg: '#fff4d6', fg: '#8a6500' };
		case 'atrasado':
			return { bg: '#fde2e3', fg: '#b3000a' };
		default:
			return { bg: '#eeeeee', fg: '#333333' };
	}
}

export function statusLabel(status: string): string {
	return TRANSACAO_STATUS.find((s) => s.value === status)?.label ?? status;
}

export function tipoLabel(tipo: string): string {
	return TRANSACAO_TIPO.find((t) => t.value === tipo)?.label ?? tipo;
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

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

export function transacaoFromForm(fd: FormData) {
	return {
		tipo: str(fd, 'tipo') ?? 'receita',
		categoria: str(fd, 'categoria'),
		descricao: str(fd, 'descricao'),
		valor: num(fd, 'valor') ?? 0,
		cliente_id: str(fd, 'cliente_id'),
		recorrente: fd.get('recorrente') !== null,
		data_competencia: str(fd, 'data_competencia') ?? today(),
		data_pagamento: str(fd, 'data_pagamento'),
		status: str(fd, 'status') ?? 'previsto'
	};
}
