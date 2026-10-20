import { describe, expect, it } from 'vitest';
import { agruparLugares } from './painel';

describe('agruparLugares', () => {
	it('países do maior para o menor, cada um com as suas cidades; as sem país no fim', () => {
		const g = agruparLugares({
			paises: [
				{ pais: 'US', visitas: 9, visualizacoes: 9 },
				{ pais: 'BR', visitas: 100, visualizacoes: 120 },
				{ pais: 'DE', visitas: 2, visualizacoes: 2 }
			],
			cidades: [
				{ cidade: 'São Paulo · SP', pais: 'BR', visitas: 37, visualizacoes: 40 },
				{ cidade: 'Sorocaba · SP', pais: 'BR', visitas: 51, visualizacoes: 60 },
				{ cidade: 'Prineville · OR', pais: 'US', visitas: 1, visualizacoes: 1 },
				{ cidade: 'Belém · PA', pais: null, visitas: 3, visualizacoes: 3 }
			]
		});
		expect(g.map((x) => x.pais)).toEqual(['BR', 'US', 'DE', null]);
		expect(g[0].cidades.map((c) => c.cidade)).toEqual(['Sorocaba · SP', 'São Paulo · SP']);
		expect(g[0].semCidade).toBe(12);
		expect(g[0].fatia).toBeCloseTo(100 / 111);
		expect(g[2]).toMatchObject({ pais: 'DE', cidades: [], semCidade: 2 });
		expect(g[3]).toMatchObject({ pais: null, visitas: 3, cidades: [{ cidade: 'Belém · PA' }] });
	});
	it('sem nada, nenhum grupo', () => {
		expect(agruparLugares({ paises: [], cidades: [] })).toEqual([]);
	});
});
