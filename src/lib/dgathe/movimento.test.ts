import { describe, expect, it } from 'vitest';
import { decidir, type EstadoOutro } from './movimento';

const online = (mov: number, extra: Partial<EstadoOutro> = {}): EstadoOutro => ({ mov, situacao: 'online', sentado: false, indo: null, ...extra });

describe('o que fazer com a leitura de outra pessoa', () => {
	it('movimento mais novo: anda até o destino', () => {
		expect(decidir(online(100), { situacao: 'online', mov: 200 })).toBe('ao-lugar');
	});

	it('a mesma notícia de novo (ou uma mais velha) não mexe: nada de voltar ao começo', () => {
		expect(decidir(online(200, { indo: 'lugar' }), { situacao: 'online', mov: 200 })).toBe('nada');
		expect(decidir(online(200, { indo: 'lugar' }), { situacao: 'online', mov: 150 })).toBe('nada');
		expect(decidir(online(200), { situacao: 'online', mov: 200 })).toBe('nada');
	});

	it('ficou ausente: vai sentar na recepção, uma vez só', () => {
		expect(decidir(online(200), { situacao: 'ausente', mov: 200 })).toBe('ao-assento');
		expect(decidir(online(200, { situacao: 'ausente', indo: 'assento' }), { situacao: 'ausente', mov: 200 })).toBe('nada');
		expect(decidir(online(200, { situacao: 'ausente', sentado: true }), { situacao: 'ausente', mov: 200 })).toBe('nada');
	});

	it('voltou: levanta e vai para onde estava, mesmo sem movimento novo', () => {
		expect(decidir(online(200, { situacao: 'ausente', sentado: true }), { situacao: 'online', mov: 200 })).toBe('ao-lugar');
		expect(decidir(online(200, { situacao: 'ausente', indo: 'assento' }), { situacao: 'online', mov: 200 })).toBe('ao-lugar');
	});
});
