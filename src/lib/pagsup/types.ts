// Pag's Up — tipos do domínio (portado do app React original).
// Sistema de gestão de pagamentos de marketing (carro de som, locução, rádios,
// influenciadores, negociações mensais) por cliente.

export type ServiceType = 'Carro de Som' | 'Locução Loja' | string;

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
}

export interface ScheduledService {
	id: string;
	clientId?: string;
	providerId: string;
	date: string;
	price: number | '';
	notes?: string;
}

export interface ScheduledNegotiation {
	id: string;
	clientId?: string;
	negotiationId: string;
	date: string;
	price: number | '';
	notes?: string;
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

/** Categorias de serviço usadas nos selects e na cor dos chips. */
export const SERVICE_CATEGORIES = [
	'Carro de Som',
	'Locução Loja',
	'Influenciadores',
	'Gráficas',
	'Serviços',
	'Outros Serviços'
] as const;
