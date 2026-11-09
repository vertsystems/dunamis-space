import { describe, expect, it } from 'vitest';
import { assentos, assentoPorId, escolherAssento, lugaresDeQuemSaiu, SENTADO_MEIA } from './assentos';
import { ITENS, celulaLivre, zonaDaCelula } from './mapa';

const caixaDoAssento = (a: { ox: number; oy: number }) => ({ x0: a.ox - SENTADO_MEIA, y0: a.oy - SENTADO_MEIA, x1: a.ox + SENTADO_MEIA, y1: a.oy + SENTADO_MEIA });
const cruza = (a: { x0: number; y0: number; x1: number; y1: number }, b: { x: number; y: number; w: number; d: number }) =>
	a.x0 < b.x + b.w && b.x < a.x1 && a.y0 < b.y + b.d && b.y < a.y1;

describe('assentos do escritório', () => {
	it('há lugar na Diretoria, na recepção, na copa e nas salas de trabalho', () => {
		const salas = new Set(assentos().map((a) => a.sala));
		for (const s of ['diretoria', 'recepcao', 'copa', 'reuniao', 'financeiro', 'comercial', 'dev', 'conteudo', 'design', 'trafego']) expect(salas.has(s), s).toBe(true);
	});

	it('todo assento tem chão livre na mesma sala para chegar', () => {
		for (const a of assentos()) {
			const c = { x: Math.floor(a.x), y: Math.floor(a.y) };
			expect(celulaLivre(c.x, c.y), a.id).toBe(true);
			expect(zonaDaCelula(c.x, c.y), a.id).toBe(a.sala);
			expect(Math.hypot(a.x - a.sx, a.y - a.sy), `${a.id} longe demais do chão livre`).toBeLessThan(2.2);
		}
	});

	it('o ponto que ordena o desenho não encosta em móvel nenhum (senão a ordem fica ambígua)', () => {
		for (const a of assentos().filter((x) => x.sentado)) {
			const batem = ITENS.filter((i) => i.bloqueia && cruza(caixaDoAssento(a), i));
			expect(batem.map((i) => i.nome), a.id).toEqual([]);
		}
	});

	it('quem saiu do dspace vai para os sofás da recepção (e em pé, se lotar)', () => {
		const lugares = lugaresDeQuemSaiu();
		expect(lugares.filter((a) => a.movel === 'sofa')).toHaveLength(4);
		expect(lugares.every((a) => a.sala === 'recepcao')).toBe(true);
	});

	it('CEO vai sempre para a Diretoria, primeiro a cadeira do CEO', () => {
		const a = escolherAssento({ ceo: true, ocupados: new Set(), semente: 7 });
		expect(a?.sala).toBe('diretoria');
		expect(a?.nome).toBe('Cadeira do CEO');
		// Cadeira ocupada (a outra CEO chegou antes): outro lugar na Diretoria
		const b = escolherAssento({ ceo: true, ocupados: new Set([a!.id]), semente: 7 });
		expect(b?.sala).toBe('diretoria');
		expect(b?.id).not.toBe(a?.id);
	});

	it('os outros vão para a recepção, a copa ou uma sala sorteada, nunca a Diretoria nem lugar ocupado', () => {
		const vistas = new Set<string>();
		for (let semente = 1; semente < 400; semente++) {
			const a = escolherAssento({ ceo: false, ocupados: new Set(), semente })!;
			expect(a.sala).not.toBe('diretoria');
			expect(a.sentado).toBe(true);
			vistas.add(a.sala);
		}
		expect(vistas.has('recepcao')).toBe(true);
		expect(vistas.has('copa')).toBe(true);
		expect(vistas.size).toBeGreaterThan(4);
		const copa = assentos().filter((a) => a.sala === 'copa').map((a) => a.id);
		for (let semente = 1; semente < 50; semente++) {
			const a = escolherAssento({ ceo: false, ocupados: new Set(copa), semente });
			expect(a?.sala).not.toBe('copa');
		}
	});

	it('a mesma semente dá o mesmo lugar (todas as abas concordam)', () => {
		const a = escolherAssento({ ceo: false, ocupados: new Set(), semente: 123456 });
		const b = escolherAssento({ ceo: false, ocupados: new Set(), semente: 123456 });
		expect(a?.id).toBe(b?.id);
		expect(assentoPorId(a!.id)).toBe(a);
	});
});
