// DMetric — recebe a página vista que o script dos sites manda (static/dm.js),
// e também o tempo de tela, os cliques e a saúde da página (velocidade, erros, 404).
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
	limparErro,
	limparRecurso,
	nomeDaCidade,
	origemDo404,
	type Batida,
	type BatidaLida
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

	// Saúde da página: velocidade, erros e 404. Também sem visitante, e nunca
	// cria site (dmetric_saude, 0081).
	if (b.tipo === 'vitais' || b.tipo === 'erro' || b.tipo === '404') {
		const dados = dadosDeSaude(b);
		if (!dados) return pronto('ignorado');
		const { data: contou, error } = await supabase.rpc('dmetric_saude', {
			p_segredo: segredo,
			p_chave: b.chave || null,
			p_host: b.host,
			p_caminho: b.caminho,
			p_tipo: b.tipo,
			p_dados: dados
		});
		if (error) {
			console.error('[dmetric] saude', error.message);
			return pronto('erro');
		}
		return pronto(contou ? 'ok' : 'recusado');
	}

	// O visitante do dia: o mesmo hash em todas as batidas da mesma pessoa no dia.
	const visitante = await hashVisitante(segredo, dia, b.chave || b.host.replace(/^www\./, ''), ip, ua);

	// Tempo de tela e cliques: só somam no que já existe. Levam o visitante para o
	// painel filtrado (0091) saber de quem é o clique — quem chegou pelo Instagram
	// clicou no WhatsApp?
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
			p_segundos: b.segundos,
			p_visitante: visitante
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
		p_visitante: visitante,
		// Nome da página no painel; o banco só regrava quando muda.
		p_titulo: b.titulo || null
	});
	if (error) {
		console.error('[dmetric] coletar', error.message);
		return pronto('erro');
	}
	// false = chave desconhecida, site pausado, domínio que não é o do site, ou
	// host que não é domínio público (localhost, IP) no código único.
	return pronto(contou ? 'ok' : 'recusado');
};

/** O que vai para dmetric_saude, ou null quando não há o que guardar. */
function dadosDeSaude(b: BatidaLida): Record<string, unknown> | null {
	if (b.tipo === 'vitais') return Object.keys(b.vitais).length ? b.vitais : null;
	if (b.tipo === '404') return { origem: origemDo404(b.origem, b.referrer, b.host) };
	const mensagem = b.recurso ? limparRecurso(b.mensagem) : limparErro(b.mensagem);
	if (!mensagem) return null;
	const dominio = b.origem.toLowerCase();
	return { mensagem, recurso: b.recurso, origem: /^[a-z0-9.-]{1,253}$/.test(dominio) ? dominio : '' };
}
