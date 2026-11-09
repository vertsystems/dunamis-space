import { describe, expect, it } from 'vitest';
import { aplicarPresenca, aplicarRota, type Movel } from './movimento';

const parado = (x: number, y: number, mov: number): Movel => ({ x, y, dirX: 1, dirY: 1, andando: false, caminho: [], final: null, mov });
const presenca = (x: number, y: number, mov: number) => ({ x, y, dirX: 0, dirY: 1, mov });

describe('rota e presença de outra pessoa', () => {
	it('presença velha no meio da caminhada não faz o boneco voltar', () => {
		const o = parado(10, 10, 100);
		aplicarRota(o, [{ x: 10, y: 10 }, { x: 20, y: 10 }], 200);
		// O pulso dela (ou a conferência) reenvia o lugar de ANTES de sair
		aplicarPresenca(o, presenca(10, 10, 100));
		expect(o.caminho).toHaveLength(1);
		expect(o.final).toBeNull();
		expect(o.mov).toBe(200);
	});

	it('ela parou no fim do mesmo trajeto: termina de andar e fica lá', () => {
		const o = parado(10, 10, 100);
		aplicarRota(o, [{ x: 10, y: 10 }, { x: 20, y: 10 }], 200);
		aplicarPresenca(o, presenca(20, 10, 200));
		expect(o.caminho).toHaveLength(1);
		expect(o.final).toEqual({ x: 20, y: 10 });
	});

	it('presença de um movimento mais novo (o trajeto se perdeu) leva direto', () => {
		const o = parado(10, 10, 100);
		aplicarRota(o, [{ x: 10, y: 10 }, { x: 20, y: 10 }], 200);
		aplicarPresenca(o, presenca(30, 15, 300));
		expect(o).toMatchObject({ x: 30, y: 15, caminho: [], andando: false, final: null, mov: 300 });
	});

	it('depois de parar, reenvio da presença antiga não mexe', () => {
		const o = parado(20, 10, 200);
		aplicarPresenca(o, presenca(10, 10, 100));
		expect(o).toMatchObject({ x: 20, y: 10, mov: 200 });
	});

	it('trajeto que chega atrasado (mais velho) é ignorado', () => {
		const o = parado(20, 10, 300);
		expect(aplicarRota(o, [{ x: 1, y: 1 }, { x: 2, y: 2 }], 200)).toBe(false);
		expect(o).toMatchObject({ x: 20, y: 10, caminho: [] });
	});

	it('quem recarrega a página continua aceito (o carimbo é o relógio, e só cresce)', () => {
		const o = parado(20, 10, 1_700_000_000_000);
		aplicarPresenca(o, presenca(22, 12, 1_700_000_090_000));
		expect(o).toMatchObject({ x: 22, y: 12 });
	});
});
