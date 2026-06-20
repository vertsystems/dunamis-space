export const CLIENTE_STATUS = [
	{ value: 'lead', label: 'Lead' },
	{ value: 'ativo', label: 'Ativo' },
	{ value: 'pausado', label: 'Pausado' },
	{ value: 'cancelado', label: 'Cancelado' }
] as const;

export type ClienteStatus = (typeof CLIENTE_STATUS)[number]['value'];

/** Tom do selo de status para o componente <Badge>. */
export function statusTone(
	status: string
): 'success' | 'warning' | 'neutral' | 'danger' {
	switch (status) {
		case 'ativo':
			return 'success';
		case 'lead':
			return 'warning';
		case 'cancelado':
			return 'danger';
		default:
			return 'neutral';
	}
}

export function statusLabel(status: string): string {
	return CLIENTE_STATUS.find((s) => s.value === status)?.label ?? status;
}

export function formatBRL(value: number | null | undefined): string {
	return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

/** Normaliza os campos do formulário de cliente vindos de FormData. */
export function clienteFromForm(fd: FormData) {
	const str = (k: string) => {
		const v = fd.get(k);
		const s = typeof v === 'string' ? v.trim() : '';
		return s === '' ? null : s;
	};
	const mrrRaw = str('mrr');
	return {
		nome: str('nome') ?? '',
		razao_social: str('razao_social'),
		cnpj_cpf: str('cnpj_cpf'),
		segmento: str('segmento'),
		contato_nome: str('contato_nome'),
		contato_email: str('contato_email'),
		contato_whatsapp: str('contato_whatsapp'),
		status: str('status') ?? 'lead',
		responsavel_id: str('responsavel_id'),
		data_inicio: str('data_inicio'),
		mrr: mrrRaw === null ? null : Number(mrrRaw.replace(/\./g, '').replace(',', '.')),
		observacoes: str('observacoes')
	};
}
