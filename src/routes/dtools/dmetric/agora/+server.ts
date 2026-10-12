// DMetric — "agora no site": quem abriu uma página nos últimos 5 minutos.
// O painel chama a cada 30 segundos (AgoraNoSite.svelte), sem recarregar o resto.
// Mora dentro de /dtools/dmetric, então herda a permissão do módulo.
import { json } from '@sveltejs/kit';
import { AGORA_VAZIO, type AgoraDados } from '$lib/dmetric/painel';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f-]{36}$/i;

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const site = url.searchParams.get('site');
	const { data, error } = await supabase.rpc('dmetric_agora', { p_site: site && UUID.test(site) ? site : null });
	if (error) console.error('[dmetric] agora', error.message);
	return json((data as AgoraDados | null) ?? AGORA_VAZIO, { headers: { 'cache-control': 'no-store' } });
};
