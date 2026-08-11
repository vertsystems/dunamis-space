import { num, str as campo } from '$lib/form';

// Prospecção mora no Comercial/CRM: quem está no cadastro de clientes já é
// cliente. Daí a lista não ter 'lead'.
export const CLIENTE_STATUS = [
	{ value: 'ativo', label: 'Ativo' },
	{ value: 'standby', label: 'Stand-by' },
	{ value: 'pausado', label: 'Pausado' },
	{ value: 'inativo', label: 'Inativo' }
] as const;

export type ClienteStatus = (typeof CLIENTE_STATUS)[number]['value'];

/** Tom do selo de status para o componente <Badge>. */
export function statusTone(
	status: string
): 'success' | 'warning' | 'neutral' | 'danger' {
	switch (status) {
		case 'ativo':
			return 'success';
		case 'standby':
			return 'warning';
		case 'inativo':
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

/** Um endereço da lista do cliente (matriz, filial, loja...). */
export type ClienteEndereco = {
	/** Como a equipe chama o lugar: "Matriz", "Loja Centro". */
	apelido: string;
	endereco: string;
	cidade: string;
	estado: string;
	cep: string;
};

const ENDERECO_CAMPOS = [
	['apelido', 'end_apelido'],
	['endereco', 'end_logradouro'],
	['cidade', 'end_cidade'],
	['estado', 'end_uf'],
	['cep', 'end_cep']
] as const;

/**
 * Monta a lista de endereços a partir dos campos repetidos do formulário.
 *
 * Cada campo vem como um array paralelo (`getAll`), na ordem em que aparece na
 * tela — o índice é o que liga apelido, rua, cidade, UF e CEP do mesmo bloco.
 * Bloco totalmente em branco não vira endereço: é a linha vazia que o form
 * sempre mostra para quem ainda não digitou nada.
 */
export function enderecosFromForm(fd: FormData): ClienteEndereco[] {
	const coluna = (campo: string) =>
		fd.getAll(campo).map((x) => (typeof x === 'string' ? x.trim() : ''));

	const colunas = Object.fromEntries(
		ENDERECO_CAMPOS.map(([chave, campo]) => [chave, coluna(campo)])
	) as Record<keyof ClienteEndereco, string[]>;

	const linhas = Math.max(...Object.values(colunas).map((c) => c.length), 0);
	const lista: ClienteEndereco[] = [];
	for (let i = 0; i < linhas; i++) {
		const item = {
			apelido: colunas.apelido[i] ?? '',
			endereco: colunas.endereco[i] ?? '',
			cidade: colunas.cidade[i] ?? '',
			estado: colunas.estado[i] ?? '',
			cep: colunas.cep[i] ?? ''
		};
		if (Object.values(item).some((valor) => valor !== '')) lista.push(item);
	}
	return lista;
}

/** Resumo de uma linha em uma linha só, para listas e selos. */
export function enderecoResumo(e: ClienteEndereco): string {
	const local = [e.cidade, e.estado].filter(Boolean).join('/');
	return [e.endereco, local, e.cep].filter(Boolean).join(' · ');
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
	const enderecos = enderecosFromForm(fd);
	const primeiro = enderecos[0];
	return {
		// Geral
		nome: str('nome') ?? '',
		status: str('status') ?? 'ativo',
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
		// Endereço: a lista é a fonte da verdade; as quatro colunas antigas
		// espelham o primeiro item para não quebrar quem ainda lê elas.
		enderecos,
		endereco: primeiro?.endereco || null,
		cidade: primeiro?.cidade || null,
		estado: primeiro?.estado || null,
		cep: primeiro?.cep || null,
		// Financeiro
		plano_ref: str('plano_ref'),
		forma_pagamento: str('forma_pagamento'),
		mrr: numero('mrr'),
		dia_vencimento: numero('dia_vencimento'),
		observacoes: str('observacoes')
	};
}
