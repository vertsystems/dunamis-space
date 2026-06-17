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

export function projetoStatusStyle(status: string): { bg: string; fg: string } {
	switch (status) {
		case 'em_andamento':
			return { bg: '#e6f1fb', fg: '#185fa5' };
		case 'aguardando_cliente':
			return { bg: '#fff4d6', fg: '#8a6500' };
		case 'em_aprovacao':
			return { bg: '#f3e8ff', fg: '#6b21a8' };
		case 'finalizado':
			return { bg: '#e6f4ea', fg: '#1e7e34' };
		default:
			return { bg: '#eeeeee', fg: '#333333' };
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
