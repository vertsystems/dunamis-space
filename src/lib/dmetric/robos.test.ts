import { describe, expect, it } from 'vitest';
import { FONTES, faixasDe, ipLimpo, nomeDoRobo, resumoDosRobos } from './robos';

const fonte = (id: string) => FONTES.find((f) => f.id === id)!;

describe('fontes das faixas de robô', () => {
	it('Amazon: IPv4 e IPv6 da lista oficial, sem repetir', () => {
		const dados = {
			prefixes: [{ ip_prefix: '3.5.140.0/22' }, { ip_prefix: '3.5.140.0/22' }, { ip_prefix: '15.230.39.0/24' }],
			ipv6_prefixes: [{ ipv6_prefix: '2600:1f14::/35' }]
		};
		expect(faixasDe(fonte('amazon'), dados)).toEqual(['3.5.140.0/22', '15.230.39.0/24', '2600:1f14::/35']);
	});
	it('Google, Oracle e RIPEstat', () => {
		expect(faixasDe(fonte('google'), { prefixes: [{ ipv4Prefix: '8.8.4.0/24' }, { ipv6Prefix: '2001:4860::/32' }] })).toEqual([
			'8.8.4.0/24',
			'2001:4860::/32'
		]);
		expect(faixasDe(fonte('oracle'), { regions: [{ cidrs: [{ cidr: '129.146.0.0/21' }] }, { cidrs: [] }] })).toEqual(['129.146.0.0/21']);
		expect(faixasDe(fonte('as32934'), { data: { prefixes: [{ prefix: '157.240.0.0/17' }, { prefix: '2a03:2880::/32' }] } })).toEqual([
			'157.240.0.0/17',
			'2a03:2880::/32'
		]);
	});
	it('resposta estranha (fonte fora do ar, formato novo) vira lista vazia — e o banco não apaga nada', () => {
		expect(faixasDe(fonte('amazon'), null)).toEqual([]);
		expect(faixasDe(fonte('as32934'), { erro: 'fora do ar' })).toEqual([]);
		expect(faixasDe(fonte('google'), { prefixes: [{ ipv4Prefix: 'não é faixa' }, {}] })).toEqual([]);
	});
	it('a Meta e as nuvens estão; as redes que levam gente de verdade, não', () => {
		const ids = FONTES.map((f) => f.id);
		expect(ids).toEqual(expect.arrayContaining(['amazon', 'google', 'oracle', 'as32934', 'as8075', 'as24940']));
		// Cloudflare (WARP), Akamai e Fastly (Retransmissão Privada da Apple), Zscaler.
		for (const fora of ['as13335', 'as36183', 'as54113', 'as20940', 'as62044']) expect(ids).not.toContain(fora);
		expect(FONTES.filter((f) => f.nome === 'Meta')).toHaveLength(3);
	});
});

describe('robô que se diz robô', () => {
	it('o nome pelo navegador', () => {
		expect(nomeDoRobo('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe('Google');
		expect(nomeDoRobo('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe('Meta');
		expect(nomeDoRobo('meta-externalagent/1.1')).toBe('Meta');
		expect(nomeDoRobo('WhatsApp/2.23.20.0')).toBe('WhatsApp');
		expect(nomeDoRobo('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0.0.0')).toBe('Navegador automatizado');
		expect(nomeDoRobo('Mozilla/5.0 (compatible; GPTBot/1.2)')).toBe('OpenAI');
		expect(nomeDoRobo('python-requests/2.31')).toBe('Programa');
		expect(nomeDoRobo('')).toBe('Sem navegador');
		expect(nomeDoRobo('Mozilla/5.0 (compatible; AlgumOutroBot/1.0)')).toBe('Robô declarado');
	});
});

describe('IP', () => {
	it('IPv4 escrito como IPv6 vira IPv4; lixo vira vazio', () => {
		expect(ipLimpo('::ffff:157.240.1.1')).toBe('157.240.1.1');
		expect(ipLimpo('2804:14c:65a1::1')).toBe('2804:14c:65a1::1');
		expect(ipLimpo(' 189.6.2.10 ')).toBe('189.6.2.10');
		expect(ipLimpo('unknown')).toBe('');
		expect(ipLimpo('')).toBe('');
	});
});

describe('o contador da barra', () => {
	it('total e dica', () => {
		expect(resumoDosRobos([{ rede: 'Meta', acessos: 1200 }, { rede: 'Amazon', acessos: 30 }])).toEqual({ total: 1230, dica: 'Meta 1.200 · Amazon 30' });
		expect(resumoDosRobos([])).toEqual({ total: 0, dica: '' });
	});
});
