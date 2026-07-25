// parseValor converte o que o usuário digita em dinheiro. Errar aqui distorce
// pipeline, forecast e ranking — números que alguém usa para tomar decisão.
import { describe, it, expect } from 'vitest';
import { parseValor, parseTags } from './crm';

describe('parseValor — formato pt-BR', () => {
	it('vírgula decimal', () => {
		expect(parseValor('1234,56')).toBeCloseTo(1234.56);
		expect(parseValor('0,99')).toBeCloseTo(0.99);
	});

	it('ponto de milhar com vírgula decimal', () => {
		expect(parseValor('1.234,56')).toBeCloseTo(1234.56);
		expect(parseValor('1.234.567,89')).toBeCloseTo(1234567.89);
	});

	it('ponto de milhar sem decimal', () => {
		expect(parseValor('1.500')).toBe(1500);
		expect(parseValor('1.234.567')).toBe(1234567);
	});

	it('ponto decimal quando tem 1-2 casas', () => {
		expect(parseValor('1234.56')).toBeCloseTo(1234.56);
		expect(parseValor('1.5')).toBeCloseTo(1.5);
	});
});

describe('parseValor — formato en-US', () => {
	it('vírgula de milhar + ponto decimal não vira centavos', () => {
		// Era o bug: a vírgula era sempre tratada como decimal, então este valor
		// virava 1,23 — mil vezes menor. Acontece ao colar de planilha.
		expect(parseValor('1,234.56')).toBeCloseTo(1234.56);
		expect(parseValor('12,345.67')).toBeCloseTo(12345.67);
		expect(parseValor('1,234,567.89')).toBeCloseTo(1234567.89);
	});
});

describe('parseValor — bordas', () => {
	it('vazio e nulo viram zero', () => {
		expect(parseValor(null)).toBe(0);
		expect(parseValor('')).toBe(0);
		expect(parseValor('   ')).toBe(0);
	});

	it('ignora símbolo de moeda e espaços', () => {
		expect(parseValor('R$ 1.500,00')).toBeCloseTo(1500);
		expect(parseValor(' 250 ')).toBe(250);
	});

	it('texto sem número não quebra', () => {
		expect(Number.isFinite(parseValor('abc'))).toBe(true);
	});
});

describe('parseTags', () => {
	it('separa por vírgula e ponto-e-vírgula, aparando espaços', () => {
		expect(parseTags('tag1, tag2 ; tag3')).toEqual(['tag1', 'tag2', 'tag3']);
	});

	it('descarta vazios', () => {
		expect(parseTags('a,,b,   ,c')).toEqual(['a', 'b', 'c']);
		expect(parseTags('')).toEqual([]);
		expect(parseTags(null)).toEqual([]);
	});
});
