// Pag's Up — a ordem em que o lote do cronograma vira pagamento.

/**
 * Põe os itens na ordem em que o Cronograma os mostra: agrupados por serviço,
 * cada grupo na posição em que o serviço apareceu pela primeira vez e, dentro
 * do grupo, a ordem da lista.
 *
 * O "Finalizar" lança o lote num insert só, e o banco numera os pagamentos
 * (coluna `ordem`, migration 0070) na ordem das linhas. Sem isto o lote entraria
 * na ordem crua do array, que não é a da tela — e o painel do financeiro, que
 * lista por ordem de lançamento, mostraria a semana embaralhada.
 */
export function naOrdemDaTela<T>(itens: T[], servicoDe: (item: T) => string): T[] {
	const grupos = new Map<string, T[]>();
	for (const item of itens) {
		const servico = servicoDe(item);
		const grupo = grupos.get(servico);
		if (grupo) grupo.push(item);
		else grupos.set(servico, [item]);
	}
	return [...grupos.values()].flat();
}
