// Serviços & Ferramentas do cliente — o que ele contrata por fora da agência
// (Rádio Indoor, PDV, ERP, telefonia) e os logins de cada unidade.
//
// Diferença para o cofre (`vault.ts`): lá cada linha é uma conta solta. Aqui o
// serviço é a ficha (endereço único, fornecedor, suporte, custo) e os acessos
// são os logins pendurados nela — um por loja. Ver a ficha é do módulo
// 'servicos'; ver os logins continua sendo do módulo 'vault' (migration 0061).
import { str, num } from '$lib/form';

/** Um login de dentro de um serviço: "Loja Centro", "Matriz"… */
export interface ServicoAcesso {
	id: string;
	servico_id: string;
	rotulo: string;
	login: string | null;
	senha: string | null;
	url: string | null;
	observacoes: string | null;
	posicao: number;
}

/** A ficha do serviço, já com os acessos que o usuário pode ver. */
export interface ServicoItem {
	id: string;
	nome: string;
	categoria: string | null;
	url: string | null;
	fornecedor: string | null;
	suporte_contato: string | null;
	custo_mensal: number | null;
	responsavel_id: string | null;
	observacoes: string | null;
	posicao: number;
	updated_at: string | null;
	acessos: ServicoAcesso[];
}

/** O que o load devolve para a seção (e `null` para quem não tem o módulo). */
export interface ServicosData {
	itens: ServicoItem[];
	/** Migration 0061 ainda não rodou — a seção avisa em vez de dar erro. */
	pendente: boolean;
	erro: string | null;
	/** Quem pode ver/gravar os logins de dentro (módulo 'vault'). */
	podeVerAcessos: boolean;
}

/** Campos do formulário do serviço (compartilhados por criar e atualizar). */
export function servicoFromForm(fd: FormData) {
	return {
		nome: str(fd, 'nome'),
		categoria: str(fd, 'categoria'),
		url: str(fd, 'url'),
		fornecedor: str(fd, 'fornecedor'),
		suporte_contato: str(fd, 'suporte_contato'),
		custo_mensal: num(fd, 'custo_mensal'),
		responsavel_id: str(fd, 'responsavel_id'),
		observacoes: str(fd, 'observacoes')
	};
}

/**
 * Campos do formulário de um login do serviço.
 *
 * `servico_id` vem no próprio formulário (input hidden) e não da URL: a tela do
 * cliente tem vários serviços abertos ao mesmo tempo, e o corpo da requisição
 * só pode ser lido uma vez — a action não teria de onde tirá-lo depois.
 */
export function servicoAcessoFromForm(fd: FormData) {
	return {
		servico_id: str(fd, 'servico_id'),
		rotulo: str(fd, 'rotulo'),
		login: str(fd, 'login'),
		senha: str(fd, 'senha'),
		url: str(fd, 'url'),
		observacoes: str(fd, 'observacoes')
	};
}

/** Sugestões do campo Categoria (datalist) — só atalho, o campo é livre. */
export const SERVICO_CATEGORIAS = [
	'Rádio / Áudio',
	'PDV / Frente de caixa',
	'ERP / Gestão',
	'Site / Hospedagem',
	'E-commerce',
	'Telefonia / Internet',
	'Streaming / TV',
	'Segurança / Câmeras',
	'Delivery / Marketplace',
	'Outros'
];
