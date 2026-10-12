import { describe, expect, it } from 'vitest';
import { haQuantoCurto, horasDeHoje, melhorPagina, variacao } from './tv';
import { AGORA_VAZIO } from './painel';

describe('variacao', () => {
	it('hoje contra ontem até a mesma hora', () => {
		expect(variacao(112, 100)).toBeCloseTo(0.12);
		expect(variacao(50, 100)).toBeCloseTo(-0.5);
		expect(variacao(10, 0)).toBeNull();
	});
});

describe('melhorPagina', () => {
	const hoje = {
		visitas: 0,
		visualizacoes: 0,
		segundos: 0,
		serie: [],
		paises: [],
		paginas: [
			{ valor: '/b', visitas: 3, visualizacoes: 9, site_id: 's1' },
			{ valor: '/a', visitas: 5, visualizacoes: 6, site_id: 's2' }
		]
	};
	it('a que tem mais gente agora', () => {
		const agora = { ...AGORA_VAZIO, pessoas: 2, paginas: [{ site_id: 's1', caminho: '/b', pessoas: 2 }] };
		expect(melhorPagina({ agora, hoje })).toEqual({ site_id: 's1', caminho: '/b', numero: 2, agora: true });
	});
	it('sem ninguém agora, a mais visitada de hoje', () => {
		expect(melhorPagina({ agora: AGORA_VAZIO, hoje })).toEqual({ site_id: 's2', caminho: '/a', numero: 5, agora: false });
		expect(melhorPagina({ agora: AGORA_VAZIO, hoje: { ...hoje, paginas: [] } })).toBeNull();
	});
});

describe('horasDeHoje', () => {
	it('24 horas no horário de Brasília, as futuras marcadas', () => {
		// 13:00 UTC = 10h em Brasília
		const h = horasDeHoje(
			[
				{ momento: '2026-10-12T03:00:00Z', visitas: 4, visualizacoes: 4 },
				{ momento: '2026-10-12T13:00:00Z', visitas: 7, visualizacoes: 9 }
			],
			new Date('2026-10-12T13:20:00Z')
		);
		expect(h).toHaveLength(24);
		expect(h[0]).toEqual({ hora: 0, visitas: 4, futura: false });
		expect(h[10]).toEqual({ hora: 10, visitas: 7, futura: false });
		expect(h[11].futura).toBe(true);
	});
});

describe('haQuantoCurto', () => {
	const agora = new Date('2026-10-12T12:00:00Z');
	it('segundos, minutos e horas', () => {
		expect(haQuantoCurto('2026-10-12T11:59:55Z', agora)).toBe('agora');
		expect(haQuantoCurto('2026-10-12T11:59:20Z', agora)).toBe('há 40 s');
		expect(haQuantoCurto('2026-10-12T11:57:00Z', agora)).toBe('há 3 min');
		expect(haQuantoCurto('2026-10-12T09:30:00Z', agora)).toBe('há 2 h');
	});
});
