import { describe, expect, it } from 'vitest';
import {
	MESES_DE_RETENCAO,
	contarDocs,
	corteDeRetencao,
	formatarBytes,
	nomeDeDownload,
	nomesUnicos,
	planoDeLimpeza,
	statusDoc,
	tipoSugerido,
	urlDoDocumento
} from './documentos';
import type { PaymentDoc } from './types';

const doc = (over: Partial<PaymentDoc> = {}): PaymentDoc => ({
	tipo: 'nf',
	arquivo: 'a.pdf',
	nome: 'nf.pdf',
	bytes: 30_000,
	enviadoEm: '2026-10-01T12:00:00Z',
	apagadoEm: null,
	...over
});

describe('tipoSugerido', () => {
	it('CPF é pessoa física: recibo', () => {
		expect(tipoSugerido('101.101.578-18')).toBe('recibo');
		expect(tipoSugerido('10110157818')).toBe('recibo');
	});
	it('CNPJ ou nada: NF', () => {
		expect(tipoSugerido('00.705.469/0001-26')).toBe('nf');
		expect(tipoSugerido('')).toBe('nf');
		expect(tipoSugerido(null)).toBe('nf');
	});
});

describe('statusDoc / contarDocs', () => {
	it('sem documento é pendente; com arquivo, anexado; sem arquivo, arquivado', () => {
		expect(statusDoc({ doc: null })).toBe('pendente');
		expect(statusDoc({})).toBe('pendente');
		expect(statusDoc({ doc: doc() })).toBe('anexado');
		expect(statusDoc({ doc: doc({ arquivo: null, apagadoEm: '2027-01-02T05:15:00Z' }) })).toBe('arquivado');
	});
	it('conta cada situação', () => {
		const ps = [{ doc: null }, { doc: doc() }, { doc: doc() }, { doc: doc({ arquivo: null }) }];
		expect(contarDocs(ps)).toEqual({ pendente: 1, anexado: 2, arquivado: 1 });
	});
});

describe('nomeDeDownload', () => {
	it('tipo, prestador e data no padrão brasileiro', () => {
		expect(nomeDeDownload('nf', 'Ailton Ribeiro', '2026-10-02')).toBe('NF - Ailton Ribeiro - 02-10-2026.pdf');
		expect(nomeDeDownload('recibo', 'Paulo Sérgio', '2026-10-02')).toBe('Recibo - Paulo Sérgio - 02-10-2026.pdf');
	});
	it('tira caracteres que o sistema de arquivos recusa', () => {
		expect(nomeDeDownload('nf', 'AL SOM / Gráfica: JK', '2026-10-02')).toBe('NF - AL SOM Gráfica JK - 02-10-2026.pdf');
	});
});

describe('urlDoDocumento', () => {
	it('monta a URL pública do bucket, com nome de download opcional', () => {
		expect(urlDoDocumento('https://x.supabase.co/', 'abc.pdf')).toBe(
			'https://x.supabase.co/storage/v1/object/public/pagsup-docs/abc.pdf'
		);
		expect(urlDoDocumento('https://x.supabase.co', 'abc.pdf', 'NF - Zé - 01-10-2026.pdf')).toBe(
			'https://x.supabase.co/storage/v1/object/public/pagsup-docs/abc.pdf?download=NF%20-%20Z%C3%A9%20-%2001-10-2026.pdf'
		);
	});
});

describe('nomesUnicos', () => {
	it('numera repetidos para um não sobrescrever o outro no .zip', () => {
		expect(nomesUnicos(['NF - A.pdf', 'NF - B.pdf', 'NF - A.pdf', 'nf - a.pdf'])).toEqual([
			'NF - A.pdf',
			'NF - B.pdf',
			'NF - A (2).pdf',
			'nf - a (3).pdf'
		]);
	});
});

describe('formatarBytes', () => {
	it('B, KB e MB', () => {
		expect(formatarBytes(800)).toBe('800 B');
		expect(formatarBytes(51_200)).toBe('50 KB');
		expect(formatarBytes(1_572_864)).toBe('1,5 MB');
	});
});

