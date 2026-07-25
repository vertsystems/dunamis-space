// Aritmética de data com fuso: o servidor da Vercel roda em UTC e o app é
// brasileiro, então "hoje" calculado errado desloca lançamento financeiro e
// meta do CRM para o dia (ou mês) seguinte. É o tipo de bug que regride sem
// aviso, porque só aparece depois das 21h.
import { describe, it, expect } from 'vitest';
import { hojeISO, mesRefSP, intervaloMesSP } from './datas';

describe('hojeISO', () => {
	it('usa o fuso de São Paulo, não UTC', () => {
		// 2026-07-16T01:30:00Z = 15/07 às 22h30 em São Paulo.
		expect(hojeISO(new Date('2026-07-16T01:30:00Z'))).toBe('2026-07-15');
	});

	it('vira o dia no horário certo', () => {
		// 02:59Z = 23:59 do dia anterior em SP; 03:00Z = 00:00 do dia em SP.
		expect(hojeISO(new Date('2026-07-16T02:59:00Z'))).toBe('2026-07-15');
		expect(hojeISO(new Date('2026-07-16T03:00:00Z'))).toBe('2026-07-16');
	});

	it('devolve YYYY-MM-DD com zero à esquerda', () => {
		expect(hojeISO(new Date('2026-03-05T15:00:00Z'))).toBe('2026-03-05');
	});
});

describe('mesRefSP', () => {
	it('não adianta o mês na virada', () => {
		// Este é exatamente o bug da meta do CRM: 31/07 às 21h30 em SP já é
		// 01/08 em UTC, e a meta era gravada em agosto e sumia da tela de julho.
		expect(mesRefSP(new Date('2026-08-01T00:30:00Z'))).toEqual({ ano: 2026, mes: 7 });
	});

	it('vira o mês quando de fato virou em SP', () => {
		expect(mesRefSP(new Date('2026-08-01T03:00:00Z'))).toEqual({ ano: 2026, mes: 8 });
	});

	it('vira o ano corretamente', () => {
		expect(mesRefSP(new Date('2027-01-01T02:00:00Z'))).toEqual({ ano: 2026, mes: 12 });
	});
});

describe('intervaloMesSP', () => {
	it('pega o último dia de mês de 31', () => {
		expect(intervaloMesSP(new Date('2026-07-10T15:00:00Z'))).toEqual({
			inicio: '2026-07-01',
			fim: '2026-07-31'
		});
	});

	it('pega o último dia de mês de 30', () => {
		expect(intervaloMesSP(new Date('2026-04-10T15:00:00Z'))).toEqual({
			inicio: '2026-04-01',
			fim: '2026-04-30'
		});
	});

	it('trata fevereiro em ano bissexto', () => {
		expect(intervaloMesSP(new Date('2028-02-10T15:00:00Z'))).toEqual({
			inicio: '2028-02-01',
			fim: '2028-02-29'
		});
		expect(intervaloMesSP(new Date('2026-02-10T15:00:00Z')).fim).toBe('2026-02-28');
	});
});
