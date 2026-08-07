import { num, str as campo } from '$lib/form';

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

/**
 * Traduz o erro cru do Postgres quando uma coluna do cadastro ainda não existe.
 * Sem isto o usuário vê "column clientes.logo_url does not exist" e não tem como
 * saber que o que falta é rodar uma migration.
 */
export function erroDeMigration(msg: string): string | null {
	if (/logo_url/.test(msg)) {
		return 'A foto do cliente ainda não foi ativada. Aplique a migration 0044_cliente_logo.sql no Supabase.';
	}
	if (/does not exist|column|schema cache|relation/i.test(msg)) {
		return 'Módulo ainda não ativado. Aplique a migration 0006_administrativo.sql no Supabase.';
	}
	return null;
}

export function formatBRL(value: number | null | undefined): string {
	return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

/** Normaliza os campos do formulário (unificado) de cliente vindos de FormData. */
export function clienteFromForm(fd: FormData) {
	const str = (k: string) => campo(fd, k);
	const numero = (k: string) => num(fd, k);
	// Responsáveis (multi): checkboxes name="responsaveis_ids". O single
	// responsavel_id espelha o primeiro, mantendo compat com as consultas.
	const responsaveis_ids = fd
		.getAll('responsaveis_ids')
		.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
	return {
		// Geral
		nome: str('nome') ?? '',
		status: str('status') ?? 'lead',
		// URL já no Storage quando o form foi enviado (upload acontece na hora de
		// escolher o arquivo). Vazio = sem foto / foto removida.
		logo_url: str('logo_url'),
		razao_social: str('razao_social'),
		cnpj_cpf: str('cnpj_cpf'),
		segmento: str('segmento'),
		responsavel_id: responsaveis_ids[0] ?? null,
		responsaveis_ids,
		data_inicio: str('data_inicio'),
		// Contato
		contato_nome: str('contato_nome'),
		contato_email: str('contato_email'),
		contato_whatsapp: str('contato_whatsapp'),
		contato_financeiro: str('contato_financeiro'),
		contato_financeiro_email: str('contato_financeiro_email'),
		contato_financeiro_whatsapp: str('contato_financeiro_whatsapp'),
		contato_operacao: str('contato_operacao'),
		contato_operacao_email: str('contato_operacao_email'),
		contato_operacao_whatsapp: str('contato_operacao_whatsapp'),
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
