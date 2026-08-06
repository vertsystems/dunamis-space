// Pag's Up — tipos do domínio (portado do app React original).
// Sistema de gestão de pagamentos de marketing (carro de som, locução, rádios,
// influenciadores, negociações mensais) por cliente.

export type ServiceType = 'Carros e Veículos de Som' | 'Locução Loja' | string;

export interface Client {
	id: string;
	name: string;
}

export interface Provider {
	id: string;
	clientId?: string;
	name: string;
	service: ServiceType;
	region: string;
	defaultPrice: number;
	cpf?: string;
	pix?: string;
	/** Telefone de contato (WhatsApp). Separado do pix: chave Pix nem sempre é telefone. */
	whatsapp?: string;
	/**
	 * O que faz dentro da categoria (ex.: "Pintura Facial" em Eventos Indoor).
	 * `service` agrupa; esta descreve. Vazia = a própria categoria já descreve.
	 */
	especialidade?: string;
	/** Sigla da unidade onde o trabalho é feito (LJ) — ver LOJAS. */
	lj?: string;
}

export interface ScheduledService {
	id: string;
	clientId?: string;
	providerId: string;
	date: string;
	price: number | '';
	notes?: string;
}

/**
 * Negociação fixa na lista mensal. Diferente do cronograma de prestadores, esta
 * lista NÃO zera: entra uma vez e fica até ser removida — são os serviços que se
 * repetem todo mês (rádio, agência, contratos).
 */
export interface ScheduledNegotiation {
	id: string;
	clientId?: string;
	negotiationId: string;
	date: string;
	price: number | '';
	notes?: string;
	/** Último mês (AAAA-MM) lançado na Planilha Mensal — evita fechar duas vezes. */
	closedMonth?: string;
}

/**
 * Pagamento já efetuado — o que alimenta a Planilha Mensal.
 * Nome/serviço/região ficam congelados no momento do registro: prestação de
 * contas não pode mudar porque o cadastro do prestador foi editado depois.
 */
export interface Payment {
	id: string;
	clientId: string;
	providerId?: string | null;
	providerName: string;
	service: string;
	region?: string;
	value: number;
	/** AAAA-MM-DD */
	date: string;
	notes?: string;
	/** LJ copiada do prestador no ato do registro (ver Provider.lj). */
	lj?: string;
}

export interface Negotiation {
	id: string;
	clientId?: string;
	company: string; // Empresa/Prestador
	service: string; // Serviço
	supplier: string; // Fornecedor
	contractValue: number; // Valor do Contrato
	pix: string; // Chave Pix
	region: string; // Cidade / Região
	dueDate: string; // DDV
}

/**
 * Unidades (LJ) onde o trabalho é executado. Não confundir com o cliente do
 * Pag's Up: um cliente (Lojas Mari) tem várias unidades.
 */
export const LOJAS = [
	{ sigla: 'CDP', nome: 'Centro de Distribuição – Piedade' },
	{ sigla: 'ADB', nome: 'Lojas Mari – Adhemar de Barros (Guarujá)' },
	{ sigla: 'PIT', nome: 'Lojas Mari – Pitangueiras (Guarujá)' },
	{ sigla: 'ENS', nome: 'Lojas Mari – Enseada (Guarujá)' },
	{ sigla: 'REG1', nome: 'Lojas Mari – Registro 1' },
	{ sigla: 'REG2', nome: 'Lojas Mari – Registro 2' },
	{ sigla: 'PIE', nome: 'Lojas Mari – Piedade' },
	{ sigla: 'IBI', nome: 'Lojas Mari – Ibiúna' },
	{ sigla: 'PIL', nome: 'Lojas Mari – Pilar do Sul' },
	{ sigla: 'ANG', nome: 'Lojas Mari – Angatuba' },
	{ sigla: 'CAP', nome: 'Lojas Mari – Capela do Alto' },
	{ sigla: 'SAL', nome: 'Lojas Mari – Salto de Pirapora' },
	{ sigla: 'JUQ', nome: 'Lojas Mari – Juquiá' }
] as const;

/** Nome por extenso de uma sigla (para tooltip/legenda). */
export function lojaNome(sigla: string | undefined | null): string {
	return LOJAS.find((l) => l.sigla === sigla)?.nome ?? '';
}

/** Categorias de serviço usadas nos selects e na cor dos chips. */
export const SERVICE_CATEGORIES = [
	'Carros e Veículos de Som',
	'Locução Loja',
	'Influenciadores',
	'Gráficas',
	'Serviços',
	'Outros Serviços'
] as const;

/** Resumo mostrado no bloco do Pag's Up na Visão Geral (só leitura). */
export type PagsupResumo = {
	/** Soma dos pagamentos registrados no mês corrente. */
	pagoMes: number;
	/** Soma do cronograma dos próximos 7 dias. */
	aPagar7: number;
	/** Serviços agendados no mês (cronograma). */
	servicosMes: number;
	proximos: { id: string; data: string; nome: string; servico: string; valor: number | null }[];
};
