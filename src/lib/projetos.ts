export { formatBRL } from './clientes';

export const PROJETO_TIPO = [
	{ value: 'social_media', label: 'Social media' },
	{ value: 'design', label: 'Design' },
	{ value: 'trafego', label: 'Tráfego pago' },
	{ value: 'impresso', label: 'Impresso' },
	{ value: 'site', label: 'Site' },
	{ value: 'outro', label: 'Outro' }
] as const;

export const PROJETO_STATUS = [
	{ value: 'em_andamento', label: 'Em andamento' },
	{ value: 'aguardando_cliente', label: 'Aguardando cliente' },
	{ value: 'em_aprovacao', label: 'Em aprovação' },
	{ value: 'finalizado', label: 'Finalizado' }
] as const;

export function projetoStatusTone(
	status: string
): 'info' | 'warning' | 'brand' | 'success' | 'neutral' {
	switch (status) {
		case 'em_andamento':
			return 'info';
		case 'aguardando_cliente':
			return 'warning';
		case 'em_aprovacao':
			return 'brand';
		case 'finalizado':
			return 'success';
		default:
			return 'neutral';
	}
}

export function projetoStatusLabel(status: string): string {
	return PROJETO_STATUS.find((s) => s.value === status)?.label ?? status;
}

export function projetoTipoLabel(tipo: string): string {
	return PROJETO_TIPO.find((t) => t.value === tipo)?.label ?? tipo;
}

function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

export function projetoFromForm(fd: FormData) {
	const valor = str(fd, 'valor');
	return {
		cliente_id: str(fd, 'cliente_id'),
		responsavel_id: str(fd, 'responsavel_id'),
		nome: str(fd, 'nome') ?? '',
		descricao: str(fd, 'descricao'),
		tipo: str(fd, 'tipo') ?? 'social_media',
		status: str(fd, 'status') ?? 'em_andamento',
		recorrente: fd.get('recorrente') !== null,
		valor: valor === null ? null : Number(valor.replace(/\./g, '').replace(',', '.')),
		data_inicio: str(fd, 'data_inicio'),
		prazo: str(fd, 'prazo')
	};
}
