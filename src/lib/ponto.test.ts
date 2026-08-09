// O ponto é a folha de pagamento da agência em miniatura: um erro de fuso ou
// um dia deixado em aberto viram horas a mais (ou a menos) no fechamento do
// mês. Estes testes fixam as regras que ninguém percebe quebrando na tela.
import { describe, it, expect } from 'vitest';
import {
	csvDoMes,
	deslocaMes,
	diasDoIntervalo,
	ehFalta,
	esperadoNoDia,
	formatMinutos,
	formatSaldo,
	horaSP,
	instanteSP,
	intervaloDoMes,
	minutosAlmoco,
	minutosTrabalhados,
	proximaBatida,
	registroVazio,
	resumoPeriodo,
	saldoDoDia,
	statusDe,
	type Jornada,
	type Registro
} from './ponto';

const J: Jornada = { minutos: 480, dias: [1, 2, 3, 4, 5] };

/** Registro de um dia com horas locais de SP ("08:00"), como a tela grava. */
function dia(data: string, horas: Partial<Record<'e' | 'as' | 'av' | 's', string>>): Registro {
	return {
		data,
		entrada: instanteSP(data, horas.e),
		almoco_saida: instanteSP(data, horas.as),
		almoco_volta: instanteSP(data, horas.av),
		saida: instanteSP(data, horas.s)
	};
}

describe('fuso de São Paulo', () => {
	it('grava a hora local como instante e lê de volta igual', () => {
		const iso = instanteSP('2026-08-10', '08:15');
		expect(iso).toBe('2026-08-10T08:15:00-03:00');
		expect(horaSP(iso)).toBe('08:15');
	});

	it('mostra a hora de SP mesmo com o instante em UTC', () => {
		// 22:30 em SP = 01:30Z do dia seguinte — o caso que o toISOString erra.
		expect(horaSP('2026-08-11T01:30:00Z')).toBe('22:30');
	});

	it('recusa hora vazia ou inválida (é assim que a tela apaga uma batida)', () => {
		expect(instanteSP('2026-08-10', '')).toBeNull();
		expect(instanteSP('2026-08-10', null)).toBeNull();
		expect(instanteSP('2026-08-10', '25:00')).toBeNull();
		expect(instanteSP('2026-08-10', 'abc')).toBeNull();
	});
});

describe('proximaBatida', () => {
	it('segue a ordem entrada → almoço → volta → saída', () => {
		const d = '2026-08-10';
		expect(proximaBatida(registroVazio(d))).toBe('entrada');
		expect(proximaBatida(dia(d, { e: '08:00' }))).toBe('almoco_saida');
		expect(proximaBatida(dia(d, { e: '08:00', as: '12:00' }))).toBe('almoco_volta');
		expect(proximaBatida(dia(d, { e: '08:00', as: '12:00', av: '13:00' }))).toBe('saida');
		expect(proximaBatida(dia(d, { e: '08:00', as: '12:00', av: '13:00', s: '18:00' }))).toBeNull();
	});
});

describe('statusDe', () => {
	const d = '2026-08-10';
	it('reconhece cada momento do dia', () => {
		expect(statusDe(registroVazio(d))).toBe('nao_iniciado');
		expect(statusDe(dia(d, { e: '08:00' }))).toBe('trabalhando');
		expect(statusDe(dia(d, { e: '08:00', as: '12:00' }))).toBe('almoco');
		expect(statusDe(dia(d, { e: '08:00', as: '12:00', av: '13:00' }))).toBe('trabalhando');
		expect(statusDe(dia(d, { e: '08:00', s: '17:00' }))).toBe('encerrado');
	});
});

describe('minutosTrabalhados', () => {
	const d = '2026-08-10';

	it('desconta o almoço', () => {
		// 08:00–18:00 com 1h de almoço = 9h.
		expect(minutosTrabalhados(dia(d, { e: '08:00', as: '12:00', av: '13:00', s: '18:00' }))).toBe(540);
	});

	it('conta o dia inteiro quando não houve almoço', () => {
		expect(minutosTrabalhados(dia(d, { e: '08:00', s: '12:00' }))).toBe(240);
	});

	it('congela durante o almoço', () => {
		const agora = new Date('2026-08-10T15:30:00Z'); // 12:30 em SP
		expect(minutosTrabalhados(dia(d, { e: '08:00', as: '12:00' }), agora)).toBe(240);
	});

	it('anda com o relógio enquanto o expediente está aberto', () => {
		const agora = new Date('2026-08-10T13:00:00Z'); // 10:00 em SP
		expect(minutosTrabalhados(dia(d, { e: '08:00' }), agora)).toBe(120);
	});

	it('não deixa um dia passado em aberto correr para sempre', () => {
		// Esqueceu a saída ontem: só o bloco fechado da manhã conta — sem isto,
		// uma batida esquecida viraria centenas de horas de crédito.
		const agora = new Date('2026-08-12T13:00:00Z');
		expect(minutosTrabalhados(dia(d, { e: '08:00', as: '12:00' }), agora)).toBe(240);
		expect(minutosTrabalhados(dia(d, { e: '08:00' }), agora)).toBe(0);
	});

	it('dia sem entrada é zero', () => {
		expect(minutosTrabalhados(registroVazio(d))).toBe(0);
		expect(minutosTrabalhados(null)).toBe(0);
	});

	it('mede o almoço só com o par completo', () => {
		expect(minutosAlmoco(dia(d, { e: '08:00', as: '12:00', av: '13:12' }))).toBe(72);
		expect(minutosAlmoco(dia(d, { e: '08:00', as: '12:00' }))).toBe(0);
	});
});

