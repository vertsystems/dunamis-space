import { describe, expect, it } from 'vitest';
import {
	bandeira,
	diasEntre,
	faixaDe,
	haQuanto,
	intervalo,
	lerPeriodo,
	limparDominio,
	nomePais,
	numero,
	porcentagem,
	ranking,
	snippet,
	visitasPorPais
} from './painel';

describe('período', () => {
	it('sem período (ou um estranho) abre em "desde o começo"', () => {
		expect(lerPeriodo(null)).toBe('tudo');
		expect(lerPeriodo('xyz')).toBe('tudo');
		expect(lerPeriodo('7d')).toBe('7d');
	});
	it('intervalos inclusivos terminando hoje', () => {
		expect(intervalo('7d', '2026-10-10')).toEqual({ de: '2026-10-04', ate: '2026-10-10' });
		expect(intervalo('30d', '2026-10-10')).toEqual({ de: '2026-09-11', ate: '2026-10-10' });
		expect(intervalo('12m', '2026-10-10')).toEqual({ de: '2025-10-11', ate: '2026-10-10' });
		expect(intervalo('tudo', '2026-10-10').de).toBe('2000-01-01');
	});
	it('diasEntre lista todos os dias, inclusive os sem visita', () => {
		expect(diasEntre('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
	});
});

describe('visitasPorPais', () => {
	it('soma o script e o histórico; "(not set)" e zeros ficam fora', () => {
		const m = visitasPorPais(
			[
				{ valor: 'BR', visitas: 10, visualizacoes: 30 },
				{ valor: '', visitas: 4, visualizacoes: 4 },
				{ valor: 'IE', visitas: 0, visualizacoes: 2 }
			],
			[
				{ pais: 'BR', usuarios: 109087 },
				{ pais: 'us', usuarios: 2273 },
				{ pais: null, usuarios: 7 }
			]
		);
		expect([...m.entries()]).toEqual([
			['BR', 109097],
			['US', 2273]
		]);
	});
	it('ranking em ordem, com a fatia de cada um', () => {
		const r = ranking(new Map([['US', 25], ['BR', 75]]));
		expect(r.map((x) => x.iso)).toEqual(['BR', 'US']);
		expect(r[0].fatia).toBeCloseTo(0.75);
	});
});

describe('faixaDe', () => {
	it('potências de 10', () => {
		expect([0, 1, 9, 10, 99, 100, 999, 1000, 9999, 10000, 109087].map(faixaDe)).toEqual([
			-1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4
		]);
	});
});

describe('formatação', () => {
	it('país em português, bandeira, número e porcentagem', () => {
		expect(nomePais('BR')).toBe('Brasil');
		expect(nomePais('ie')).toBe('Irlanda');
		expect(bandeira('BR')).toBe('🇧🇷');
		expect(bandeira('')).toBe('');
		expect(numero(109087)).toBe('109.087');
		expect(porcentagem(0.9661)).toBe('96,6%');
		expect(porcentagem(0.00004)).toBe('<0,1%');
	});
});

describe('sites', () => {
	it('domínio limpo para comparar', () => {
		expect(limparDominio('https://www.LojasMari.com.br/ofertas?x=1')).toBe('lojasmari.com.br');
		expect(limparDominio('loja.exemplo.com:8080')).toBe('loja.exemplo.com');
		expect(limparDominio('  ')).toBe('');
	});
	it('snippet com a origem do sistema', () => {
		expect(snippet('https://dspace.verts.me', 'abc123def456')).toBe(
			'<script defer src="https://dspace.verts.me/dm.js" data-site="abc123def456"></script>'
		);
	});
	it('há quanto tempo', () => {
		const agora = new Date('2026-10-10T12:00:00Z');
		expect(haQuanto(null, agora)).toBe('');
		expect(haQuanto('2026-10-10T11:59:30Z', agora)).toBe('agora há pouco');
		expect(haQuanto('2026-10-10T11:20:00Z', agora)).toBe('há 40 min');
		expect(haQuanto('2026-10-10T07:00:00Z', agora)).toBe('há 5 h');
		expect(haQuanto('2026-10-09T10:00:00Z', agora)).toBe('ontem');
		expect(haQuanto('2026-10-05T12:00:00Z', agora)).toBe('há 5 dias');
	});
});
