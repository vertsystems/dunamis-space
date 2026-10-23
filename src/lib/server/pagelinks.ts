// DMetric ↔ PageLinks: os botões de uma página e os cliques de cada um, pela rota
// protegida do PageLinks (/api/dmetric/botoes/, no projeto dunamiscompany/pagelinks).
// O segredo (DMETRIC_PAGELINKS_SEGREDO) é o mesmo nas variáveis da Vercel dos dois.
//
// Nunca derruba a página do site: sem segredo, fora do ar ou demorando, o quadro
// dos botões só não aparece (null).
import { env } from '$env/dynamic/private';
import type { BotoesPageLinks } from '$lib/dmetric/botoes';

const ROTA = 'https://dnms.fun/api/dmetric/botoes/';

export async function botoesDaPagina(slug: string, desde: string, ate: string): Promise<BotoesPageLinks | null> {
	const segredo = env.DMETRIC_PAGELINKS_SEGREDO;
	if (!segredo) return null;
	try {
		const url = `${ROTA}?${new URLSearchParams({ slug, desde, ate })}`;
		const r = await fetch(url, { headers: { authorization: `Bearer ${segredo}` }, signal: AbortSignal.timeout(8_000) });
		if (!r.ok) {
			if (r.status !== 404) console.error('[dmetric] botões do PageLinks', r.status);
			return null;
		}
		return (await r.json()) as BotoesPageLinks;
	} catch (e) {
		console.error('[dmetric] botões do PageLinks', (e as Error).message);
		return null;
	}
}
