/**
 * Execução de queries do Supabase **preservando o rastro de falha**.
 *
 * O padrão `const { data } = await supabase...` seguido de `data ?? []` descarta
 * o `error` em silêncio: RLS negando, coluna inexistente ou timeout viravam uma
 * coleção vazia, indistinguível de "não há registros" na tela. Pior nos lookups
 * de formulário — o `<Select>` de clientes ficava vazio e o usuário concluía que
 * não havia clientes cadastrados.
 *
 * Estes helpers mantêm o comportamento de sucesso idêntico (mesma lista, mesmo
 * objeto) e, na falha, garantem no mínimo um `console.error` com contexto no log
 * da Vercel — e, quando a tela precisa avisar, a mensagem via `selComErro`.
 */

/** Formato mínimo de uma resposta do PostgREST (aceita `PostgrestError`). */
type Resposta<T> = { data: T | null; error: { message: string } | null };

/** Resultado de `selComErro`: os dados + a mensagem de falha (ou null). */
export type Consulta<T> = { dados: T[]; erro: string | null };

/**
 * Executa uma query de **lista** logando a falha com contexto.
 * Em caso de erro devolve `[]` (mesmo fallback de antes), mas deixa rastro.
 */
export async function sel<T>(promise: PromiseLike<Resposta<T[]>>, contexto: string): Promise<T[]> {
	return (await selComErro<T>(promise, contexto)).dados;
}

/**
 * Igual a `sel`, mas devolve também a mensagem de erro para a tela avisar o
 * usuário (padrão `loadError` do projeto).
 */
export async function selComErro<T>(
	promise: PromiseLike<Resposta<T[]>>,
	contexto: string
): Promise<Consulta<T>> {
	const { data, error } = await promise;
	if (error) {
		console.error(`[query] ${contexto}: ${error.message}`);
		return { dados: [], erro: error.message };
	}
	return { dados: data ?? [], erro: null };
}

/**
 * Variante para `.single()` / `.maybeSingle()`: devolve o objeto único ou null,
 * logando a falha com contexto em vez de engoli-la.
 */
export async function selUm<T>(
	promise: PromiseLike<Resposta<T>>,
	contexto: string
): Promise<T | null> {
	const { data, error } = await promise;
	if (error) {
		console.error(`[query] ${contexto}: ${error.message}`);
		return null;
	}
	return data ?? null;
}
