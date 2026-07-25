import { str } from '$lib/form';
export const CONTEUDO_TIPO = [
	{ value: 'feed', label: 'Feed' },
	{ value: 'reels', label: 'Reels' },
	{ value: 'carrossel', label: 'Carrossel' },
	{ value: 'story', label: 'Story' }
] as const;

// Fluxo de status do conteúdo, agrupado em três estágios (A fazer / Em andamento / Concluídos).
export const CONTEUDO_STATUS = [
	// A fazer
	{ value: 'escrever_conteudo', label: 'Escrever conteúdo', grupo: 'A fazer' },
	{ value: 'ideia', label: 'Ideia', grupo: 'A fazer' },
	{ value: 'aguardando_material', label: 'Aguardando material', grupo: 'A fazer' },
	{ value: 'pausar_material', label: 'PAUSAR MATERIAL', grupo: 'A fazer' },
	// Em andamento
	{ value: 'editar_video', label: 'Editar vídeo', grupo: 'Em andamento' },
	{ value: 'gravar_video', label: 'Gravar vídeo', grupo: 'Em andamento' },
	{ value: 'criar_design', label: 'Criar design', grupo: 'Em andamento' },
	{ value: 'aprovar_roteiro', label: 'Aprovar roteiro', grupo: 'Em andamento' },
	{ value: 'aprovar_conteudo', label: 'Aprovar conteúdo', grupo: 'Em andamento' },
	{ value: 'programado_parcial', label: 'Programado parcial', grupo: 'Em andamento' },
	{ value: 'programado', label: 'Programado', grupo: 'Em andamento' },
	// Concluídos
	{ value: 'programar', label: 'Programar', grupo: 'Concluídos' },
	{ value: 'programar_feed', label: 'Programar Feed', grupo: 'Concluídos' },
	{ value: 'programar_stories', label: 'Programar Stories', grupo: 'Concluídos' },
	{ value: 'programar_reels', label: 'Programar Reels', grupo: 'Concluídos' },
	{ value: 'publicado', label: 'Publicado', grupo: 'Concluídos' }
] as const;

export const CONTEUDO_STATUS_GRUPOS = ['A fazer', 'Em andamento', 'Concluídos'].map((grupo) => ({
	grupo,
	itens: CONTEUDO_STATUS.filter((s) => s.grupo === grupo)
}));

/** Status inicial de um novo conteúdo. */
export const CONTEUDO_STATUS_PADRAO = 'ideia';

// Redes sociais do post (cross-post — um post pode ter mais de uma).
export const CONTEUDO_REDE = [
	{ value: 'instagram', label: 'Instagram' },
	{ value: 'tiktok', label: 'TikTok' }
] as const;

const TIPOS_VALIDOS = new Set(CONTEUDO_TIPO.map((t) => t.value as string));

/** Extrai os tipos marcados do formulário (checkbox múltiplo name="tipos"), validando. */
export function tiposFromForm(fd: FormData): string[] {
	return fd
		.getAll('tipos')
		.filter((v): v is string => typeof v === 'string' && TIPOS_VALIDOS.has(v));
}

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
): 'neutral' | 'warning' | 'info' | 'brand' | 'success' | 'danger' {
	switch (status) {
		// A fazer (vermelho)
		case 'escrever_conteudo':
		case 'ideia':
		case 'aguardando_material':
		case 'pausar_material':
			return 'danger';
		// Em andamento — produção (rosa/brand)
		case 'editar_video':
		case 'gravar_video':
		case 'criar_design':
			return 'brand';
		// Em andamento — aprovação/programação (azul)
		case 'aprovar_roteiro':
		case 'aprovar_conteudo':
		case 'programado_parcial':
		case 'programado':
			return 'info';
		// Concluídos — programar (laranja)
		case 'programar':
		case 'programar_feed':
		case 'programar_stories':
		case 'programar_reels':
			return 'warning';
		// Concluídos — publicado (verde)
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

export function conteudoFromForm(fd: FormData) {
	// Tipos multi-seleção; compat com forms de tipo único (name="tipo").
	let tipos = tiposFromForm(fd);
	const tipoUnico = str(fd, 'tipo');
	if (tipos.length === 0 && tipoUnico) tipos = [tipoUnico];
	return {
		cliente_id: str(fd, 'cliente_id'),
		campanha: str(fd, 'campanha'),
		projeto_id: str(fd, 'projeto_id'),
		responsavel_id: str(fd, 'responsavel_id'),
		tipo: tipos[0] ?? 'feed', // enum single = primeiro tipo (compat)
		tipos,
		titulo: str(fd, 'titulo'),
		legenda: str(fd, 'legenda'),
		arte_url: str(fd, 'arte_url'),
		data_publicacao: str(fd, 'data_publicacao'),
		status: str(fd, 'status') ?? CONTEUDO_STATUS_PADRAO,
		redes: redesFromForm(fd),
		publicado_manual: fd.get('publicado_manual') !== null
	};
}