describe('jornada e saldo', () => {
	it('só espera jornada nos dias de trabalho', () => {
		expect(esperadoNoDia('2026-08-10', J)).toBe(480); // segunda
		expect(esperadoNoDia('2026-08-09', J)).toBe(0); // domingo
	});

	it('não cobra o dia que ainda está em curso', () => {
		const hoje = '2026-08-10';
		expect(saldoDoDia(dia(hoje, { e: '08:00' }), hoje, J, hoje)).toBe(0);
	});

	it('fecha a conta quando o expediente é encerrado', () => {
		const hoje = '2026-08-10';
		const r = dia(hoje, { e: '08:00', as: '12:00', av: '13:00', s: '18:00' });
		expect(saldoDoDia(r, hoje, J, hoje)).toBe(60);
	});

	it('dia útil passado sem batida nenhuma é falta', () => {
		expect(ehFalta(null, '2026-08-10', J, '2026-08-12')).toBe(true);
		expect(ehFalta(null, '2026-08-09', J, '2026-08-12')).toBe(false); // domingo
		expect(ehFalta(null, '2026-08-12', J, '2026-08-12')).toBe(false); // hoje
	});
});

describe('resumoPeriodo', () => {
	it('soma horas, faltas e saldo até hoje', () => {
		// Semana de 10/08 (seg) a 14/08 (sex), com hoje = quarta 12/08.
		const registros = [
			dia('2026-08-10', { e: '08:00', as: '12:00', av: '13:00', s: '18:00' }), // 9h → +1h
			// 11/08 sem batida = falta (−8h)
			dia('2026-08-12', { e: '08:00' }) // em curso, não conta no saldo
		];
		const r = resumoPeriodo(registros, J, '2026-08-10', '2026-08-14', '2026-08-12');
		expect(r.diasTrabalhados).toBe(2);
		expect(r.faltas).toBe(1);
		expect(r.saldo).toBe(60 - 480);
		// Quinta e sexta ainda não aconteceram: não entram no esperado.
		expect(r.minutosEsperados).toBe(960);
	});

	it('ignora dias futuros', () => {
		const r = resumoPeriodo([], J, '2026-08-10', '2026-08-31', '2026-08-09');
		expect(r).toEqual({
			diasTrabalhados: 0,
			faltas: 0,
			minutosTrabalhados: 0,
			minutosEsperados: 0,
			saldo: 0
		});
	});
});

describe('formatação', () => {
	it('formata horas do jeito que a agência lê', () => {
		expect(formatMinutos(465)).toBe('7h45');
		expect(formatMinutos(480)).toBe('8h');
		expect(formatMinutos(45)).toBe('45min');
		expect(formatMinutos(0)).toBe('0min');
	});

	it('deixa o sinal do saldo explícito', () => {
		expect(formatSaldo(80)).toBe('+1h20');
		expect(formatSaldo(-45)).toBe('−45min');
		expect(formatSaldo(0)).toBe('0h');
	});
});

describe('períodos', () => {
	it('delimita o mês', () => {
		expect(intervaloDoMes('2026-02')).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' });
		expect(intervaloDoMes('2026-08')).toEqual({ inicio: '2026-08-01', fim: '2026-08-31' });
	});

	it('lista os dias inclusive as pontas', () => {
		expect(diasDoIntervalo('2026-08-10', '2026-08-12')).toEqual([
			'2026-08-10',
			'2026-08-11',
			'2026-08-12'
		]);
	});

	it('navega entre meses virando o ano', () => {
		expect(deslocaMes('2026-01', -1)).toBe('2025-12');
		expect(deslocaMes('2026-12', 1)).toBe('2027-01');
	});
});

describe('csvDoMes', () => {
	it('exporta com ponto e vírgula e data brasileira', () => {
		const csv = csvDoMes(
			[
				{
					nome: 'Ana; Souza',
					data: '2026-08-10',
					registro: dia('2026-08-10', { e: '08:00', as: '12:00', av: '13:00', s: '18:00' }),
					jornada: J
				}
			],
			'2026-08-12'
		);
		const [, linha] = csv.split('\n');
		expect(linha).toBe('"Ana; Souza";10/08/2026;08:00;12:00;13:00;18:00;9h;8h;+1h');
	});
});
