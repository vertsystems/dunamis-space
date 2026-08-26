// O campo de observações do cofre guarda duas gerações de conteúdo: texto puro
// (escrito antes de existir editor) e HTML (escrito nele). Estas conversões são
// o que impede o texto antigo de virar um parágrafo só, a tag de aparecer crua
// na dica da lista e o HTML do banco de virar porta de entrada no `{@html}`.
import { describe, it, expect } from 'vitest';
import { ehHtml, paraHtml, paraTexto, sanitizarHtml } from './richtext';

describe('ehHtml', () => {
	it('reconhece o que veio do editor', () => {
		expect(ehHtml('<b>Radio</b> Indoor')).toBe(true);
		expect(ehHtml('linha 1<br>linha 2')).toBe(true);
	});

	it('não confunde texto puro com HTML', () => {
		expect(ehHtml('Login em app.radios.srv.br')).toBe(false);
		expect(ehHtml('custo < 100 > 50')).toBe(false);
		expect(ehHtml(null)).toBe(false);
	});
});

describe('paraHtml', () => {
	it('preserva as quebras de linha do texto antigo', () => {
		expect(paraHtml('Link:\nhttp://app.radios.srv.br')).toBe('Link:<br>http://app.radios.srv.br');
	});

	it('escapa o que parecia marcação no texto puro', () => {
		expect(paraHtml('a < b & c')).toBe('a &lt; b &amp; c');
	});

	it('devolve o HTML do editor como está', () => {
		expect(paraHtml('<b>oi</b>')).toBe('<b>oi</b>');
	});
});

describe('paraTexto', () => {
	it('tira a marcação para caber na dica da lista', () => {
		expect(paraTexto('<p>Loja <b>Centro</b></p><p>Loja Shopping</p>')).toBe(
			'Loja Centro\nLoja Shopping'
		);
	});

	it('desfaz as entidades', () => {
		expect(paraTexto('<span>senha &amp; login</span>')).toBe('senha & login');
	});

	it('deixa o texto puro intacto', () => {
		expect(paraTexto('linha 1\nlinha 2')).toBe('linha 1\nlinha 2');
	});
});

describe('sanitizarHtml', () => {
	it('mantém a formatação do editor', () => {
		const html = '<b>Rádio</b> <span style="color: #f04438">Indoor</span><ul><li>Centro</li></ul>';
		expect(sanitizarHtml(html)).toBe(html);
	});

	it('remove script com o conteúdo junto', () => {
		expect(sanitizarHtml('antes<script>roubar()</script>depois')).toBe('antesdepois');
	});

	it('remove handler de evento colado de fora', () => {
		expect(sanitizarHtml('<b onclick="roubar()">x</b>')).toBe('<b>x</b>');
		expect(sanitizarHtml('<b onmouseover=roubar()>x</b>')).toBe('<b>x</b>');
	});

	it('desarma link javascript:', () => {
		expect(sanitizarHtml('<a href="javascript:roubar()">x</a>')).toBe('<a href="#">x</a>');
	});

	it('vazio vira null (a coluna aceita NULL, não a string vazia)', () => {
		expect(sanitizarHtml('')).toBe(null);
		expect(sanitizarHtml(null)).toBe(null);
	});
});
