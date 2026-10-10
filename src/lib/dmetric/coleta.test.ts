import { describe, expect, it } from 'vitest';
import {
	classificarAparelho,
	classificarNavegador,
	classificarOrigem,
	classificarSistema,
	diaEmBrasilia,
	ehRobo,
	hashVisitante,
	lerBatida,
	limparCaminho,
	nomeDaCidade
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
		expect(lerBatida({ k: 'a1b2c3d4e5f6', h: 'LojasMari.com.br', p: '/ofertas?x=1', r: '', u: 'ig', w: 390 })).toEqual({
			chave: 'a1b2c3d4e5f6',
			host: 'lojasmari.com.br',
			caminho: '/ofertas',
			referrer: '',
			utm: 'ig',
			largura: 390
		});
	});
	it('recusa chave estranha ou sem host', () => {
		expect(lerBatida({ k: '<script>', h: 'x.com' })).toBeNull();
		expect(lerBatida({ k: 'a1b2c3d4e5f6' })).toBeNull();
		expect(lerBatida({})).toBeNull();
	});
});
