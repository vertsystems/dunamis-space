// DMetric — modo TV: tela cheia com quem está nos sites agora e o dia até aqui.
// Mora dentro de /dtools/dmetric, então herda a permissão do módulo.
import { dadosDaTv } from '$lib/server/dmetricTv';
import type { DMetricSite } from '$lib/dmetric/painel';
import type { PageServerLoad } from './$types';

const UUID = /^[0-9a-f-]{36}$/i;

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const siteParam = url.searchParams.get('site');
	const site = siteParam && UUID.test(siteParam) ? siteParam : null;
	const [sites, titulos, tv] = await Promise.all([
		supabase.from('dmetric_sites').select('*').order('nome'),
		supabase.from('dmetric_paginas').select('site_id, caminho, titulo').limit(5000),
		dadosDaTv(supabase, site)
	]);
	return {
		site,
		sites: (sites.data ?? []) as DMetricSite[],
		titulos: (titulos.data ?? []) as { site_id: string; caminho: string; titulo: string }[],
		tv
	};
};
