import { describe, expect, it } from 'vitest';
import { APARENCIA_PADRAO, CABELOS, CORES_CABELO, OCULOS, PELES, ROUPAS, SAPATOS, iguais, lerAparencia } from './aparencia';

describe('lerAparencia', () => {
	it('lê de volta uma aparência montada no editor', () => {
		const a = { corpo: 'feminino', pele: 'negra', cabelo: 'black', corCabelo: 'castanho', roupa: 'jaqueta', corRoupa: '#3b6ef6', sapato: 'bota', oculos: 'grosso' };
		expect(lerAparencia(a)).toEqual(a);
	});

	it('sem nada salvo, é o padrão na cor de tema (como era antes do editor)', () => {
		expect(lerAparencia(null, '#E05A7A')).toEqual({ ...APARENCIA_PADRAO, corRoupa: '#e05a7a' });
		expect(lerAparencia(undefined)).toEqual(APARENCIA_PADRAO);
	});

	it('opção fora do catálogo ou cor malformada cai no padrão, campo por campo', () => {
		const a = lerAparencia({ corpo: 'robô', cabelo: 'longo', corRoupa: 'red', oculos: 42 });
		expect(a.corpo).toBe(APARENCIA_PADRAO.corpo);
		expect(a.cabelo).toBe('longo');
		expect(a.corRoupa).toBe(APARENCIA_PADRAO.corRoupa);
		expect(a.oculos).toBe(APARENCIA_PADRAO.oculos);
	});

	it('o catálogo não tem id repetido e o padrão existe nele', () => {
		for (const lista of [PELES, CABELOS, CORES_CABELO, ROUPAS, SAPATOS, OCULOS]) {
			expect(new Set(lista.map((o) => o.id)).size).toBe(lista.length);
		}
		expect(lerAparencia(APARENCIA_PADRAO)).toEqual(APARENCIA_PADRAO);
	});

	it('iguais compara campo a campo', () => {
		expect(iguais(APARENCIA_PADRAO, { ...APARENCIA_PADRAO })).toBe(true);
		expect(iguais(APARENCIA_PADRAO, { ...APARENCIA_PADRAO, oculos: 'sol' })).toBe(false);
	});
});
