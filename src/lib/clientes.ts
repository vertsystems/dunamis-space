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

/** Normaliza os campos do formulário (unificado) de cliente vindos de FormData. */
export function clienteFromForm(fd: FormData) {
	const str = (k: string) => {
		const v = fd.get(k);
		const s = typeof v === 'string' ? v.trim() : '';
		return s === '' ? null : s;
	};
	// Números de <input type="number">: já vêm com ponto decimal.
	const numero = (k: string) => {
		const s = str(k);
		if (s === null) return null;
		const n = Number(s);
		return Number.isNaN(n) ? null : n;
	};
	return {
		// Geral
		nome: str('nome') ?? '',
		status: str('status') ?? 'lead',
		razao_social: str('razao_social'),
		cnpj_cpf: str('cnpj_cpf'),
		segmento: str('segmento'),
		responsavel_id: str('responsavel_id'),
		data_inicio: str('data_inicio'),
		// Contato
		contato_nome: str('contato_nome'),
		contato_email: str('contato_email'),
		contato_whatsapp: str('contato_whatsapp'),
		contato_financeiro: str('contato_financeiro'),
		contato_financeiro_email: str('contato_financeiro_email'),
		contato_financeiro_whatsapp: str('contato_financeiro_whatsapp'),
		// Endereço
		endereco: str('endereco'),
		cidade: str('cidade'),
		estado: str('estado'),
		cep: str('cep'),
		// Financeiro
		plano_ref: str('plano_ref'),
		forma_pagamento: str('forma_pagamento'),
		mrr: numero('mrr'),
		dia_vencimento: numero('dia_vencimento'),
		observacoes: str('observacoes')
	};
}
