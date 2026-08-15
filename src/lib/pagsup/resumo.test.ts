import { describe, expect, it } from 'vitest';
import { resumoPorCliente } from './resumo';

const CLIENTES = [
	{ id: 'mari', nome: 'Lojas Mari' },
	{ id: 'duda', nome: 'Duda Utilidades' },
	{ id: 'bazzar', nome: 'Rede Bazzar' },
	{ id: 'dunamis', nome: 'Dunamis Company' }
];

describe('resumoPorCliente', () => {
	it('separa os números por cliente em vez de somar todo mundo', () => {
		const r = resumoPorCliente(
			CLIENTES,
			[
				{ cliente_id: 'mari', valor: 1000 },
				{ cliente_id: 'mari', valor: 139.55 },
				{ cliente_id: 'duda', valor: 200 }
			],
			[{ cliente_id: 'mari' }, { cliente_id: 'mari' }, { cliente_id: 'duda' }],
			[{ cliente_id: 'duda', valor: 50 }]
		);
		const mari = r.find((c) => c.clienteId === 'mari')!;
		const duda = r.find((c) => c.clienteId === 'duda')!;
		expect(mari.pagoMes).toBe(1139.55);
		expect(mari.servicosMes).toBe(2);
		expect(mari.aPagar7).toBe(0);
		expect(duda.pagoMes).toBe(200);
		expect(duda.aPagar7).toBe(50);
		expect(duda.servicosMes).toBe(1);
	});

	it('cliente sem lançamento aparece zerado, não some', () => {
		const r = resumoPorCliente(CLIENTES, [{ cliente_id: 'mari', valor: 10 }], [], []);
		expect(r).toHaveLength(4);
		const bazzar = r.find((c) => c.clienteId === 'bazzar')!;
		expect(bazzar).toMatchObject({ nome: 'Rede Bazzar', pagoMes: 0, aPagar7: 0, servicosMes: 0 });
	});

	it('quem movimentou vem primeiro; os zerados completam as vagas', () => {
		const r = resumoPorCliente(
			CLIENTES,
			[
				{ cliente_id: 'bazzar', valor: 500 },
				{ cliente_id: 'mari', valor: 27139.55 }
			],
			[],
			[]
		);
		expect(r.map((c) => c.clienteId)).toEqual(['mari', 'bazzar', 'duda', 'dunamis']);
	});

	it('sem nenhum pagamento, a ordem é alfabética — previsível em vez de aleatória', () => {
		const r = resumoPorCliente(CLIENTES, [], [], []);
		expect(r.map((c) => c.nome)).toEqual([
			'Duda Utilidades',
			'Dunamis Company',
			'Lojas Mari',
			'Rede Bazzar'
		]);
	});

	it('desempata por a pagar e por serviços quando o pago empata', () => {
		const r = resumoPorCliente(
			CLIENTES,
			[],
			[{ cliente_id: 'dunamis' }],
			[{ cliente_id: 'bazzar', valor: 90 }]
		);
		expect(r.map((c) => c.clienteId)).toEqual(['bazzar', 'dunamis', 'duda', 'mari']);
	});

	it('mostra no máximo o limite pedido', () => {
		const muitos = [...CLIENTES, { id: 'e', nome: 'Quinto' }, { id: 'f', nome: 'Sexto' }];
		expect(resumoPorCliente(muitos, [], [], [])).toHaveLength(4);
		expect(resumoPorCliente(muitos, [], [], [], 6)).toHaveLength(6);
	});

	it('valor que vem como texto do Postgres é somado como número', () => {
		// numeric no PostgREST chega string; '10' + '5' concatenaria em vez de somar.
		const r = resumoPorCliente(
			CLIENTES,
			[
				{ cliente_id: 'mari', valor: '10.50' },
				{ cliente_id: 'mari', valor: '5.25' }
			],
			[],
			[]
		);
		expect(r[0].pagoMes).toBe(15.75);
	});

	it('linha sem dono não estraga a conta de ninguém', () => {
		const r = resumoPorCliente(
			CLIENTES,
			[
				{ cliente_id: null, valor: 999 },
				{ cliente_id: 'mari', valor: 10 }
			],
			[{ cliente_id: null }],
			[{ cliente_id: null, valor: 5 }]
		);
		expect(r.find((c) => c.clienteId === 'mari')!.pagoMes).toBe(10);
		expect(r.reduce((s, c) => s + c.pagoMes + c.aPagar7 + c.servicosMes, 0)).toBe(10);
	});

	it('valor nulo conta como zero', () => {
		const r = resumoPorCliente(CLIENTES, [{ cliente_id: 'mari', valor: null }], [], []);
		expect(r.find((c) => c.clienteId === 'mari')!.pagoMes).toBe(0);
	});

	it('base vazia não quebra', () => {
		expect(resumoPorCliente([], [], [], [])).toEqual([]);
	});
});
