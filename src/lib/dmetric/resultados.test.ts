import { describe, expect, it } from 'vitest';
import { METAS_PADRAO, lerMetas, metasDoSite, opcoesDeMeta, taxa } from './resultados';

describe('metas do site', () => {
	it('sem escolha, o padrão (WhatsApp, Telefone, E-mail e Mapa)', () => {
		expect(metasDoSite([])).toEqual({ metas: [...METAS_PADRAO], padrao: true });
		expect(metasDoSite(['lojasmari.com.br'])).toEqual({ metas: ['lojasmari.com.br'], padrao: false });
	});
	it('o formulário: sem vazio nem repetida; escolher o padrão é não escolher', () => {
		expect(lerMetas([' WhatsApp ', 'WhatsApp', '', 'Mapa'])).toEqual(['WhatsApp', 'Mapa']);
		expect(lerMetas(['Mapa', 'E-mail', 'WhatsApp', 'Telefone'])).toEqual([]);
		expect(lerMetas(Array.from({ length: 30 }, (_, i) => `d${i}`))).toHaveLength(20);
		expect(lerMetas(['x'.repeat(100)])[0]).toHaveLength(80);
	});
	it('as opções: as marcadas primeiro, depois os mais clicados; o padrão sempre aparece', () => {
		const o = opcoesDeMeta(
			[
				{ valor: 'Mapa', cliques: 199 },
				{ valor: 'Google Drive', cliques: 67 },
				{ valor: 'lojasmari.com.br', cliques: 36 }
			],
			['lojasmari.com.br']
		);
		expect(o[0]).toEqual({ valor: 'lojasmari.com.br', cliques: 36, marcada: true });
		expect(o.map((x) => x.valor)).toEqual(['lojasmari.com.br', 'Mapa', 'Google Drive', 'E-mail', 'Telefone', 'WhatsApp']);
	});
	it('taxa sem visita não existe', () => {
		expect(taxa(1, 4)).toBe(0.25);
		expect(taxa(0, 0)).toBeNull();
	});
});
