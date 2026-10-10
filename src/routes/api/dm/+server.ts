// DMetric — recebe a página vista que o script dos sites manda (static/dm.js).
//
// Pública de propósito: quem chama é o navegador do visitante, num site que não
// é o nosso. Por isso ela só sabe CONTAR — nada é lido daqui — e a função do
// banco confere a chave e o domínio do site antes (dmetric_coletar, 0072).
//
// País e cidade vêm dos cabeçalhos que a própria Vercel põe em toda requisição
// (x-vercel-ip-*): não dá para o visitante forjar, e não precisa de serviço de
// geolocalização. Rodando fora da Vercel (npm run dev), eles não existem e a
// visita entra sem país.
import { env } from '$env/dynamic/private';
import { env as envPublic } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import {
	classificarAparelho,
	classificarNavegador,
	classificarOrigem,
	classificarSistema,
	diaEmBrasilia,
	ehRobo,
	hashVisitante,
	lerBatida,
	nomeDaCidade,
	type Batida
} from '$lib/dmetric/coleta';
import type { RequestHandler } from './$types';

const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'POST, OPTIONS',
	'access-control-allow-headers': 'content-type',
	'access-control-max-age': '86400'
};

/**
 * Sempre 204, aconteça o que acontecer: o site do cliente não tem nada a fazer
 * com a resposta. O cabeçalho x-dmetric diz o que houve (ok, robo, recusado…)
 * — é por ele que se descobre, na aba Rede do navegador, por que um site
 * instalado não está contando.
 */
const pronto = (motivo: string) =>
	new Response(null, {
		status: 204,
		headers: { ...CORS, 'x-dmetric': motivo, 'access-control-expose-headers': 'x-dmetric' }
	});

export const OPTIONS: RequestHandler = () => pronto('preflight');

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const url = envPublic.PUBLIC_SUPABASE_URL;
	const chaveServico = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !chaveServico) return pronto('sem-configuracao');

	const ua = request.headers.get('user-agent') ?? '';
	if (ehRobo(ua)) return pronto('robo');

	let batida: Batida;
	try {
		// O script manda o JSON sem Content-Type (ver static/dm.js): é o que passa
		// pela proteção de CSRF do SvelteKit e não gera preflight de CORS.
		batida = JSON.parse((await request.text()).slice(0, 4000));
	} catch {
		return pronto('corpo-invalido');
	}
	const b = lerBatida(batida ?? {});
	if (!b) return pronto('batida-invalida');

	const h = request.headers;
	const dia = diaEmBrasilia();
	let ip = '';
	try {
		ip = getClientAddress();
	} catch {
		/* sem IP (alguns ambientes de dev): o hash fica só com o User-Agent */
	}

	const supabase = createClient(url, chaveServico, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { data: contou, error } = await supabase.rpc('dmetric_coletar', {
		p_chave: b.chave,
		p_host: b.host,
		p_caminho: b.caminho,
		p_origem: classificarOrigem(b.referrer, b.host, b.utm),
		p_pais: h.get('x-vercel-ip-country') ?? '',
		p_cidade: nomeDaCidade(h.get('x-vercel-ip-city'), h.get('x-vercel-ip-country-region')),
		p_dispositivo: classificarAparelho(ua, b.largura),
		p_navegador: classificarNavegador(ua),
		p_sistema: classificarSistema(ua),
		// O segredo do hash é a própria service role key: já é segredo do
		// servidor, e trocar de chave só "zera" quem foi visto hoje.
		p_visitante: await hashVisitante(chaveServico, dia, b.chave, ip, ua)
	});
	if (error) {
		console.error('[dmetric] coletar', error.message);
		return pronto('erro');
	}
	// false = chave desconhecida, site pausado ou domínio que não é o do site.
	return pronto(contou ? 'ok' : 'recusado');
};
