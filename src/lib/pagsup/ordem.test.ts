import { describe, expect, it } from 'vitest';
import { naOrdemDaTela } from './ordem';

const item = (id: string, servico: string) => ({ id, servico });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('naOrdemDaTela', () => {
	it('agrupa por serviço na ordem em que cada um aparece, sem mexer na ordem dentro do grupo', () => {
		const lista = [
			item('a', 'Locução Loja'),
			item('b', 'Carros de Som'),
			item('c', 'Locução Loja'),
			item('d', 'Influenciadores'),
			item('e', 'Carros de Som')
		];
		expect(ids(naOrdemDaTela(lista, (i) => i.servico))).toEqual(['a', 'c', 'b', 'e', 'd']);
	});

	it('lista já agrupada não muda', () => {
		const lista = [item('a', 'X'), item('b', 'X'), item('c', 'Y')];
		expect(ids(naOrdemDaTela(lista, (i) => i.servico))).toEqual(['a', 'b', 'c']);
	});

	it('não perde nem duplica itens', () => {
		expect(naOrdemDaTela([], (i: { servico: string }) => i.servico)).toEqual([]);
		const lista = [item('a', ''), item('b', 'X'), item('c', '')];
		expect(ids(naOrdemDaTela(lista, (i) => i.servico)).sort()).toEqual(['a', 'b', 'c']);
	});
});
