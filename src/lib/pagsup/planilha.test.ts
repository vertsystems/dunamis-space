// A Planilha Mensal precisa ser do cliente escolhido, não de todo mundo.
//
// Era o bug: com Rede Bazzar selecionado, a tela mostrava os pagamentos de
// Lojas Mari — que é quem mais lança — e parecia que o seletor não valia ali.
import { describe, it, expect, beforeEach } from 'vitest';
import { pagsup } from './store.svelte';
import type { Payment, Provider } from './types';

const MARI = 'cli-mari';
const BAZZAR = 'cli-bazzar';

const pagamento = (id: string, clientId: string, date: string, value = 100): Payment => ({
	id,
	clientId,
	providerName: `Prestador ${id}`,
	service: 'Carros e Veículos de Som',
	value,
	date
});

const prestador = (id: string, clientId: string, name: string): Provider => ({
	id,
	clientId,
	name,
	service: 'Carros e Veículos de Som',
	region: 'Sorocaba',
	defaultPrice: 0
});

/** O mesmo recorte que a tela faz: pagamentos do cliente, naquele mês. */
const doMes = (mes: string) => pagsup.filteredPayments.filter((p) => (p.date ?? '').startsWith(mes));

beforeEach(() => {
	pagsup.supabase = null;
	pagsup.clients = [
		{ id: MARI, name: 'Lojas Mari' },
		{ id: BAZZAR, name: 'Rede Bazzar' }
	];
	pagsup.payments = [
		pagamento('m1', MARI, '2026-08-05', 1000),
		pagamento('m2', MARI, '2026-08-20', 139.55),
		pagamento('m3', MARI, '2026-07-10', 500),
		pagamento('b1', BAZZAR, '2026-08-12', 250)
	];
	pagsup.providers = [
		prestador('p-mari', MARI, 'Carro de Som da Mari'),
		prestador('p-bazzar', BAZZAR, 'Carro de Som do Bazzar')
	];
	pagsup.selectedClientId = MARI;
});

describe("Planilha Mensal — recorte por cliente", () => {
	it('mostra só os pagamentos do cliente selecionado', () => {
		pagsup.selectedClientId = BAZZAR;
		expect(doMes('2026-08').map((p) => p.id)).toEqual(['b1']);
	});

	it('trocar de cliente troca a planilha inteira', () => {
		expect(doMes('2026-08').map((p) => p.id)).toEqual(['m1', 'm2']);
		pagsup.selectedClientId = BAZZAR;
		expect(doMes('2026-08').map((p) => p.id)).toEqual(['b1']);
	});

	it('o total do mês não soma o pagamento de outro cliente', () => {
		pagsup.selectedClientId = BAZZAR;
		const total = doMes('2026-08').reduce((s, p) => s + Number(p.value), 0);
		expect(total).toBe(250);
	});

	it('o mês continua sendo respeitado dentro do cliente', () => {
		expect(doMes('2026-07').map((p) => p.id)).toEqual(['m3']);
	});

	it('cliente sem pagamento nenhum mostra planilha vazia, não a do vizinho', () => {
		pagsup.selectedClientId = 'cli-que-nao-lancou';
		expect(doMes('2026-08')).toEqual([]);
	});

	it('a busca do lançamento avulso só oferece prestadores do cliente', () => {
		pagsup.selectedClientId = BAZZAR;
		// Escolher um prestador de outro cliente gravaria o pagamento no cliente
		// dele, e o lançamento sumiria da tela logo depois de feito.
		expect(pagsup.filteredProviders.map((p) => p.name)).toEqual(['Carro de Som do Bazzar']);
	});
});
