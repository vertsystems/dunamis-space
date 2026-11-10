import { describe, expect, it } from 'vitest';
import { HORA, PAUSA_POR_HORA, destinosDosAgentes, pausaAgora, pausasDaHora, pontasDoPinguePongue, pontosDePasseio, type AgenteNaRotina } from './rotina';
import { assentos, type Assento } from './assentos';
import { SALA_POR_ID, celulaLivre, zonaDaCelula } from './mapa';

const HORA0 = 491_741; // uma hora qualquer (número da hora desde 1970)

describe('pausas', () => {
	it('somam exatamente 20% de cada hora, dentro da hora', () => {
		for (const id of ['lewis', 'clovis', 'shakira', 'steve', 'aoki']) {
			for (let h = HORA0; h < HORA0 + 48; h++) {
				const ps = pausasDaHora(id, h);
				expect(ps.reduce((t, p) => t + (p.fim - p.inicio), 0)).toBe(PAUSA_POR_HORA);
				for (const p of ps) {
					expect(p.inicio).toBeGreaterThanOrEqual(h * HORA);
					expect(p.fim).toBeLessThanOrEqual((h + 1) * HORA);
				}
			}
		}
	});
	it('cada agente tem o seu horário, e às vezes a pausa vem em dois pedaços', () => {
		const inicios = ['lewis', 'clovis', 'shakira', 'steve', 'aoki', 'bonjovi'].map((id) => pausasDaHora(id, HORA0)[0].inicio);
		expect(new Set(inicios).size).toBeGreaterThan(3);
		const pedacos = Array.from({ length: 60 }, (_, i) => pausasDaHora('lewis', HORA0 + i).length);
		expect(pedacos).toContain(1);
		expect(pedacos).toContain(2);
	});
	it('pausaAgora acerta o começo e o fim', () => {
		const [p] = pausasDaHora('clovis', HORA0);
		expect(pausaAgora('clovis', p.inicio)).not.toBeNull();
		expect(pausaAgora('clovis', p.fim - 1)).not.toBeNull();
		expect(pausaAgora('clovis', p.inicio - 1)?.inicio === p.inicio).toBe(false);
	});
	it('em 24 h o agente fica 80% no posto', () => {
		let fora = 0;
		for (let s = HORA0 * HORA; s < (HORA0 + 24) * HORA; s += 30) if (pausaAgora('steve', s)) fora += 30;
		expect(fora / (24 * HORA)).toBeCloseTo(0.2, 2);
	});
});

describe('lugares de pausa', () => {
	it('as pontas do pingue-pongue são chão livre, uma de frente para a outra', () => {
		const p = pontasDoPinguePongue();
		expect(p).toHaveLength(2);
		for (const a of p) expect(celulaLivre(Math.floor(a.x), Math.floor(a.y))).toBe(true);
		// De frente um para o outro
		expect(p[0].dirX + p[1].dirX).toBe(0);
		expect(p[0].dirY + p[1].dirY).toBe(0);
	});
	it('passeio: chão livre da própria sala, sem colar nas cadeiras', () => {
		for (const sala of ['design', 'dev', 'recepcao']) {
			const pontos = pontosDePasseio(sala);
			expect(pontos.length).toBeGreaterThan(1);
			for (const p of pontos) {
				expect(zonaDaCelula(Math.floor(p.x), Math.floor(p.y))).toBe(sala);
				expect(assentos().some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 1)).toBe(false);
			}
		}
	});
});

describe('destinosDosAgentes', () => {
	const cadeirasDev = assentos().filter((a) => a.sala === 'dev' && a.sentado && a.movel === 'cadeira');
	const agentes: AgenteNaRotina[] = cadeirasDev.slice(0, 8).map((_, i) => ({ id: `a${i}`, sala: 'dev', ordem: i, ocupado: false, reuniao: null }));
	const postos = new Map<string, Assento>(agentes.map((a, i) => [a.id, cadeirasDev[i]]));
	const reservados = new Set([...postos.values()].map((p) => p.id));

	it('com tarefa fica sempre no posto; em reunião vai para a sala da reunião', () => {
		const lista = agentes.map((a, i) => ({ ...a, ocupado: i === 0, reuniao: i === 1 ? 'reuniao' : null }));
		for (let s = HORA0 * HORA; s < (HORA0 + 3) * HORA; s += 120) {
			const d = destinosDosAgentes(lista, s, postos, reservados);
			expect(d.get('a0')).toMatchObject({ motivo: 'posto', lugar: cadeirasDev[0] });
			expect(d.get('a1')!.motivo).toBe('reuniao');
			expect(d.get('a1')!.lugar.sala).toBe('reuniao');
		}
	});
	it('ninguém divide lugar, ninguém usa o posto de outro agente, e todos aparecem', () => {
		for (let s = HORA0 * HORA; s < (HORA0 + 6) * HORA; s += 60) {
			const d = destinosDosAgentes(agentes, s, postos, reservados);
			expect(d.size).toBe(agentes.length);
			const ids = [...d.values()].map((x) => x.lugar.id);
			expect(new Set(ids).size).toBe(ids.length);
			for (const [id, x] of d) {
				if (x.motivo === 'posto') expect(x.lugar).toBe(postos.get(id));
				else expect(reservados.has(x.lugar.id)).toBe(false);
				if (x.motivo === 'pausa' && x.atividade === 'passeio') expect(x.lugar.sala).not.toBe('dev');
			}
		}
	});
	it('pingue-pongue só em dupla', () => {
		let vistos = 0;
		for (let s = HORA0 * HORA; s < (HORA0 + 48) * HORA; s += 60) {
			const d = destinosDosAgentes(agentes, s, postos, reservados);
			const jogando = [...d.values()].filter((x) => x.atividade === 'pinguePongue').length;
			expect([0, 2]).toContain(jogando);
			if (jogando) vistos++;
		}
		expect(vistos).toBeGreaterThan(0);
	});
	it('a mesma conta dá o mesmo resultado (todas as telas iguais)', () => {
		const s = (HORA0 + 2) * HORA + 777;
		const a = destinosDosAgentes(agentes, s, postos, reservados);
		const b = destinosDosAgentes([...agentes].reverse(), s, postos, reservados);
		for (const ag of agentes) expect(a.get(ag.id)!.lugar.id).toBe(b.get(ag.id)!.lugar.id);
	});

	it('na pausa do sofá, ninguém vai para a sala do Bruno nem para a da Aline (10/11/2026)', () => {
		const lista: AgenteNaRotina[] = Array.from({ length: 12 }, (_, i) => ({ id: `a${i}`, sala: 'dev', ordem: i, ocupado: false, reuniao: null }));
		const postos = new Map(lista.map((a, i) => [a.id, assentos().filter((s) => s.sala === 'dev' && s.sentado)[i]]));
		for (let h = 0; h < 48; h++) {
			for (let m = 0; m < 60; m += 3) {
				const r = destinosDosAgentes(lista, h * HORA + m * 60, postos, new Set());
				for (const d of r.values()) expect(SALA_POR_ID.get(d.lugar.sala)?.dono, d.lugar.id).toBeUndefined();
			}
		}
	});
});
