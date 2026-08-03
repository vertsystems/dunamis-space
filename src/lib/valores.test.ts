import { describe, it, expect } from 'vitest';
import {
	VALOR_MASCARA,
	ocultarValores,
	podeVerValores,
	preservarValores,
	valorBRL
} from './valores';
import type { Permissoes } from './permissoes';

describe('podeVerValores', () => {
	it('libera quem tem o módulo valores', () => {
		expect(podeVerValores({ valores: 'ver' } as Permissoes)).toBe(true);
		expect(podeVerValores({ valores: 'excluir' } as Permissoes)).toBe(true);
	});

	it('bloqueia quem não tem — inclusive quem enxerga clientes', () => {
		expect(podeVerValores({ clientes: 'excluir' } as Permissoes)).toBe(false);
		expect(podeVerValores({ valores: 'nenhum' } as Permissoes)).toBe(false);
		expect(podeVerValores({} as Permissoes)).toBe(false);
		expect(podeVerValores(null)).toBe(false);
	});
});

describe('valorBRL', () => {
	it('formata para quem pode ver', () => {
		expect(valorBRL(1200, true)).toContain('1.200,00');
	});

	it('mascara para quem não pode, inclusive valor nulo ou zero', () => {
		expect(valorBRL(1200, false)).toBe(VALOR_MASCARA);
		expect(valorBRL(null, false)).toBe(VALOR_MASCARA);
		expect(valorBRL(0, false)).toBe(VALOR_MASCARA);
	});
});

describe('ocultarValores', () => {
	const linhas = [
		{ id: '1', nome: 'Cliente A', mrr: 4500 },
		{ id: '2', nome: 'Cliente B', mrr: 900 }
	];

	it('devolve as linhas intactas para quem pode ver', () => {
		expect(ocultarValores(linhas, true, 'mrr')).toBe(linhas);
	});

	it('zera só a coluna de valor, preservando o resto', () => {
		const saida = ocultarValores(linhas, false, 'mrr');
		expect(saida.map((l) => l.mrr)).toEqual([null, null]);
		expect(saida.map((l) => l.nome)).toEqual(['Cliente A', 'Cliente B']);
		// Não muta a origem: o load pode reaproveitar os dados para outra coisa.
		expect(linhas[0].mrr).toBe(4500);
	});
});

describe('preservarValores', () => {
	const values = { nome: 'Cliente A', mrr: 4500, cidade: 'Campinas' };

	it('mantém o payload inteiro para quem pode ver', () => {
		expect(preservarValores(values, true, 'mrr')).toEqual(values);
	});

	it('remove o campo de valor para quem não pode — não basta zerar', () => {
		const patch = preservarValores(values, false, 'mrr');
		expect('mrr' in patch).toBe(false);
		expect(patch).toEqual({ nome: 'Cliente A', cidade: 'Campinas' });
	});
});
