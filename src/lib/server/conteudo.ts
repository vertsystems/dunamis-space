import type { SupabaseClient } from '@supabase/supabase-js';
import { sel } from '$lib/server/query';

/**
 * Nomes de campanha já usados em conteúdos (distintos, ordenados) — alimenta o
 * autocomplete do campo "Campanha" no ConteudoForm.
 */
export async function nomesDeCampanha(supabase: SupabaseClient): Promise<string[]> {
	const data = await sel(
		supabase.from('conteudos').select('campanha').not('campanha', 'is', null).limit(2000),
		'conteudo: nomes de campanha para autocomplete'
	);
	const nomes = data
		.map((r) => (r.campanha as string | null)?.trim())
		.filter((n): n is string => !!n);
	return [...new Set(nomes)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
