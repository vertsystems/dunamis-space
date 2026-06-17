export const TAREFA_STATUS = [
	{ value: 'backlog', label: 'Backlog' },
	{ value: 'fazendo', label: 'Fazendo' },
	{ value: 'em_aprovacao', label: 'Em aprovação' },
	{ value: 'concluido', label: 'Concluído' }
] as const;

export type TarefaStatus = (typeof TAREFA_STATUS)[number]['value'];

export const PRIORIDADE = [
	{ value: 'baixa', label: 'Baixa' },
	{ value: 'media', label: 'Média' },
	{ value: 'alta', label: 'Alta' }
] as const;

export function prioridadeStyle(p: string): { bg: string; fg: string } {
	switch (p) {
		case 'alta':
			return { bg: '#fde2e3', fg: '#b3000a' };
		case 'media':
			return { bg: '#fff4d6', fg: '#8a6500' };
		case 'baixa':
			return { bg: '#eeeeee', fg: '#555555' };
		default:
			return { bg: '#eeeeee', fg: '#333333' };
	}
}

export function prioridadeLabel(p: string): string {
	return PRIORIDADE.find((x) => x.value === p)?.label ?? p;
}

function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

export function tarefaFromForm(fd: FormData) {
	const est = str(fd, 'tempo_estimado');
	const gasto = str(fd, 'tempo_gasto');
	return {
		projeto_id: str(fd, 'projeto_id'),
		responsavel_id: str(fd, 'responsavel_id'),
		titulo: str(fd, 'titulo') ?? '',
		descricao: str(fd, 'descricao'),
		status: str(fd, 'status') ?? 'backlog',
		prioridade: str(fd, 'prioridade') ?? 'media',
		prazo: str(fd, 'prazo'),
		tempo_estimado: est === null ? null : Number(est.replace(',', '.')),
		tempo_gasto: gasto === null ? null : Number(gasto.replace(',', '.'))
	};
}