describe('corteDeRetencao', () => {
	it('são 3 meses de calendário', () => {
		expect(MESES_DE_RETENCAO).toBe(3);
		expect(corteDeRetencao(new Date('2026-10-09T05:15:00Z')).toISOString()).toBe('2026-07-09T05:15:00.000Z');
	});
	it('vira o ano para trás', () => {
		expect(corteDeRetencao(new Date('2027-01-15T05:15:00Z')).toISOString()).toBe('2026-10-15T05:15:00.000Z');
	});
	it('31/05 menos 3 meses é o último dia de fevereiro, não 3 de março', () => {
		expect(corteDeRetencao(new Date('2027-05-31T05:15:00Z')).toISOString()).toBe('2027-02-28T05:15:00.000Z');
		expect(corteDeRetencao(new Date('2028-05-31T05:15:00Z')).toISOString()).toBe('2028-02-29T05:15:00.000Z');
	});
});

describe('planoDeLimpeza', () => {
	const AGORA = new Date('2026-10-09T05:15:00Z'); // corte: 09/07/2026

	it('apaga e marca o PDF enviado há mais de 3 meses', () => {
		const guardados = [
			{ id: 'velho', arquivo: 'velho.pdf', enviadoEm: '2026-07-01T10:00:00Z' },
			{ id: 'novo', arquivo: 'novo.pdf', enviadoEm: '2026-09-20T10:00:00Z' }
		];
		expect(planoDeLimpeza(guardados, [], AGORA)).toEqual({ remover: ['velho.pdf'], expirar: ['velho'] });
	});

	it('a fronteira: um dia antes do corte some, um dia depois fica', () => {
		const guardados = [
			{ id: 'passou', arquivo: 'p.pdf', enviadoEm: '2026-07-08T05:15:00Z' },
			{ id: 'faltou', arquivo: 'f.pdf', enviadoEm: '2026-07-10T05:15:00Z' }
		];
		expect(planoDeLimpeza(guardados, [], AGORA).expirar).toEqual(['passou']);
	});

	it('também apaga órfãos antigos do bucket (pagamento excluído, troca que falhou)', () => {
		const objetos = [
			{ name: 'orfao-velho.pdf', created_at: '2026-05-01T00:00:00Z' },
			{ name: 'orfao-recente.pdf', created_at: '2026-10-01T00:00:00Z' }
		];
		expect(planoDeLimpeza([], objetos, AGORA)).toEqual({ remover: ['orfao-velho.pdf'], expirar: [] });
	});

	it('nunca apaga um arquivo que um pagamento ainda usa dentro do prazo', () => {
		// Objeto antigo, mas reaproveitado por um envio recente.
		const guardados = [{ id: 'novo', arquivo: 'x.pdf', enviadoEm: '2026-10-01T00:00:00Z' }];
		const objetos = [{ name: 'x.pdf', created_at: '2026-01-01T00:00:00Z' }];
		expect(planoDeLimpeza(guardados, objetos, AGORA)).toEqual({ remover: [], expirar: [] });
	});

	it('não repete o arquivo que aparece no banco e no bucket', () => {
		const guardados = [{ id: 'v', arquivo: 'v.pdf', enviadoEm: '2026-06-01T00:00:00Z' }];
		const objetos = [{ name: 'v.pdf', created_at: '2026-06-01T00:00:00Z' }];
		expect(planoDeLimpeza(guardados, objetos, AGORA).remover).toEqual(['v.pdf']);
	});

	it('data ilegível não apaga nada', () => {
		const guardados = [{ id: 'g', arquivo: 'g.pdf', enviadoEm: '' }];
		const objetos = [{ name: 'o.pdf', created_at: 'sei lá' }];
		expect(planoDeLimpeza(guardados, objetos, AGORA)).toEqual({ remover: [], expirar: [] });
	});
});
