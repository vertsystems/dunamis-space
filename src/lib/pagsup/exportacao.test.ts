import { describe, it, expect, vi, afterEach } from 'vitest';
import { erroExport, ExportError } from './exportacao';

/**
 * O toast das planilhas dizia sempre "Falha ao gerar a planilha", o que deixou
 * um erro no Windows sem diagnóstico possível do lado de cá.
 */
describe("Pag's Up — mensagem de erro ao exportar", () => {
	afterEach(() => vi.restoreAllMocks());

	it('mostra a causa real em vez de engolir o erro', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(erroExport(new Error('worksheet name too long'))).toBe(
			'Falha ao gerar a planilha: worksheet name too long'
		);
	});

	it('usa a mensagem pronta quando ela já é para o usuário', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const msg = 'O sistema foi atualizado nesta aba. Recarregue a página (Ctrl+F5) e gere de novo.';
		expect(erroExport(new ExportError(msg))).toBe(msg);
	});

	it('não quebra com erro sem mensagem', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(erroExport(new Error(''))).toBe('Falha ao gerar a planilha.');
	});
});
