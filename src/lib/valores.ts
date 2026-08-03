// Sigilo dos valores em R$ de cliente, plano e contrato.
//
// Quem não tem o módulo 'valores' (na prática: quem não é CEO/ADM, salvo
// liberação na tela de Permissões) não vê esses números em lugar nenhum — e
// não os recebe do servidor, então nem no __data.json da navegação eles vazam.
// A máscara é só o que sobra na tela.
import { podeVer, type Permissoes } from '$lib/permissoes';
import { formatBRL } from '$lib/clientes';

/** O que aparece no lugar do valor para quem não pode vê-lo. */
export const VALOR_MASCARA = '*****';

export function podeVerValores(perms: Permissoes | undefined | null): boolean {
	return podeVer(perms, 'valores');
}

/** Formata em R$ ou devolve a máscara. Use SEMPRE que exibir um valor sigiloso. */
export function valorBRL(valor: number | null | undefined, pode: boolean): string {
	return pode ? formatBRL(valor) : VALOR_MASCARA;
}

/**
 * Tira os campos de valor de um payload de update. Sem isto, quem não pode ver
 * valores salvaria o campo vazio que o formulário mandou por cima do número
 * real — um usuário sem acesso zeraria o MRR do cliente só ao corrigir o
 * telefone dele. Ausente do payload = coluna intocada no banco.
 */
export function preservarValores<T extends Record<string, unknown>>(
	values: T,
	pode: boolean,
	...campos: (keyof T)[]
): Partial<T> {
	if (pode) return values;
	const copia: Partial<T> = { ...values };
	for (const c of campos) delete copia[c];
	return copia;
}

/**
 * Apaga o valor de uma coluna nas linhas que vão para o cliente. Chame no load
 * quando `pode` for false — mascarar só na UI deixaria o número no payload.
 */
export function ocultarValores<T extends Record<string, unknown>>(
	linhas: T[],
	pode: boolean,
	...colunas: (keyof T)[]
): T[] {
	if (pode) return linhas;
	return linhas.map((l) => {
		const copia = { ...l };
		for (const c of colunas) copia[c] = null as T[keyof T];
		return copia;
	});
}
