import { describe, expect, it } from 'vitest';
import { avaliar, faixaDaNota, medida, saudePorSite, valorDaMedida, type LinhaErro, type LinhaVital } from './saude';

const A = 'site-a';
const B = 'site-b';
const vital = (metrica: LinhaVital['metrica'], bons: number, medios: number, ruins: number, soma: number, site_id = A): LinhaVital => ({
	site_id,
	metrica,
	bons,
	medios,
	ruins,
	soma
});
const erro = (tipo: LinhaErro['tipo'], ocorrencias: number, mensagem = 'x', site_id = A): LinhaErro => ({
	site_id,
	tipo,
	mensagem,
	pagina: '/',
	origem: '',
	ocorrencias,
	ultimo: '2026-10-12'
});

describe('avaliar', () => {
	it('usa os limites do Google', () => {
		expect(avaliar('lcp', 2500)).toBe('bom');
		expect(avaliar('lcp', 2501)).toBe('medio');
		expect(avaliar('lcp', 4001)).toBe('ruim');
		expect(avaliar('cls', 0.1)).toBe('bom');
		expect(avaliar('cls', 0.3)).toBe('ruim');
		expect(avaliar('inp', 350)).toBe('medio');
	});
});

describe('medida', () => {
	it('soma os dias e avalia como o Google (3 de cada 4 visitas)', () => {
		const m = medida('lcp', [vital('lcp', 6, 1, 1, 16000), vital('lcp', 2, 0, 0, 3000), vital('fcp', 9, 0, 0, 900)]);
		expect(m).toMatchObject({ n: 10, bons: 8, medios: 1, ruins: 1, media: 1900, avaliacao: 'bom', nota: 85 });
		expect(medida('lcp', [vital('lcp', 5, 4, 1, 0)])?.avaliacao).toBe('medio');
		expect(medida('lcp', [vital('lcp', 5, 1, 4, 0)])?.avaliacao).toBe('ruim');
	});
	it('sem medida, nada', () => {
		expect(medida('inp', [vital('lcp', 1, 0, 0, 100)])).toBeNull();
	});
});

describe('saudePorSite', () => {
	it('tudo bom, sem erro: 100', () => {
		const [s] = saudePorSite({
			vitais: [vital('lcp', 20, 0, 0, 30000), vital('cls', 20, 0, 0, 0.4)],
			erros: [],
			visualizacoes: [{ site_id: A, visualizacoes: 20 }]
		});
		expect(s).toMatchObject({ nota: 100, faixa: 'otima', velocidade: 100, erros: 100, links: 100, amostra: 20, cargas: 20 });
	});

	it('velocidade pesa cada medida que existe (sem INP, os pesos se ajustam)', () => {
		// lcp 50 (peso 35) e cls 100 (peso 15): (50·35 + 100·15) / 50 = 65
		const [s] = saudePorSite({
			vitais: [vital('lcp', 0, 10, 0, 30000), vital('cls', 10, 0, 0, 0)],
			erros: [],
			visualizacoes: [{ site_id: A, visualizacoes: 10 }]
		});
		expect(s.velocidade).toBe(65);
		// 65·0,6 + 100·0,25 + 100·0,15 = 79
		expect(s.nota).toBe(79);
		expect(s.faixa).toBe('melhorar');
	});

	it('erros e 404 pela proporção das páginas abertas', () => {
		const [s] = saudePorSite({
			vitais: [vital('lcp', 90, 0, 0, 90000)],
			// 9 erros de JS + 2 arquivos (meio peso) = 10 em 100 páginas abertas nas 72 horas
			erros: [erro('js', 9, 'a'), erro('recurso', 2, 'b'), erro('404', 10, '/velha')],
			visualizacoes: [{ site_id: A, visualizacoes: 90 }],
			visualizacoes_72h: [{ site_id: A, visualizacoes: 100 }]
		});
		expect(s.cargas).toBe(100);
		// 10% com erro, 4 pontos por ponto percentual → 60
		expect(s.erros).toBe(60);
		// 10% deram 404, 10 pontos por ponto percentual → 0
		expect(s.links).toBe(0);
		expect(s.nota).toBe(Math.round(100 * 0.6 + 60 * 0.25));
		expect(s.listaErros.map((e) => e.tipo)).toEqual(['js', 'recurso']);
		expect(s.quebrados).toHaveLength(1);
	});

	it('a nota de erros compara com as páginas das 72 horas, não do período todo', () => {
		const [s] = saudePorSite({
			vitais: [vital('lcp', 10, 0, 0, 1000)],
			// 5 erros em 3 dias com 50 páginas = 10% → 60; contra 1.000 páginas do mês daria 98.
			erros: [erro('js', 5)],
			visualizacoes: [{ site_id: A, visualizacoes: 1000 }],
			visualizacoes_72h: [{ site_id: A, visualizacoes: 50 }]
		});
		expect(s.erros).toBe(60);
	});
	it('sem medida de velocidade não tem nota, mas os erros aparecem', () => {
		const [s] = saudePorSite({ vitais: [], erros: [erro('js', 3)], visualizacoes: [] });
		expect(s.nota).toBeNull();
		expect(s.faixa).toBeNull();
		expect(s.erros).toBe(0);
		expect(s.listaErros).toHaveLength(1);
	});

	it('o pior primeiro; sem nota por último', () => {
		const lista = saudePorSite({
			vitais: [vital('lcp', 10, 0, 0, 1000, A), vital('lcp', 0, 0, 10, 50000, B)],
			erros: [erro('js', 1, 'x', 'site-c')],
			visualizacoes: []
		});
		expect(lista.map((s) => s.site_id)).toEqual([B, A, 'site-c']);
	});
});

describe('faixaDaNota e valorDaMedida', () => {
	it('faixas do Lighthouse', () => {
		expect(faixaDaNota(90)).toBe('otima');
		expect(faixaDaNota(89)).toBe('melhorar');
		expect(faixaDaNota(50)).toBe('melhorar');
		expect(faixaDaNota(49)).toBe('ruim');
	});
	it('ms, segundos e o número puro do CLS', () => {
		expect(valorDaMedida('inp', 349.6)).toBe('350 ms');
		expect(valorDaMedida('lcp', 1840)).toBe('1,8 s');
		expect(valorDaMedida('cls', 0.123)).toBe('0,12');
	});
});
