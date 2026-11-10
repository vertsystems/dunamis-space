import { describe, expect, it } from 'vitest';
import { faltaPara, lerUso, nivelDoUso } from './uso';

// Resposta real do get_usage (10/11/2026), resumida
const RESPOSTA = {
	subscription_type: 'max',
	rate_limits_available: true,
	rate_limits: {
		five_hour: { utilization: 16, resets_at: '2026-11-10T07:30:00.369906+00:00' },
		seven_day: { utilization: 17, resets_at: '2026-11-11T15:00:00.369930+00:00' },
		seven_day_opus: null,
		limits: [
			{ kind: 'session', percent: 16, resets_at: '2026-11-10T07:30:00.369906+00:00', scope: null },
			{ kind: 'weekly_all', percent: 17, resets_at: '2026-11-11T15:00:00.369930+00:00', scope: null },
			{ kind: 'weekly_scoped', percent: 0, resets_at: '2026-11-11T15:00:00+00:00', scope: { model: { id: null, display_name: 'Fable' } } }
		]
	}
};

describe('lerUso', () => {
	it('lê plano, janela de 5 h, semana e o limite do Fable', () => {
		expect(lerUso(RESPOSTA)).toEqual({
			plano: 'max',
			sessao: { pct: 16, zera: '2026-11-10T07:30:00.369Z' },
			semanal: { pct: 17, zera: '2026-11-11T15:00:00.369Z' },
			modelos: [{ nome: 'Fable', pct: 0, zera: '2026-11-11T15:00:00.000Z' }]
		});
	});
	it('prefere model_scoped quando vem', () => {
		const r = lerUso({ ...RESPOSTA, rate_limits: { ...RESPOSTA.rate_limits, model_scoped: [{ display_name: 'Fable', utilization: 42, resets_at: '2026-11-11T15:00:00Z' }] } });
		expect(r!.modelos).toEqual([{ nome: 'Fable', pct: 42, zera: '2026-11-11T15:00:00.000Z' }]);
	});
	it('sem limite de plano (chave de API) ou resposta estranha: null', () => {
		expect(lerUso({ rate_limits_available: false, rate_limits: null })).toBeNull();
		expect(lerUso(null)).toBeNull();
		expect(lerUso({ rate_limits: { five_hour: { utilization: 'x' } } })).toEqual({ plano: null, sessao: null, semanal: null, modelos: [] });
	});
});

describe('faltaPara e nível', () => {
	const agora = Date.parse('2026-11-10T04:00:00Z');
	it('tempo até zerar, curto', () => {
		expect(faltaPara('2026-11-10T04:30:00Z', agora)).toBe('30 min');
		expect(faltaPara('2026-11-10T07:30:00Z', agora)).toBe('3 h 30 min');
		expect(faltaPara('2026-11-11T15:00:00Z', agora)).toBe('1 dia e 11 h');
		expect(faltaPara('2026-11-10T03:00:00Z', agora)).toBe('menos de 1 min');
		expect(faltaPara(null, agora)).toBe('');
	});
	it('cor do medidor', () => {
		expect(nivelDoUso(10)).toBe('ok');
		expect(nivelDoUso(70)).toBe('atencao');
		expect(nivelDoUso(90)).toBe('critico');
	});
});
