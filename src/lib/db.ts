/**
 * Normaliza um relacionamento to-one do Supabase.
 * O PostgREST retorna um objeto para joins to-one, mas o gerador de tipos às vezes
 * o infere como array (`{ nome }[]`). Este helper aceita ambas as formas e devolve
 * sempre o objeto único (ou null), corrigindo tipo e runtime de uma vez.
 */
export function um<T>(v: T | T[] | null | undefined): T | null {
	return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}
