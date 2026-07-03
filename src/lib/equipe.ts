export const FUNCAO = [
	{ value: 'admin', label: 'Administrador' },
	{ value: 'gestor', label: 'Gestor' },
	{ value: 'social_media', label: 'Social media' },
	{ value: 'designer', label: 'Designer' },
	{ value: 'trafego', label: 'Tráfego' }
] as const;

export function funcaoLabel(funcao: string): string {
	return FUNCAO.find((f) => f.value === funcao)?.label ?? funcao;
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
