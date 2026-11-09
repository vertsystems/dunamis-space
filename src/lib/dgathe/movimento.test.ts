import { describe, expect, it } from 'vitest';
import { alvos, deveMover } from './movimento';
import { assentos, lugaresDeQuemSaiu } from './assentos';
import { APARENCIA_PADRAO } from './aparencia';
import type { Pessoa, Situacao } from './presenca';

const pessoa = (id: string, situacao: Situacao, extra: Partial<Pessoa> = {}): Pessoa => ({
	id,
	nome: id,
	cargo: 'SM',
	foto: null,
	cor: null,
	x: 26.5,
	y: 20.5,
	dirX: 0,
	dirY: 1,
	mov: 100,
	aparencia: APARENCIA_PADRAO,
	situacao,
	assento: null,
	...extra
});

describe('o alvo de cada pessoa', () => {
	it('online: o lugar onde está (ou para onde vai), com o carimbo', () => {
		const a = alvos([pessoa('davi', 'online', { x: 30, y: 10, mov: 200 })]).get('davi')!;
		expect(a).toMatchObject({ chave: 'l:200', x: 30, y: 10, assento: null });
	});

	it('inativo: o assento que escolheu', () => {
		const copa = assentos().find((x) => x.sala === 'copa')!;
		const a = alvos([pessoa('davi', 'inativo', { assento: copa.id })]).get('davi')!;
		expect(a.assento?.id).toBe(copa.id);
		expect(a.chave).toBe(`a:${copa.id}`);
	});

	it('offline: um sofá da recepção, sem pegar o de quem está inativo lá', () => {
		const sofas = lugaresDeQuemSaiu();
		const lista = [pessoa('julia', 'inativo', { assento: sofas[0].id }), pessoa('aline', 'offline'), pessoa('davi', 'offline')];
		const r = alvos(lista);
		expect(r.get('aline')!.assento?.id).toBe(sofas[1].id);
		expect(r.get('davi')!.assento?.id).toBe(sofas[2].id);
	});

	it('a conta dos lugares da recepção dá igual em qualquer ordem da lista', () => {
		const a = alvos([pessoa('b', 'offline'), pessoa('a', 'offline')]);
		const b = alvos([pessoa('a', 'offline'), pessoa('b', 'offline')]);
		expect(a.get('a')!.chave).toBe(b.get('a')!.chave);
		expect(a.get('b')!.chave).toBe(b.get('b')!.chave);
	});
});

describe('anda ou não anda', () => {
	const lugar = (mov: number) => alvos([pessoa('d', 'online', { mov })]).get('d')!;
	it('a mesma notícia de novo não mexe (nada de voltar ao começo)', () => {
		expect(deveMover({ chave: 'l:200', mov: 200 }, lugar(200))).toBe(false);
	});
	it('lugar com carimbo mais velho não mexe; mais novo, anda', () => {
		expect(deveMover({ chave: 'l:200', mov: 200 }, lugar(150))).toBe(false);
		expect(deveMover({ chave: 'l:200', mov: 200 }, lugar(300))).toBe(true);
	});
	it('sentou ou levantou: anda', () => {
		const copa = assentos().find((x) => x.sala === 'copa')!;
		const sentar = alvos([pessoa('d', 'inativo', { assento: copa.id, mov: 200 })]).get('d')!;
		expect(deveMover({ chave: 'l:200', mov: 200 }, sentar)).toBe(true);
		expect(deveMover({ chave: sentar.chave, mov: 200 }, sentar)).toBe(false);
		// Voltou do inativo com o mesmo carimbo (levanta e fica ao lado do lugar)
		expect(deveMover({ chave: sentar.chave, mov: 200 }, lugar(200))).toBe(true);
	});
});
