// Pag's Up — carregamento do gerador de planilhas e tradução dos erros.
//
// O excel.ts entra por import dinâmico (o exceljs pesa ~271 KB gzip e não deve
// descer só por abrir o Pag's Up). O efeito colateral é que uma aba aberta
// desde ANTES do último deploy aponta para um chunk que não existe mais no
// servidor: o import falha e, com um `catch` mudo, isso chegava ao usuário como
// "Falha ao gerar a planilha" — sem dizer que bastava recarregar a página.

/** Erro que já tem uma mensagem pronta para mostrar ao usuário. */
export class ExportError extends Error {}

/** True para a falha de rede/404 típica de chunk de um deploy antigo. */
function ehChunkVelho(e: unknown): boolean {
	const msg = e instanceof Error ? e.message : String(e);
	return /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg);
}

/** Importa o gerador de planilhas, distinguindo "app desatualizado" de erro real. */
export async function carregarExcel(): Promise<typeof import('./excel')> {
	try {
		return await import('./excel');
	} catch (e) {
		console.error('[pagsup] carregar excel', e);
		if (ehChunkVelho(e)) {
			throw new ExportError(
				'O sistema foi atualizado nesta aba. Recarregue a página (Ctrl+F5) e gere de novo.'
			);
		}
		throw e;
	}
}

/**
 * Mensagem de toast para uma falha de exportação. Mostra a causa em vez de
 * engolir tudo num "Falha ao gerar a planilha" — sem isso não há como saber, do
 * lado de cá, o que deu errado na máquina de quem usa.
 */
export function erroExport(e: unknown): string {
	console.error('[pagsup] gerar planilha', e);
	if (e instanceof ExportError) return e.message;
	const msg = e instanceof Error ? e.message : String(e);
	return msg ? `Falha ao gerar a planilha: ${msg}` : 'Falha ao gerar a planilha.';
}
