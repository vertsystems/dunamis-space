// DMetric — renova as faixas de rede dos robôs (a Meta e as nuvens). Chamada
// pelo cron da Vercel uma vez por semana (vercel.json); ver as fontes em
// $lib/dmetric/robos e a tabela em supabase/migrations/0092_dmetric_robos.sql.
//
// Fala com o banco como a coleta: chave pública + o segredo do DMetric, que a
// função dmetric_redes_robo_trocar confere. Cada fonte é gravada assim que chega
// — a do RIPEstat pode levar 30 s —, e fonte que falha não apaga as faixas que
// já estavam lá.
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as envPublic } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import { FONTES, faixasDe } from '$lib/dmetric/robos';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 60 };

/** Só a Vercel (ou quem tiver o CRON_SECRET) roda. Sem a variável, a rota fica fechada. */
function autorizado(request: Request): boolean {
	const segredo = env.CRON_SECRET;
	return !!segredo && request.headers.get('authorization') === `Bearer ${segredo}`;
}

export const GET: RequestHandler = async ({ request }) => {
	if (!autorizado(request)) error(401, 'Não autorizado.');
	const url = envPublic.PUBLIC_SUPABASE_URL;
	const anon = envPublic.PUBLIC_SUPABASE_ANON_KEY;
	const segredo = env.DMETRIC_SEGREDO;
	if (!url || !anon || !segredo) error(500, 'Falta a configuração do DMetric.');
	const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

	const resultado = await Promise.all(
		FONTES.map(async (f) => {
			try {
				const r = await fetch(f.url, { signal: AbortSignal.timeout(45_000), headers: { accept: 'application/json' } });
				if (!r.ok) return { fonte: f.id, erro: `HTTP ${r.status}` };
				const faixas = faixasDe(f, await r.json());
				if (!faixas.length) return { fonte: f.id, erro: 'nenhuma faixa (as antigas ficam)' };
				const { data, error: e } = await supabase.rpc('dmetric_redes_robo_trocar', {
					p_segredo: segredo,
					p_fonte: f.id,
					p_nome: f.nome,
					p_redes: faixas
				});
				if (e) return { fonte: f.id, erro: e.message };
				return { fonte: f.id, gravadas: data as number };
			} catch (e) {
				return { fonte: f.id, erro: (e as Error).message };
			}
		})
	);
	const erros = resultado.filter((r) => 'erro' in r);
	if (erros.length) console.error('[dmetric] robôs', JSON.stringify(erros));
	return json({ ok: erros.length < FONTES.length, resultado });
};
