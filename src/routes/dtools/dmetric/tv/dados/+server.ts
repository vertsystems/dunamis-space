// DMetric — modo TV: os dados novos, a cada 15 segundos (ver ../+page.svelte).
import { json } from '@sveltejs/kit';
import { dadosDaTv } from '$lib/server/dmetricTv';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f-]{36}$/i;

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const site = url.searchParams.get('site');
	return json(await dadosDaTv(supabase, site && UUID.test(site) ? site : null), {
		headers: { 'cache-control': 'no-store' }
	});
};
