export const FUNCAO = [
	{ value: 'ceo', label: 'Diretor Executivo', sigla: 'CEO' },
	{ value: 'admin', label: 'Administrador', sigla: 'ADM' },
	{ value: 'comercial', label: 'Comercial', sigla: 'SDR' },
	{ value: 'social_media', label: 'Social Media', sigla: 'SM' },
	{ value: 'digital_creator', label: 'Digital Creator', sigla: 'DC' },
	{ value: 'growth_manager', label: 'Growth Manager', sigla: 'GM' }
] as const;

export function funcaoLabel(funcao: string): string {
	return FUNCAO.find((f) => f.value === funcao)?.label ?? funcao;
}

/** Sigla do cargo (para a bandeirinha ao lado do nome). */
export function funcaoSigla(funcao: string | null | undefined): string | null {
	return FUNCAO.find((f) => f.value === funcao)?.sigla ?? null;
}

function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

export function colaboradorFromForm(fd: FormData) {
	// Custo/hora vem de <input type="number">: já em formato canônico (ponto decimal).
	const custoRaw = str(fd, 'custo_hora');
	const custoNum = custoRaw === null ? null : Number(custoRaw);
	return {
		nome: str(fd, 'nome') ?? '',
		email: str(fd, 'email') ?? '',
		funcao: str(fd, 'funcao') ?? 'social_media',
		custo_hora: custoNum !== null && Number.isNaN(custoNum) ? null : custoNum,
		ativo: fd.get('ativo') !== null
	};
}
