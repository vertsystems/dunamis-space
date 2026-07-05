// Cada cargo tem sua cor de bandeirinha (gradiente + borda um tom mais escura).
export const FUNCAO = [
	{ value: 'ceo', label: 'Diretor Executivo', sigla: 'CEO', grad: 'linear-gradient(135deg, #b8860b 0%, #f5d67b 45%, #c99a2e 100%)', borda: '#a5761a' },
	{ value: 'admin', label: 'Administrador', sigla: 'ADM', grad: 'linear-gradient(135deg, #dc2626 0%, #f87171 50%, #ef4444 100%)', borda: '#991b1b' },
	{ value: 'comercial', label: 'Comercial', sigla: 'SDR', grad: 'linear-gradient(135deg, #6b4423 0%, #a97142 50%, #855a34 100%)', borda: '#5a3a1e' },
	{ value: 'social_media', label: 'Social Media', sigla: 'SM', grad: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 50%, #7c3aed 100%)', borda: '#5b21b6' },
	{ value: 'digital_creator', label: 'Digital Creator', sigla: 'DC', grad: 'linear-gradient(135deg, #0abab5 0%, #7fe9e2 50%, #26c6bf 100%)', borda: '#0a908b' },
	{ value: 'growth_manager', label: 'Growth Manager', sigla: 'GM', grad: 'linear-gradient(135deg, #172554 0%, #2f4bce 50%, #1e3a8a 100%)', borda: '#0f1d4a' },
	{ value: 'financeiro', label: 'Financeiro', sigla: 'FIN', grad: 'linear-gradient(135deg, #15803d 0%, #4ade80 50%, #16a34a 100%)', borda: '#166534' },
	{ value: 'videomaker', label: 'Videomaker', sigla: 'VM', grad: 'linear-gradient(135deg, #c2410c 0%, #fb923c 50%, #ea580c 100%)', borda: '#9a3412' }
] as const;

export function funcaoLabel(funcao: string): string {
	return FUNCAO.find((f) => f.value === funcao)?.label ?? funcao;
}

/** Sigla do cargo (para a bandeirinha ao lado do nome). */
export function funcaoSigla(funcao: string | null | undefined): string | null {
	return FUNCAO.find((f) => f.value === funcao)?.sigla ?? null;
}

/** Estilo inline (gradiente + borda) da bandeirinha por cargo. */
export function funcaoStyle(funcao: string | null | undefined): string | null {
	const f = FUNCAO.find((x) => x.value === funcao);
	return f ? `background: ${f.grad}; border-color: ${f.borda};` : null;
}

const FUNCOES_VALIDAS = new Set<string>(FUNCAO.map((f) => f.value));

/** Funções marcadas no formulário (checkbox múltiplo name="funcoes"), validadas. */
export function funcoesFromForm(fd: FormData): string[] {
	return fd.getAll('funcoes').filter((v): v is string => typeof v === 'string' && FUNCOES_VALIDAS.has(v));
}

/** Lista de funções de um colaborador; cai p/ [funcao] em registros antigos. */
export function funcoesDe(
	c: { funcoes?: string[] | null; funcao?: string | null } | null | undefined
): string[] {
	return c?.funcoes?.length ? c.funcoes : c?.funcao ? [c.funcao] : [];
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
	// Funções multi; compat com forms de função única (name="funcao").
	let funcoes = funcoesFromForm(fd);
	const funcaoUnica = str(fd, 'funcao');
	if (funcoes.length === 0 && funcaoUnica) funcoes = [funcaoUnica];
	return {
		nome: str(fd, 'nome') ?? '',
		email: str(fd, 'email') ?? '',
		funcao: funcoes[0] ?? 'social_media', // enum single = primeira (compat)
		funcoes,
		custo_hora: custoNum !== null && Number.isNaN(custoNum) ? null : custoNum,
		ativo: fd.get('ativo') !== null
	};
}
