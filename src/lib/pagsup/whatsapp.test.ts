import { describe, it, expect } from 'vitest';
import { normalizaWhatsApp, whatsappDoPrestador, formataWhatsApp } from './whatsapp';

describe("Pag's Up — WhatsApp do prestador", () => {
	it('aceita celular com e sem máscara', () => {
		expect(normalizaWhatsApp('11942830693')).toBe('5511942830693');
		expect(normalizaWhatsApp('(15) 99740-4089')).toBe('5515997404089');
		expect(normalizaWhatsApp('13 998018402')).toBe('5513998018402');
	});

	it('não duplica o código do país', () => {
		expect(normalizaWhatsApp('5513997521500')).toBe('5513997521500');
		expect(normalizaWhatsApp('+55 13 99752-1500')).toBe('5513997521500');
	});

	it('recusa o que não é celular', () => {
		expect(normalizaWhatsApp('rsomfilm@hotmail.com')).toBeNull(); // e-mail na chave Pix
		expect(normalizaWhatsApp('27888330000111')).toBeNull(); // CNPJ na chave Pix
		expect(normalizaWhatsApp('30341543802')).toBeNull(); // CPF: 11 dígitos, mas sem o 9
		expect(normalizaWhatsApp('1533334444')).toBeNull(); // fixo não tem WhatsApp
		expect(normalizaWhatsApp('')).toBeNull();
		expect(normalizaWhatsApp(null)).toBeNull();
	});

	it('usa o campo próprio antes da chave Pix', () => {
		expect(whatsappDoPrestador({ whatsapp: '15998333755', pix: '11942830693' })).toBe(
			'5515998333755'
		);
	});

	it('cai na chave Pix quando ela é o celular e não há campo próprio', () => {
		expect(whatsappDoPrestador({ whatsapp: '', pix: '13997521500' })).toBe('5513997521500');
		expect(whatsappDoPrestador({ pix: 'necapilar@gmail.com' })).toBeNull();
	});

	it('formata para leitura', () => {
		expect(formataWhatsApp('5511942830693')).toBe('(11) 94283-0693');
	});
});
