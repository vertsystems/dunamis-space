import { describe, expect, it } from 'vitest';
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
	lerVitais,
	limparCaminho,
	limparErro,
	limparRecurso,
	nomeDaCidade,
	origemDo404
} from './coleta';

const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID =
	'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const INSTAGRAM = ANDROID + ' Instagram 350.0.0.0.0 Android';
const WINDOWS =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const EDGE = WINDOWS + ' Edg/129.0.0.0';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

describe('ehRobo', () => {
	it('robôs e pré-visualizações de link não contam', () => {
		expect(ehRobo('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
		expect(ehRobo('facebookexternalhit/1.1')).toBe(true);
		expect(ehRobo('WhatsApp/2.23.20.0')).toBe(true);
		expect(ehRobo('Mozilla/5.0 HeadlessChrome/120.0')).toBe(true);
		expect(ehRobo('')).toBe(true);
	});
	it('gente de verdade conta', () => {
		for (const ua of [IPHONE, ANDROID, INSTAGRAM, WINDOWS, MAC]) expect(ehRobo(ua)).toBe(false);
	});
});

describe('limparCaminho', () => {
	it('tira query, âncora e a barra do fim; decodifica acentos', () => {
		expect(limparCaminho('/ofertas/?utm_source=ig#topo')).toBe('/ofertas');
		expect(limparCaminho('')).toBe('/');
		expect(limparCaminho('/')).toBe('/');
		expect(limparCaminho('lojas')).toBe('/lojas');
		expect(limparCaminho('/promo%C3%A7%C3%A3o')).toBe('/promoção');
		expect(limparCaminho('/%E0%A4%A')).toBe('/%E0%A4%A');
	});
});

describe('classificarOrigem', () => {
	it('a utm_source manda, com os mesmos nomes do referrer', () => {
		expect(classificarOrigem('https://www.google.com/', 'lojasmari.com.br', 'instagram')).toBe('Instagram');
		expect(classificarOrigem('', 'x.com.br', 'ig')).toBe('Instagram');
		expect(classificarOrigem('', 'x.com.br', 'newsletter')).toBe('Newsletter');
	});
	it('referrer vira nome conhecido', () => {
		expect(classificarOrigem('https://www.google.com.br/', 'x.com.br', '')).toBe('Google');
		expect(classificarOrigem('https://l.instagram.com/?u=x', 'x.com.br', '')).toBe('Instagram');
		expect(classificarOrigem('https://lm.facebook.com/', 'x.com.br', '')).toBe('Facebook');
		expect(classificarOrigem('https://t.co/abc', 'x.com.br', '')).toBe('X (Twitter)');
		expect(classificarOrigem('https://blog.parceiro.com.br/post', 'x.com.br', '')).toBe('blog.parceiro.com.br');
	});
	it('apps Android pelo pacote', () => {
		expect(classificarOrigem('android-app://com.google.android.gm/', 'x.com.br', '')).toBe('Gmail');
		expect(classificarOrigem('android-app://com.instagram.android', 'x.com.br', '')).toBe('Instagram');
	});
	it('sem referrer, ou do próprio site, é Direto', () => {
		expect(classificarOrigem('', 'x.com.br', '')).toBe('Direto');
		expect(classificarOrigem('https://www.x.com.br/outra', 'x.com.br', '')).toBe('Direto');
		expect(classificarOrigem('https://loja.x.com.br/', 'x.com.br', '')).toBe('Direto');
		expect(classificarOrigem('lixo', 'x.com.br', '')).toBe('Direto');
	});
});

describe('aparelho, navegador e sistema', () => {
	it('aparelho', () => {
		expect(classificarAparelho(IPHONE, 390)).toBe('Celular');
		expect(classificarAparelho(ANDROID, 412)).toBe('Celular');
		expect(classificarAparelho(IPAD, 820)).toBe('Tablet');
		expect(classificarAparelho(WINDOWS, 1920)).toBe('Computador');
		expect(classificarAparelho(WINDOWS, 500)).toBe('Celular');
	});
	it('Android sem "Mobile" (navegador do Instagram) só é tablet com tela larga', () => {
		const IG_ANDROID =
			'Mozilla/5.0 (Linux; Android 14; SM-A155M Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Safari/537.36 Instagram 350.0 Android';
		expect(classificarAparelho(IG_ANDROID, 384)).toBe('Celular');
		expect(classificarAparelho(IG_ANDROID, 0)).toBe('Celular');
		expect(classificarAparelho(IG_ANDROID, 800)).toBe('Tablet');
	});
	it('navegador, com os embutidos dos apps à parte', () => {
		expect(classificarNavegador(IPHONE)).toBe('Safari');
		expect(classificarNavegador(ANDROID)).toBe('Chrome');
		expect(classificarNavegador(INSTAGRAM)).toBe('Instagram (no app)');
		expect(classificarNavegador(EDGE)).toBe('Edge');
		expect(classificarNavegador(MAC)).toBe('Safari');
	});
	it('sistema', () => {
		expect(classificarSistema(IPHONE)).toBe('iOS');
		expect(classificarSistema(ANDROID)).toBe('Android');
		expect(classificarSistema(WINDOWS)).toBe('Windows');
		expect(classificarSistema(MAC)).toBe('macOS');
	});
});

describe('classificarClique', () => {
	const H = 'lojasmari.com.br';
	it('contato e mapa pelo nome', () => {
		expect(classificarClique('https://wa.me/5515999999999?text=Oi', H)).toBe('WhatsApp');
		expect(classificarClique('https://api.whatsapp.com/send?phone=55', H)).toBe('WhatsApp');
		expect(classificarClique('whatsapp://send?phone=55', H)).toBe('WhatsApp');
		expect(classificarClique('tel:+551532440000', H)).toBe('Telefone');
		expect(classificarClique('mailto:contato@lojasmari.com.br', H)).toBe('E-mail');
		expect(classificarClique('https://www.google.com/maps/place/Lojas+Mari', H)).toBe('Mapa');
		expect(classificarClique('https://maps.app.goo.gl/abc', H)).toBe('Mapa');
		expect(classificarClique('https://waze.com/ul?ll=1,2', H)).toBe('Mapa');
	});
	it('link para fora: rede conhecida ou o domínio', () => {
		expect(classificarClique('https://www.instagram.com/lojasmari', H)).toBe('Instagram');
		expect(classificarClique('https://parceiro.com.br/promo', H)).toBe('parceiro.com.br');
	});
	it('link do próprio site é navegação, não clique', () => {
		expect(classificarClique('https://lojasmari.com.br/ofertas', H)).toBeNull();
		expect(classificarClique('https://www.lojasmari.com.br/', H)).toBeNull();
		expect(classificarClique('https://blog.lojasmari.com.br/', H)).toBeNull();
		expect(classificarClique('javascript:void(0)', H)).toBeNull();
		expect(classificarClique('', H)).toBeNull();
	});
});

describe('nomeDaCidade', () => {
	it('decodifica e junta a UF', () => {
		expect(nomeDaCidade('S%C3%A3o%20Paulo', 'SP')).toBe('São Paulo · SP');
		expect(nomeDaCidade('Dublin', null)).toBe('Dublin');
		expect(nomeDaCidade(null, 'SP')).toBe('');
	});
});

describe('diaEmBrasilia', () => {
	it('vira o dia à meia-noite de Brasília, não à de Greenwich', () => {
		expect(diaEmBrasilia(new Date('2026-10-10T02:30:00Z'))).toBe('2026-10-09');
		expect(diaEmBrasilia(new Date('2026-10-10T03:30:00Z'))).toBe('2026-10-10');
	});
});

describe('hashVisitante', () => {
	it('mesma pessoa no mesmo dia, mesmo hash; muda com o dia e com o site', async () => {
		const a = await hashVisitante('segredo', '2026-10-10', 'abc123', '1.2.3.4', IPHONE);
		expect(a).toMatch(/^[0-9a-f]{24}$/);
		expect(await hashVisitante('segredo', '2026-10-10', 'abc123', '1.2.3.4', IPHONE)).toBe(a);
		expect(await hashVisitante('segredo', '2026-10-11', 'abc123', '1.2.3.4', IPHONE)).not.toBe(a);
		expect(await hashVisitante('segredo', '2026-10-10', 'outro1', '1.2.3.4', IPHONE)).not.toBe(a);
	});
});

describe('lerBatida', () => {
	it('aceita o que o script manda', () => {
		expect(lerBatida({ k: 'a1b2c3d4e5f6', h: 'LojasMari.com.br', p: '/ofertas?x=1', r: '', u: 'ig', c: 'Aniversário ', w: 390 })).toMatchObject({
			tipo: 'v',
			chave: 'a1b2c3d4e5f6',
			host: 'lojasmari.com.br',
			caminho: '/ofertas',
			referrer: '',
			utm: 'ig',
			campanha: 'Aniversário',
			largura: 390
		});
	});
	it('código único: sem chave, o site sai do domínio', () => {
		expect(lerBatida({ h: 'lojasmari.com.br', p: '/' })).toMatchObject({ chave: '', tipo: 'v' });
	});
	it('tempo de tela, com teto de 30 minutos', () => {
		expect(lerBatida({ t: 'tempo', h: 'x.com.br', p: '/', s: 42.4 })).toMatchObject({ tipo: 'tempo', segundos: 42 });
		expect(lerBatida({ t: 'tempo', h: 'x.com.br', s: 99999 })?.segundos).toBe(1800);
		expect(lerBatida({ t: 'tempo', h: 'x.com.br', s: -5 })?.segundos).toBe(0);
	});
	it('título da página, sem quebras e espaços sobrando', () => {
		expect(lerBatida({ h: 'dnms.fun', p: '/lojasmari', ti: '  Lojas Mari®\n | PageLinks – DCo™ ' })?.titulo).toBe(
			'Lojas Mari® | PageLinks – DCo™'
		);
		expect(lerBatida({ h: 'dnms.fun', ti: 42 })?.titulo).toBe('');
	});
	it('saúde: medidas, erro e 404', () => {
		expect(lerBatida({ t: 'vitais', h: 'x.com.br', p: '/', vi: { lcp: 1834.6, cls: 0.123456, inp: 'x', fcp: -1 } })).toMatchObject({
			tipo: 'vitais',
			vitais: { lcp: 1835, cls: 0.1235 }
		});
		expect(lerBatida({ t: 'erro', h: 'x.com.br', m: 'x is not defined', o: 'cdn.x.com', x: 1 })).toMatchObject({
			tipo: 'erro',
			mensagem: 'x is not defined',
			origem: 'cdn.x.com',
			recurso: true
		});
		expect(lerBatida({ t: '404', h: 'x.com.br', p: '/velha', o: '/promo' })).toMatchObject({ tipo: '404', caminho: '/velha', origem: '/promo' });
	});
	it('tipo desconhecido vira página vista', () => {
		expect(lerBatida({ t: 'hack', h: 'x.com.br' })?.tipo).toBe('v');
	});
	it('recusa chave estranha ou sem host', () => {
		expect(lerBatida({ k: '<script>', h: 'x.com' })).toBeNull();
		expect(lerBatida({ k: 'a1b2c3d4e5f6' })).toBeNull();
		expect(lerBatida({})).toBeNull();
	});
});

describe('lerVitais', () => {
	it('só números de verdade', () => {
		expect(lerVitais(null)).toEqual({});
		expect(lerVitais({ ttfb: 120.4, lcp: Infinity, cls: 0 })).toEqual({ ttfb: 120, cls: 0 });
	});
});

describe('limparErro', () => {
	it('junta o mesmo erro de navegadores diferentes', () => {
		expect(limparErro("Uncaught TypeError: Cannot read properties of undefined (reading 'x')")).toBe(
			"TypeError: Cannot read properties of undefined (reading 'x')"
		);
		expect(limparErro('Uncaught foo is not defined')).toBe('foo is not defined');
		expect(limparErro('Falhou o pedido 123456 em https://api.x.com/v1/a?token=abc')).toBe('Falhou o pedido … em https://api.x.com/v1/a');
	});
	it('descarta o que não é do site ou não dá para consertar', () => {
		expect(limparErro('Script error.')).toBeNull();
		expect(limparErro('ResizeObserver loop completed with undelivered notifications.')).toBeNull();
		expect(limparErro('TypeError: x at chrome-extension://abc/a.js')).toBeNull();
		expect(limparErro('   ')).toBeNull();
	});
});

describe('limparRecurso', () => {
	it('o endereço sem query; só da web', () => {
		expect(limparRecurso('https://x.com.br/img/a.jpg?v=3')).toBe('https://x.com.br/img/a.jpg');
		expect(limparRecurso('data:image/png;base64,AAA')).toBeNull();
		expect(limparRecurso('nada')).toBeNull();
	});
});

describe('origemDo404', () => {
	it('a página do próprio site que tinha o link, ou de onde a pessoa veio', () => {
		expect(origemDo404('/promo/', '', 'x.com.br')).toBe('/promo');
		expect(origemDo404('', 'https://l.instagram.com/', 'x.com.br')).toBe('Instagram');
		expect(origemDo404('', '', 'x.com.br')).toBe('Direto');
	});
});
