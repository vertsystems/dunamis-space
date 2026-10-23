// DMetric — como uma página vista vira contador. Só regras, sem I/O: a rota
// /api/dm usa isto e o teste cobre (coleta.test.ts).
//
// O script (static/dm.js) manda pouco: host, caminho, quem indicou
// (document.referrer), utm_source/utm_campaign e a largura da tela; ao sair da
// página, o tempo que ela ficou na tela; ao clicar num link, o endereço. O
// resto vem do servidor: país e cidade pelos cabeçalhos de geolocalização da
// Vercel, e aparelho, navegador e sistema pelo User-Agent.
//
// Para a saúde da página (0081), também: as medidas de velocidade do aparelho
// (Web Vitals), os erros de JavaScript, as imagens que não carregaram e as
// páginas que deram 404.

/** O que o script manda (ver static/dm.js). Tudo opcional: vem da internet. */
export type Batida = {
	t?: unknown; // tipo: 'v' (página vista, o padrão), 'tempo', 'clique', 'vitais', 'erro' ou '404'
	k?: unknown; // chave do site (só o código antigo, com data-site)
	h?: unknown; // location.hostname
	p?: unknown; // location.pathname
	r?: unknown; // document.referrer
	u?: unknown; // utm_source
	c?: unknown; // utm_campaign
	w?: unknown; // screen.width
	s?: unknown; // segundos de tela (tipo 'tempo')
	l?: unknown; // endereço do link clicado (tipo 'clique')
	e?: unknown; // nome do evento, de data-dm="…" (tipo 'clique')
	ti?: unknown; // document.title (página vista)
	vi?: unknown; // medidas de velocidade {lcp, inp, cls, fcp, ttfb} (tipo 'vitais')
	m?: unknown; // mensagem do erro, ou o arquivo que não carregou (tipo 'erro')
	o?: unknown; // erro: domínio do script/arquivo; 404: a página anterior do próprio site
	x?: unknown; // erro: 1 = arquivo (imagem, script, estilo) que não carregou
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

/**
 * Celular, tablet ou computador. O User-Agent decide; a largura desempata.
 *
 * Android sem "Mobile" no User-Agent é o jeito clássico de um tablet se
 * anunciar — mas o navegador do Instagram no Android também vem sem, e em
 * 11/10/2026 todo acesso de anúncio aparecia como tablet. Por isso, nesse caso,
 * só é tablet com tela de 600 px ou mais.
 */
export function classificarAparelho(ua: string, largura: number): string {
	if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'Tablet';
	if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return largura >= 600 ? 'Tablet' : 'Celular';
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

export type TipoBatida = 'v' | 'tempo' | 'clique' | 'vitais' | 'erro' | '404';
const TIPOS: TipoBatida[] = ['tempo', 'clique', 'vitais', 'erro', '404'];

/** As medidas de velocidade, em ms (cls: o número puro do Google, sem unidade). */
export type Vitais = Partial<Record<'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb', number>>;

export type BatidaLida = {
	tipo: TipoBatida;
	/** Vazia no código único: o site é achado pelo domínio. */
	chave: string;
	host: string;
	caminho: string;
	referrer: string;
	utm: string;
	campanha: string;
	largura: number;
	segundos: number;
	link: string;
	evento: string;
	/** Título da página (document.title), sem espaços sobrando. */
	titulo: string;
	vitais: Vitais;
	/** Erro: a mensagem, já limpa (ver limparErro); arquivo: o endereço. */
	mensagem: string;
	/** Erro: domínio do script/arquivo. 404: a página anterior, do próprio site. */
	origem: string;
	recurso: boolean;
};

/** A batida, validada: devolve null quando não dá para contar. */
export function lerBatida(b: Batida): BatidaLida | null {
	const chave = texto(b.k, 32);
	if (chave && !/^[a-z0-9]{6,32}$/i.test(chave)) return null;
	const host = texto(b.h, 253).toLowerCase();
	if (!host) return null;
	const tipo = TIPOS.find((t) => t === b.t) ?? 'v';
	const numeroOu0 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
	return {
		tipo,
		chave,
		host,
		caminho: limparCaminho(texto(b.p, 400)),
		referrer: texto(b.r, 500),
		utm: texto(b.u, 60),
		campanha: texto(b.c, 80).trim(),
		largura: numeroOu0(b.w),
		segundos: Math.round(Math.min(Math.max(numeroOu0(b.s), 0), 1800)),
		link: texto(b.l, 500),
		evento: texto(b.e, 60).trim(),
		titulo: texto(b.ti, 300).replace(/\s+/g, ' ').trim().slice(0, 150),
		vitais: lerVitais(b.vi),
		mensagem: texto(b.m, 400),
		origem: texto(b.o, 300),
		recurso: b.x === 1 || b.x === true
	};
}

/**
 * Só número de verdade entra: ms arredondados, cls com 4 casas. O teto de cada
 * medida (valor absurdo de aba esquecida aberta) fica no banco (0081).
 */
export function lerVitais(v: unknown): Vitais {
	const fora: Vitais = {};
	if (!v || typeof v !== 'object') return fora;
	for (const k of ['lcp', 'inp', 'cls', 'fcp', 'ttfb'] as const) {
		const n = (v as Record<string, unknown>)[k];
		if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) continue;
		fora[k] = k === 'cls' ? Math.round(n * 10_000) / 10_000 : Math.round(n);
	}
	return fora;
}

/**
 * Erro de JavaScript que vale contar, já com a mensagem limpa — ou null.
 *
 * "Script error." é o que o navegador mostra de um script de outro domínio:
 * esconde a mensagem, então não tem o que consertar. Extensão do navegador e
 * script que o app do Instagram/Facebook injeta não são do site. O aviso do
 * ResizeObserver é inofensivo. Números e endereços variam a cada vez (ids,
 * tokens): saem, para o mesmo erro somar numa linha só.
 */
export function limparErro(mensagem: string): string | null {
	let m = mensagem.replace(/\s+/g, ' ').trim();
	if (!m || /^(uncaught )?script error\.?$/i.test(m)) return null;
	if (/ResizeObserver loop|(chrome|moz|safari(-web)?)-extension:|instantSearchSDKJSBridgeClearHighlight|_AutofillCallbackHandler|zaloJSV2|webkit\.messageHandlers/i.test(m))
		return null;
	m = m.replace(/^uncaught (\w*error: )?/i, (_, tipo) => tipo ?? '');
	m = m.replace(/https?:\/\/[^\s'")]+/g, (u) => u.split(/[?#]/)[0]);
	m = m.replace(/\b\d{4,}\b/g, '…');
	return m.slice(0, 200);
}

/**
 * Arquivo que não carregou (imagem, script, estilo): o endereço sem query, ou
 * null se não é um endereço da web (data:, blob:, extensão).
 */
export function limparRecurso(endereco: string): string | null {
	let url: URL;
	try {
		url = new URL(endereco);
	} catch {
		return null;
	}
	if (!/^https?:$/.test(url.protocol)) return null;
	return `${url.origin}${url.pathname}`.slice(0, 200);
}

/**
 * De onde veio quem caiu num 404: a página do próprio site que tinha o link
 * (é ali que se conserta) ou, vindo de fora, a origem de sempre (Instagram,
 * Google, Direto…).
 */
export function origemDo404(paginaAnterior: string, referrer: string, host: string): string {
	if (paginaAnterior.startsWith('/')) return limparCaminho(paginaAnterior);
	return classificarOrigem(referrer, host, '');
}

/**
 * O que um clique em link vira no painel: "WhatsApp", "Telefone", "E-mail",
 * "Mapa", o nome de uma rede ou o domínio de fora. Link para o próprio site é
 * navegação, não clique — devolve null (a próxima página vista já conta).
 */
export function classificarClique(link: string, host: string): string | null {
	const l = link.trim();
	if (!l) return null;
	if (/^tel:/i.test(l)) return 'Telefone';
	if (/^mailto:/i.test(l)) return 'E-mail';
	if (/^(whatsapp|sms):/i.test(l)) return /^sms:/i.test(l) ? 'SMS' : 'WhatsApp';
	let url: URL;
	try {
		url = new URL(l);
	} catch {
		return null;
	}
	if (!/^https?:$/.test(url.protocol)) return null;
	const h = url.hostname.toLowerCase().replace(/^www\./, '');
	if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(h)) return 'WhatsApp';
	if (/(^|\.)google\.[a-z.]+$/.test(h) && url.pathname.startsWith('/maps')) return 'Mapa';
	if (/^(maps\.app\.goo\.gl|goo\.gl)$/.test(h) && (h.startsWith('maps') || url.pathname.startsWith('/maps'))) return 'Mapa';
	if (/(^|\.)waze\.com$/.test(h)) return 'Mapa';
	// O arquivo no Drive (o jornal de ofertas, o cardápio) e o app na loja: "Google" sozinho não
	// dizia o que a pessoa abriu.
	if (/^(drive|docs)\.google\.com$/.test(h)) return 'Google Drive';
	if (h === 'play.google.com') return 'Google Play';
	const semWww = (s: string) => s.toLowerCase().replace(/^www\./, '');
	if (h === semWww(host) || h.endsWith('.' + semWww(host))) return null;
	return nomeConhecido(h) ?? h;
}
