// Vault do cliente — acessos (login/senha) guardados dentro da área de cada
// cliente. Ao contrário de Ferramentas & Contas, que é a visão da agência, este
// cofre não aparece em nenhuma outra tela: é do cliente e fica no cliente.
//
// A senha é gravada em texto no banco; quem protege é o módulo de permissão
// 'vault' (RLS na 0051) — ver o cliente NÃO implica ver o cofre dele.
import { str } from '$lib/form';
import { sanitizarHtml } from '$lib/richtext';

export interface VaultItem {
	id: string;
	titulo: string;
	categoria: string | null;
	url: string | null;
	login: string | null;
	senha: string | null;
	observacoes: string | null;
	responsavel_id: string | null;
	posicao: number;
	updated_at: string | null;
}

/** Campos do formulário do cofre (compartilhados por criar e atualizar). */
export function vaultFromForm(fd: FormData) {
	return {
		titulo: str(fd, 'titulo'),
		categoria: str(fd, 'categoria'),
		url: str(fd, 'url'),
		login: str(fd, 'login'),
		senha: str(fd, 'senha'),
		// Observações vêm do editor de texto formatado: entra HTML, e ele é
		// higienizado na porta de entrada — nada de script/handler chega ao banco.
		observacoes: sanitizarHtml(str(fd, 'observacoes')),
		responsavel_id: str(fd, 'responsavel_id')
	};
}

/**
 * Categorias do cofre. Viraram uma lista fechada (`<select>`): como sugestão de
 * campo livre, o Chrome só oferecia o que casava com o texto já digitado — com
 * "Outros" preenchido, a edição parecia travada. Valor antigo fora desta lista
 * continua aparecendo no formulário (o VaultForm o acrescenta como opção).
 */
export const VAULT_CATEGORIAS = [
	'Redes sociais',
	'Anúncios',
	'Serviços',
	'Site / Hospedagem',
	'E-mail',
	'Analytics',
	'Loja / E-commerce',
	'Financeiro',
	'Outros'
];

/** URL clicável: aceita "cliente.com.br" sem protocolo, como as pessoas digitam. */
export function urlAbsoluta(url: string | null): string | null {
	if (!url) return null;
	const limpo = url.trim();
	if (!limpo) return null;
	return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

/** Domínio enxuto para exibir no lugar da URL inteira. */
export function urlCurta(url: string | null): string | null {
	const abs = urlAbsoluta(url);
	if (!abs) return null;
	try {
		return new URL(abs).host.replace(/^www\./, '');
	} catch {
		return url;
	}
}
