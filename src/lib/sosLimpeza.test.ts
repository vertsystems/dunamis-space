import { describe, expect, it } from 'vitest';
import { DIAS_DE_GRACA, imagensRestantes, objetosAApagar } from './sosLimpeza';
import { nomeDoObjeto } from './sosImagem';

const AGORA = new Date('2026-08-14T12:00:00Z');
const haDias = (d: number) => new Date(AGORA.getTime() - d * 86_400_000).toISOString();
const obj = (name: string, dias: number) => ({ name, created_at: haDias(dias) });

describe('objetosAApagar', () => {
	it('apaga o que passou dos dias de graça', () => {
		const lista = [obj('velha.webp', 30), obj('recente.webp', 1)];
		expect(objetosAApagar(lista, AGORA)).toEqual(['velha.webp']);
	});

	it('poupa o que chegou nos últimos 2 dias', () => {
		expect(DIAS_DE_GRACA).toBe(2);
		const lista = [obj('hoje.webp', 0), obj('ontem.webp', 1), obj('anteontem.webp', 1.9)];
		expect(objetosAApagar(lista, AGORA)).toEqual([]);
	});

	it('a fronteira dos 2 dias: um pouco antes some, um pouco depois fica', () => {
		const lista = [obj('passou.webp', 2.01), obj('faltou.webp', 1.99)];
		expect(objetosAApagar(lista, AGORA)).toEqual(['passou.webp']);
	});

	it('data ilegível fica: errar guardando é barato, apagar print de chamado aberto não', () => {
		const lista = [{ name: 'estranha.webp', created_at: 'sei lá' }, obj('velha.webp', 10)];
		expect(objetosAApagar(lista, AGORA)).toEqual(['velha.webp']);
	});

	it('bucket vazio não quebra', () => {
		expect(objetosAApagar([], AGORA)).toEqual([]);
	});

	it('a janela de graça é configurável', () => {
		const lista = [obj('a.webp', 5)];
		expect(objetosAApagar(lista, AGORA, 7)).toEqual([]);
		expect(objetosAApagar(lista, AGORA, 3)).toEqual(['a.webp']);
	});
});

describe('imagensRestantes', () => {
	const url = (n: string) => `https://x.supabase.co/storage/v1/object/public/sos/${n}`;

	it('tira do chamado só as imagens que foram apagadas', () => {
		const r = imagensRestantes(
			[url('a.webp'), url('b.webp'), url('c.webp')],
			new Set(['b.webp']),
			nomeDoObjeto
		);
		expect(r).toEqual([url('a.webp'), url('c.webp')]);
	});

	it('devolve null quando nada mudou — evita UPDATE à toa', () => {
		expect(imagensRestantes([url('a.webp')], new Set(['outra.webp']), nomeDoObjeto)).toBeNull();
		expect(imagensRestantes([], new Set(['a.webp']), nomeDoObjeto)).toBeNull();
		expect(imagensRestantes(null, new Set(['a.webp']), nomeDoObjeto)).toBeNull();
	});

	it('chamado que perdeu todos os prints fica com lista vazia, não com null', () => {
		// Precisa ser [] para o UPDATE limpar a coluna; null sinalizaria "sem mudança".
		expect(imagensRestantes([url('a.webp')], new Set(['a.webp']), nomeDoObjeto)).toEqual([]);
	});

	it('URL que não dá para interpretar é mantida em vez de sumir da lista', () => {
		const estranha = 'https://outro-lugar.com/foto.png';
		expect(imagensRestantes([estranha], new Set(['a.webp']), nomeDoObjeto)).toBeNull();
	});
});

describe('nomeDoObjeto', () => {
	it('extrai o nome do arquivo da URL pública', () => {
		expect(nomeDoObjeto('https://x.supabase.co/storage/v1/object/public/sos/abc.webp')).toBe(
			'abc.webp'
		);
	});

	it('ignora query string (cache busting) e decodifica o nome', () => {
		expect(nomeDoObjeto('https://x.supabase.co/storage/v1/object/public/sos/a%20b.webp?v=2')).toBe(
			'a b.webp'
		);
	});

	it('recusa URL de outro bucket — apagar o arquivo errado é pior que não apagar', () => {
		expect(nomeDoObjeto('https://x.supabase.co/storage/v1/object/public/clientes/logo.webp')).toBeNull();
		expect(nomeDoObjeto('https://exemplo.com/foto.webp')).toBeNull();
		expect(nomeDoObjeto('')).toBeNull();
	});
});
