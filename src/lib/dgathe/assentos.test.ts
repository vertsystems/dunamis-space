import { describe, expect, it } from 'vitest';
import { assentos, assentoPorId, escolherAssento, lugarDoMovelPerto, lugaresDeQuemSaiu, lugaresDoCeo, lugaresDoMovel, salaDoCeo, SENTADO_MEIA } from './assentos';
import { ALINE, BRUNO, ITENS, celulaLivre, zonaDaCelula } from './mapa';

const caixaDoAssento = (a: { ox: number; oy: number }) => ({ x0: a.ox - SENTADO_MEIA, y0: a.oy - SENTADO_MEIA, x1: a.ox + SENTADO_MEIA, y1: a.oy + SENTADO_MEIA });
const cruza = (a: { x0: number; y0: number; x1: number; y1: number }, b: { x: number; y: number; w: number; d: number }) =>
	a.x0 < b.x + b.w && b.x < a.x1 && a.y0 < b.y + b.d && b.y < a.y1;

describe('assentos do escritório', () => {
	it('há lugar na Diretoria, na recepção, na copa e nas salas de trabalho', () => {
		const salas = new Set(assentos().map((a) => a.sala));
		for (const s of ['sala-bruno', 'sala-aline', 'recepcao', 'copa', 'reuniao', 'financeiro', 'comercial', 'dev', 'marketing', 'trafego']) expect(salas.has(s), s).toBe(true);
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

	it('a Diretoria foi esvaziada: CEO sem sala própria segue a regra de todos', () => {
		expect(salaDoCeo('outra-pessoa')).toBeNull();
		expect(lugaresDoCeo('outra-pessoa')).toEqual([]);
		const a = escolherAssento({ ceo: true, id: 'outra-pessoa', ocupados: new Set(), semente: 7 })!;
		expect(['recepcao', 'copa', 'reuniao', 'financeiro', 'comercial', 'dev', 'marketing', 'trafego']).toContain(a.sala);
	});

	it('Bruno e Aline vão para a sala de cada um, primeiro a cadeira deles (10/11/2026)', () => {
		expect(salaDoCeo(BRUNO)).toBe('sala-bruno');
		expect(salaDoCeo(ALINE)).toBe('sala-aline');
		const bruno = escolherAssento({ ceo: true, id: BRUNO, ocupados: new Set(), semente: 7 });
		expect(bruno).toMatchObject({ sala: 'sala-bruno', nome: 'Cadeira do Bruno' });
		const aline = escolherAssento({ ceo: true, id: ALINE, ocupados: new Set(), semente: 7 });
		expect(aline).toMatchObject({ sala: 'sala-aline', nome: 'Cadeira da Aline' });
		// Cadeira ocupada: outro lugar na mesma sala
		const outro = escolherAssento({ ceo: true, id: BRUNO, ocupados: new Set([bruno!.id]), semente: 7 });
		expect(outro?.sala).toBe('sala-bruno');
		expect(outro?.id).not.toBe(bruno?.id);
		expect(lugaresDoCeo(ALINE).every((a) => a.sala === 'sala-aline')).toBe(true);
		// A cadeira do assessor fica na sala do Bruno, mas é de agente
		expect(lugaresDoCeo(BRUNO).some((a) => /assessor/i.test(a.nome))).toBe(false);
	});

	it('clicar num móvel: a cadeira tem um lugar, o sofá dois, e vale o mais perto do clique (10/11/2026)', () => {
		const cadeira = ITENS.find((i) => i.nome === 'Cadeira do Bruno')!;
		expect(lugaresDoMovel(cadeira)).toHaveLength(1);
		const sofa = ITENS.find((i) => i.tipo === 'sofa' && i.sala === 'copa')!;
		const dois = lugaresDoMovel(sofa);
		expect(dois).toHaveLength(2);
		const [a, b] = dois;
		expect(lugarDoMovelPerto(sofa, a.sx, a.sy)?.id).toBe(a.id);
		expect(lugarDoMovelPerto(sofa, b.sx, b.sy)?.id).toBe(b.id);
		// O mais perto está tomado: fica com o outro lugar do sofá
		expect(lugarDoMovelPerto(sofa, a.sx, a.sy, new Set([a.id]))?.id).toBe(b.id);
		// Mesa não é de sentar
		expect(lugaresDoMovel(ITENS.find((i) => i.nome === 'Mesa do Bruno')!)).toEqual([]);
		expect(lugarDoMovelPerto(ITENS.find((i) => i.tipo === 'arvore')!, 0, 0)).toBeNull();
	});

	it('ninguém mais é sorteado para sentar nas salas do Bruno e da Aline', () => {
		for (let semente = 1; semente < 400; semente++) {
			const a = escolherAssento({ ceo: false, ocupados: new Set(), semente })!;
			expect(a.sala, String(semente)).not.toMatch(/^sala-(bruno|aline)$/);
		}
	});

	it('os outros vão para a recepção, a copa ou uma sala sorteada, nunca uma sala com dono nem lugar ocupado', () => {
		const vistas = new Set<string>();
		for (let semente = 1; semente < 400; semente++) {
			const a = escolherAssento({ ceo: false, ocupados: new Set(), semente })!;
			expect(a.sala).not.toMatch(/^sala-(bruno|aline)$/);
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
