// Faxina automática dos prints do SOS.
//
// A imagem só é útil enquanto o chamado está sendo resolvido; depois disso é
// peso morto no Storage. A rotina apaga TODOS os prints, menos os enviados nos
// últimos dias (ver DIAS_DE_GRACA) — e roda a cada 15 dias (ver vercel.json).
//
// Aqui só a decisão, sem I/O: é o que dá para testar sem banco nem rede.

/** Quanto tempo um print fica a salvo da faxina, contado do envio. */
export const DIAS_DE_GRACA = 2;

const DIA_MS = 86_400_000;

/** Um objeto do bucket, como o Storage lista. */
export type ObjetoStorage = { name: string; created_at: string };

/**
 * Quais objetos a faxina apaga.
 *
 * O corte é pela data do ARQUIVO, não do chamado: assim a limpeza também pega
 * imagem órfã — aquela que subiu e cujo chamado nunca chegou a ser gravado, ou
 * que ficou para trás numa exclusão que falhou no meio.
 */
export function objetosAApagar(
	objetos: ObjetoStorage[],
	agora: Date,
	diasDeGraca = DIAS_DE_GRACA
): string[] {
	const corte = agora.getTime() - diasDeGraca * DIA_MS;
	return objetos
		.filter((o) => {
			const t = Date.parse(o.created_at);
			// Data ilegível: não apaga. Errar para o lado de guardar demais é
			// barato; apagar o print de um chamado aberto, não.
			return Number.isFinite(t) && t < corte;
		})
		.map((o) => o.name);
}

/**
 * Reescreve a lista de prints de um chamado tirando os que foram apagados.
 * Devolve null quando nada muda, para não gastar UPDATE à toa.
 */
export function imagensRestantes(
	imagens: string[] | null | undefined,
	apagadas: Set<string>,
	nomeDe: (url: string) => string | null
): string[] | null {
	const atuais = imagens ?? [];
	if (!atuais.length) return null;
	const restantes = atuais.filter((url) => {
		const nome = nomeDe(url);
		return !nome || !apagadas.has(nome);
	});
	return restantes.length === atuais.length ? null : restantes;
}
