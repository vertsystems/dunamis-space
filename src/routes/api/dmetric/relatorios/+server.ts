// DMetric — todo dia 1º, prepara as mensagens do relatório do mês que acabou
// (agendamento em vercel.json). Elas ficam na aba Relatórios do DMetric, para
// alguém da Dunamis revisar e mandar pelo WhatsApp. Ver $lib/server/dmetricRelatorios.
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as envPublic } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import { diaEmBrasilia } from '$lib/dmetric/coleta';
import { origemDoPortal } from '$lib/dmetric/portal';
import { mesAnterior, prepararRelatorios } from '$lib/server/dmetricRelatorios';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 60 };

/** Só a Vercel (ou quem tiver o CRON_SECRET) roda. Sem a variável, a rota fica fechada. */
function autorizado(request: Request): boolean {
	const segredo = env.CRON_SECRET;
	return !!segredo && request.headers.get('authorization') === `Bearer ${segredo}`;
}

export const GET: RequestHandler = async ({ request, url }) => {
	if (!autorizado(request)) error(401, 'Não autorizado.');
	const supa = envPublic.PUBLIC_SUPABASE_URL;
	const anon = envPublic.PUBLIC_SUPABASE_ANON_KEY;
	const segredo = env.DMETRIC_SEGREDO;
	if (!supa || !anon || !segredo) error(500, 'Falta a configuração do DMetric.');
	const supabase = createClient(supa, anon, { auth: { persistSession: false, autoRefreshToken: false } });
	const mes = mesAnterior(diaEmBrasilia());
	const r = await prepararRelatorios(supabase, segredo, mes, origemDoPortal(url));
	if (r.erro) console.error('[dmetric] relatórios', r.erro);
	return json({ mes, ...r });
};
