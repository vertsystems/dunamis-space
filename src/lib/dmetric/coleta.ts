// DMetric — como uma página vista vira contador. Só regras, sem I/O: a rota
// /api/dm usa isto e o teste cobre (coleta.test.ts).
//
// O script (static/dm.js) manda pouco: chave do site, host, caminho, quem
// indicou (document.referrer), utm_source e a largura da tela. O resto vem do
// servidor: país e cidade pelos cabeçalhos de geolocalização da Vercel, e
// aparelho, navegador e sistema pelo User-Agent.

/** O que o script manda (ver static/dm.js). Tudo opcional: vem da internet. */
export type Batida = {
	k?: unknown; // chave do site
	h?: unknown; // location.hostname
	p?: unknown; // location.pathname
	r?: unknown; // document.referrer
	u?: unknown; // utm_source
	w?: unknown; // screen.width
};

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Robôs, pré-visualizações de link e navegadores automatizados não contam. */
export function ehRobo(ua: string): boolean {
	if (!ua) return true;
	return /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp\/|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch|go-http/i.test(
		ua
	);
}

/** Caminho limpo: sem barra no fim (exceto a raiz), sem espaços, até 200 caracteres. */
export function limparCaminho(p: string): string {
	let c = (p || '/').trim().split(/[?#]/)[0] || '/';
	if (!c.startsWith('/')) c = '/' + c;
	if (c.length > 1) c = c.replace(/\/+$/, '');
	try {
		c = decodeURI(c);
	} catch {
		/* caminho com % solto: fica como veio */
	}
	return c.slice(0, 200) || '/';
}

/** Domínios que valem um nome reconhecível, em vez do endereço cru. */
const ORIGENS: [RegExp, string][] = [
	[/(^|\.)google\./, 'Google'],
	[/(^|\.)instagram\.com$/, 'Instagram'],
	[/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'],
	[/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp'],
	[/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
	[/(^|\.)tiktok\.com$/, 'TikTok'],
	[/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X (Twitter)'],
	[/(^|\.)linkedin\.com$|^lnkd\.in$/, 'LinkedIn'],
	[/(^|\.)bing\.com$/, 'Bing'],
	[/(^|\.)(yahoo\.com|search\.yahoo\.)/, 'Yahoo'],
	[/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
	[/(^|\.)pinterest\./, 'Pinterest'],
	[/(^|\.)(chatgpt\.com|openai\.com)$/, 'ChatGPT'],
	[/(^|\.)linktr\.ee$/, 'Linktree']
];

/** Nome conhecido de um domínio ("l.instagram.com" → "Instagram"), ou null. */
function nomeConhecido(host: string): string | null {
	const h = host.toLowerCase().replace(/^(www|m|l|lm)\./, '');
	for (const [re, nome] of ORIGENS) if (re.test(h)) return nome;
	return null;
}

/** Apps Android mandam o pacote como referrer (android-app://com.instagram.android). */
const APPS: [RegExp, string][] = [
	[/^com\.google\.android\.gm/, 'Gmail'],
	[/instagram/, 'Instagram'],
	[/facebook|katana/, 'Facebook'],
	[/whatsapp/, 'WhatsApp'],
	[/googlequicksearchbox|^com\.google/, 'Google'],
	[/linkedin/, 'LinkedIn'],
	[/tiktok|musically|zhiliaoapp/, 'TikTok']
];

/**
 * De onde a pessoa veio. A utm_source manda (é o que a campanha marcou); sem
 * ela, o domínio de quem indicou. Vindo do próprio site, ou sem indicação, é
 * "Direto".
 */
export function classificarOrigem(referrer: string, host: string, utm: string): string {
	const marcada = utm.trim().toLowerCase();
	if (marcada) {
		// utm_source=ig, instagram, l.instagram.com… viram o mesmo "Instagram"
		// que o referrer daria, para a campanha e o orgânico somarem juntos.
		const apelidos: Record<string, string> = { ig: 'Instagram', fb: 'Facebook', wpp: 'WhatsApp', zap: 'WhatsApp' };
		const conhecido = apelidos[marcada] ?? nomeConhecido(marcada.includes('.') ? marcada : `${marcada}.com`);
		return conhecido ?? marcada.charAt(0).toUpperCase() + marcada.slice(1);
	}
	if (!referrer) return 'Direto';
	let url: URL;
	try {
		url = new URL(referrer);
	} catch {
		return 'Direto';
	}
	if (url.protocol === 'android-app:') {
		const pacote = url.hostname.toLowerCase();
		return APPS.find(([re]) => re.test(pacote))?.[1] ?? 'App Android';
	}
	const semWww = (s: string) => s.toLowerCase().replace(/^www\./, '');
	const ref = semWww(url.hostname);
	if (!ref || ref === semWww(host) || ref.endsWith('.' + semWww(host))) return 'Direto';
	return nomeConhecido(ref) ?? ref;
}

/** Celular, tablet ou computador. O User-Agent decide; a largura desempata. */
export function classificarAparelho(ua: string, largura: number): string {
	if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'Tablet';
	if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|Opera Mini/i.test(ua)) return 'Celular';
	if (largura > 0 && largura < 768) return 'Celular';
	return 'Computador';
}

/** Navegador, com os embutidos (Instagram, Facebook) separados: é onde o link de anúncio abre. */
export function classificarNavegador(ua: string): string {
	if (/Instagram/i.test(ua)) return 'Instagram (no app)';
	if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook (no app)';
	if (/TikTok|musical_ly|Bytedance/i.test(ua)) return 'TikTok (no app)';
	if (/Edg\//.test(ua)) return 'Edge';
	if (/OPR\/|Opera/.test(ua)) return 'Opera';
	if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
	if (/Firefox|FxiOS/.test(ua)) return 'Firefox';
	if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
	if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari';
	return 'Outro';
}

export function classificarSistema(ua: string): string {
	if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
	if (/Android/.test(ua)) return 'Android';
	if (/CrOS/.test(ua)) return 'ChromeOS';
	if (/Windows/.test(ua)) return 'Windows';
	if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
	if (/Linux/.test(ua)) return 'Linux';
	return 'Outro';
}

/** "Sorocaba · SP". A Vercel manda a cidade com URL-encoding (São%20Paulo). */
export function nomeDaCidade(cidade: string | null, regiao: string | null): string {
	let c = cidade ?? '';
	try {
		c = decodeURIComponent(c);
	} catch {
		/* fica como veio */
	}
	c = c.trim();
	if (!c) return '';
	const r = (regiao ?? '').trim().toUpperCase();
	return r ? `${c} · ${r}` : c;
}

/** Data (AAAA-MM-DD) no fuso de Brasília — é o "dia" dos contadores. */
export function diaEmBrasilia(agora = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);
}

/**
 * O visitante do dia: HMAC de (dia, site, IP, User-Agent). Muda todo dia e
 * não dá para voltar ao IP — só serve para não contar a mesma pessoa duas vezes
 * no mesmo dia. Nada disso fica guardado além do próprio hash (ver
 * dmetric_vistos na migration 0072).
 */
export async function hashVisitante(
	segredo: string,
	dia: string,
	chave: string,
	ip: string,
	ua: string
): Promise<string> {
	const enc = new TextEncoder();
	const k = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, [
		'sign'
	]);
	const assinatura = await crypto.subtle.sign('HMAC', k, enc.encode(`${dia}|${chave}|${ip}|${ua}`));
	return [...new Uint8Array(assinatura).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** A batida, validada: devolve null quando não dá para contar. */
export function lerBatida(b: Batida): { chave: string; host: string; caminho: string; referrer: string; utm: string; largura: number } | null {
	const chave = texto(b.k, 32);
	if (!/^[a-z0-9]{6,32}$/i.test(chave)) return null;
	const host = texto(b.h, 253).toLowerCase();
	if (!host) return null;
	return {
		chave,
		host,
		caminho: limparCaminho(texto(b.p, 400)),
		referrer: texto(b.r, 500),
		utm: texto(b.u, 60),
		largura: typeof b.w === 'number' && Number.isFinite(b.w) ? b.w : 0
	};
}
