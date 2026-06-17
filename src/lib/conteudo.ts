export const CONTEUDO_TIPO = [
	{ value: 'feed', label: 'Feed' },
	{ value: 'reels', label: 'Reels' },
	{ value: 'carrossel', label: 'Carrossel' },
	{ value: 'story', label: 'Story' }
] as const;

export const CONTEUDO_STATUS = [
	{ value: 'rascunho', label: 'Rascunho' },
	{ value: 'em_aprovacao', label: 'Em aprovação' },
	{ value: 'aprovado', label: 'Aprovado' },
	{ value: 'programado', label: 'Programado' },
	{ value: 'publicado', label: 'Publicado' }
] as const;

export function conteudoStatusStyle(status: string): { bg: string; fg: string } {
	switch (status) {
		case 'rascunho':
			return { bg: '#eeeeee', fg: '#555555' };
		case 'em_aprovacao':
			return { bg: '#fff4d6', fg: '#8a6500' };
		case 'aprovado':
			return { bg: '#e6f1fb', fg: '#185fa5' };
		case 'programado':
			return { bg: '#f3e8ff', fg: '#6b21a8' };
		case 'publicado':
			return { bg: '#e6f4ea', fg: '#1e7e34' };
		default:
			return { bg: '#eeeeee', fg: '#333333' };
	}
}

export function conteudoStatusLabel(status: string): string {
	return CONTEUDO_STATUS.find((s) => s.value === status)?.label ?? status;
}

export function conteudoTipoLabel(tipo: string): string {
	return CONTEUDO_TIPO.find((t) => t.value === tipo)?.label ?? tipo;
}

function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

export function conteudoFromForm(fd: FormData) {
	return {
		cliente_id: str(fd, 'cliente_id'),
		projeto_id: str(fd, 'projeto_id'),
		responsavel_id: str(fd, 'responsavel_id'),
		tipo: str(fd, 'tipo') ?? 'feed',
		titulo: str(fd, 'titulo'),
		legenda: str(fd, 'legenda'),
		arte_url: str(fd, 'arte_url'),
		data_publicacao: str(fd, 'data_publicacao'),
		status: str(fd, 'status') ?? 'rascunho',
		publicado_manual: fd.get('publicado_manual') !== null
	};
}
