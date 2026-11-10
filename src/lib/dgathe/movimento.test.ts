import { describe, expect, it } from 'vitest';
import { TROCA_DE_AMBIENTE, alvos, deveMover } from './movimento';
import { assentos, lugaresDeQuemSaiu, lugaresDoCeo } from './assentos';
import { ALINE, BRUNO } from './mapa';
import { APARENCIA_PADRAO } from './aparencia';
import type { Pessoa, Situacao } from './presenca';

const DESDE = 1_794_250_000;
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
	ceo: false,
	paradoDesde: situacao === 'online' ? null : DESDE,
	paradoHa: 0,
	...extra
});
const horas = (h: number) => h * 3600;

describe('o alvo de cada pessoa', () => {
	it('online: o lugar onde está (ou para onde vai), com o carimbo', () => {
		const a = alvos([pessoa('davi', 'online', { x: 30, y: 10, mov: 200 })]).get('davi')!;
		expect(a).toMatchObject({ chave: 'l:200', x: 30, y: 10, assento: null });
	});

	it('ausente (primeiras 3 h): o lugar que escolheu', () => {
		const copa = assentos().find((x) => x.sala === 'copa')!;
		const a = alvos([pessoa('davi', 'inativo', { assento: copa.id })]).get('davi')!;
		expect(a.assento?.id).toBe(copa.id);
	});

	it('offline (primeiras 3 h): um sofá da recepção, sem pegar o de quem está ausente lá', () => {
		const sofas = lugaresDeQuemSaiu().filter((x) => x.sentado);
		const lista = [pessoa('julia', 'inativo', { assento: sofas[0].id }), pessoa('aline', 'offline'), pessoa('davi', 'offline')];
		const r = alvos(lista);
		for (const id of ['aline', 'davi']) {
			expect(r.get(id)!.assento?.sala).toBe('recepcao');
			expect(r.get(id)!.assento?.id).not.toBe(sofas[0].id);
		}
		expect(r.get('aline')!.assento?.id).not.toBe(r.get('davi')!.assento?.id);
	});

	it('a cada 3 h parado, muda de ambiente (e pode ir para qualquer sala)', () => {
		const salas = new Set<string>();
		let anterior = '';
		let trocas = 0;
		for (let n = 1; n <= 12; n++) {
			const a = alvos([pessoa('davi', 'offline', { paradoHa: horas(3 * n) + 60 })]).get('davi')!;
			salas.add(a.assento!.sala);
			if (a.chave !== anterior) trocas++;
			anterior = a.chave;
		}
		expect(trocas).toBeGreaterThan(9);
		expect(salas.size).toBeGreaterThan(3);
		// dentro da mesma rodada, fica
		const x = alvos([pessoa('davi', 'offline', { paradoHa: horas(4) })]).get('davi')!.chave;
		const y = alvos([pessoa('davi', 'offline', { paradoHa: horas(5.9) })]).get('davi')!.chave;
		expect(x).toBe(y);
		expect(TROCA_DE_AMBIENTE).toBe(horas(3));
	});

	it('ausente também muda a cada 3 h', () => {
		const copa = assentos().find((x) => x.sala === 'copa')!;
		const antes = alvos([pessoa('davi', 'inativo', { assento: copa.id, paradoHa: 60 })]).get('davi')!;
		const depois = alvos([pessoa('davi', 'inativo', { assento: copa.id, paradoHa: horas(3) + 60 })]).get('davi')!;
		expect(antes.assento?.id).toBe(copa.id);
		expect(depois.chave).not.toBe(antes.chave);
	});

	it('CEO fica sempre na Diretoria: ausente em qualquer rodada; offline, depois das primeiras 3 h', () => {
		const ceo = lugaresDoCeo()[0];
		for (const h of [0, 4, 7, 20]) {
			const a = alvos([pessoa('bruno', 'inativo', { ceo: true, assento: ceo.id, paradoHa: horas(h) })]).get('bruno')!;
			expect(a.assento?.sala, `${h} h`).toBe('diretoria');
		}
		expect(alvos([pessoa('bruno', 'offline', { ceo: true, paradoHa: 60 })]).get('bruno')!.assento?.sala).toBe('recepcao');
		expect(alvos([pessoa('bruno', 'offline', { ceo: true, paradoHa: horas(3.5) })]).get('bruno')!.assento?.sala).toBe('diretoria');
	});

	it('Bruno e Aline ficam na sala de cada um, e ninguém mais é sorteado para lá (10/11/2026)', () => {
		const dele = lugaresDoCeo(BRUNO)[0];
		expect(dele.nome).toBe('Cadeira do Bruno');
		for (const h of [0, 4, 7, 20]) {
			const a = alvos([pessoa(BRUNO, 'inativo', { ceo: true, assento: dele.id, paradoHa: horas(h) })]).get(BRUNO)!;
			expect(a.assento?.sala, `${h} h`).toBe('sala-bruno');
		}
		// Ausente com um lugar velho da Diretoria guardado: vai para a sala dela mesmo assim
		const velho = lugaresDoCeo()[0];
		expect(alvos([pessoa(ALINE, 'inativo', { ceo: true, assento: velho.id })]).get(ALINE)!.assento?.sala).toBe('sala-aline');
		expect(alvos([pessoa(ALINE, 'offline', { ceo: true, paradoHa: horas(3.5) })]).get(ALINE)!.assento?.sala).toBe('sala-aline');
		// Quem não é dono, parado há horas, nunca cai nelas
		for (let n = 0; n < 60; n++) {
			const a = alvos([pessoa(`p${n}`, 'offline', { paradoHa: horas(3 + 3 * (n % 7)) })]).get(`p${n}`)!;
			expect(a.assento?.sala ?? '', `p${n}`).not.toMatch(/^sala-(bruno|aline)$/);
		}
	});

	it('ninguém divide lugar, e cadeira de agente fica de fora', () => {
		const lista = Array.from({ length: 12 }, (_, i) => pessoa(`p${i}`, i % 2 ? 'offline' : 'inativo', { paradoHa: horas(3 + i) }));
		const agentes = new Set(assentos().filter((a) => a.sala === 'dev').map((a) => a.id));
		const r = alvos(lista, { agentes });
		const ids = [...r.values()].map((a) => a.assento?.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(agentes.has(id!)).toBe(false);
	});

	it('a conta dá igual em qualquer ordem da lista, e alguém chegando não tira os outros do lugar', () => {
		const a = pessoa('a', 'offline', { paradoHa: horas(7) });
		const b = pessoa('b', 'offline', { paradoHa: horas(4) });
		const r1 = alvos([a, b]);
		const r2 = alvos([b, a]);
		expect(r1.get('a')!.chave).toBe(r2.get('a')!.chave);
		expect(r1.get('b')!.chave).toBe(r2.get('b')!.chave);
		const r3 = alvos([a, b, pessoa('c', 'offline', { paradoHa: horas(10) })]);
		expect(r3.get('a')!.chave).toBe(r1.get('a')!.chave);
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
		expect(deveMover({ chave: sentar.chave, mov: 200 }, lugar(200))).toBe(true);
	});
});
