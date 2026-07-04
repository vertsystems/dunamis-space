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

// Redes sociais do post (cross-post — um post pode ter mais de uma).
export const CONTEUDO_REDE = [
	{ value: 'instagram', label: 'Instagram' },
	{ value: 'tiktok', label: 'TikTok' }
] as const;

const REDES_VALIDAS = new Set(CONTEUDO_REDE.map((r) => r.value as string));

export function conteudoRedeLabel(rede: string): string {
	return CONTEUDO_REDE.find((r) => r.value === rede)?.label ?? rede;
}

/** Extrai as redes marcadas do formulário (checkbox múltiplo name="redes"), validando. */
export function redesFromForm(fd: FormData): string[] {
	return fd
		.getAll('redes')
		.filter((v): v is string => typeof v === 'string' && REDES_VALIDAS.has(v));
}

export function conteudoStatusTone(
	status: string
): 'neutral' | 'warning' | 'info' | 'brand' | 'success' {
	switch (status) {
		case 'em_aprovacao':
			return 'warning';
		case 'aprovado':
			return 'info';
		case 'programado':
			return 'brand';
		case 'publicado':
			return 'success';
		default:
			return 'neutral';
	}
}

export function conteudoStatusLabel(status: string): string {
	return CONTEUDO_STATUS.find((s) => s.value === status)?.label ?? status;
}

export function conteudoTipoLabel(tipo: string): string {
	return CONTEUDO_TIPO.find((t) => t.value === tipo)?.label ?? tipo;
}

export const APROVACAO_STATUS = [
	{ value: 'pendente', label: 'Aguardando cliente' },
	{ value: 'aprovado', label: 'Aprovado' },
	{ value: 'alteracao_solicitada', label: 'Alteração solicitada' }
] as const;

export function aprovacaoStatusTone(status: string): 'warning' | 'success' | 'danger' | 'neutral' {
	switch (status) {
		case 'pendente':
			return 'warning';
		case 'aprovado':
			return 'success';
		case 'alteracao_solicitada':
			return 'danger';
		default:
			return 'neutral';
	}
}

export function aprovacaoStatusLabel(status: string): string {
	return APROVACAO_STATUS.find((s) => s.value === status)?.label ?? status;
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
		redes: redesFromForm(fd),
		publicado_manual: fd.get('publicado_manual') !== null
	};
}
