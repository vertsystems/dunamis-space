// DMetric — recebe a página vista que o script dos sites manda (static/dm.js).
//
// Pública de propósito: quem chama é o navegador do visitante, num site que não
// é o nosso. Por isso ela só sabe CONTAR — nada é lido daqui — e a função do
// banco confere a chave e o domínio do site antes (dmetric_coletar, 0072/0073).
//
// Fala com o banco pela chave pública (anon), levando o segredo do DMetric
// (DMETRIC_SEGREDO): a função só conta com ele, então chamá-la direto pela API
// não adianta. Era com a service role, que chegou vazia à função em produção.
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
	classificarClique,
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
	const anon = envPublic.PUBLIC_SUPABASE_ANON_KEY;
	const segredo = env.DMETRIC_SEGREDO;
	if (!url || !anon || !segredo) return pronto('sem-configuracao');

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

	const supabase = createClient(url, anon, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	// Tempo de tela e cliques: só somam no que já existe, sem visitante.
	if (b.tipo !== 'v') {
		const valor = b.tipo === 'clique' ? (b.evento || classificarClique(b.link, b.host)) : null;
		if (b.tipo === 'clique' && !valor) return pronto('ignorado');
		if (b.tipo === 'tempo' && b.segundos < 1) return pronto('ignorado');
		const { data: contou, error } = await supabase.rpc('dmetric_evento', {
			p_segredo: segredo,
			p_chave: b.chave || null,
			p_host: b.host,
			p_caminho: b.caminho,
			p_tipo: b.tipo,
			p_valor: valor,
			p_segundos: b.segundos
		});
		if (error) {
			console.error('[dmetric] evento', error.message);
			return pronto('erro');
		}
		return pronto(contou ? 'ok' : 'recusado');
	}

	const { data: contou, error } = await supabase.rpc('dmetric_coletar', {
		p_segredo: segredo,
		// Sem chave (código único), o banco acha — ou cria — o site pelo domínio.
		p_chave: b.chave || null,
		p_host: b.host,
		p_caminho: b.caminho,
		p_origem: classificarOrigem(b.referrer, b.host, b.utm),
		p_campanha: b.campanha,
		p_pais: h.get('x-vercel-ip-country') ?? '',
		p_cidade: nomeDaCidade(h.get('x-vercel-ip-city'), h.get('x-vercel-ip-country-region')),
		p_dispositivo: classificarAparelho(ua, b.largura),
		p_navegador: classificarNavegador(ua),
		p_sistema: classificarSistema(ua),
		// O mesmo segredo assina o hash do visitante: trocá-lo só "zera" quem
		// já foi visto hoje.
		p_visitante: await hashVisitante(segredo, dia, b.chave || b.host.replace(/^www\./, ''), ip, ua)
	});
	if (error) {
		console.error('[dmetric] coletar', error.message);
		return pronto('erro');
	}
	// false = chave desconhecida, site pausado, domínio que não é o do site, ou
	// host que não é domínio público (localhost, IP) no código único.
	return pronto(contou ? 'ok' : 'recusado');
};
