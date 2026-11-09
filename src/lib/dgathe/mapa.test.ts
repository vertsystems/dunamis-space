import { describe, expect, it } from 'vitest';
import {
	ALTURA,
	ASSENTOS,
	INICIO,
	ITENS,
	LARGURA,
	SALAS,
	SETORES,
	SEGMENTOS,
	celulaLivre,
	chegadaDaSala,
	paredeEntre,
	zonaDaCelula
} from './mapa';
import { aEstrela, type Grade } from './caminho';

const GRADE: Grade = { largura: LARGURA, altura: ALTURA, livre: celulaLivre, parede: paredeEntre };
const inicio = { x: Math.floor(INICIO.x), y: Math.floor(INICIO.y) };

describe('mapa do escritório', () => {
	it('o avatar começa numa célula livre da recepção', () => {
		expect(celulaLivre(inicio.x, inicio.y)).toBe(true);
		expect(zonaDaCelula(inicio.x, inicio.y)).toBe('recepcao');
	});

	it('toda sala tem um lugar livre e dá para chegar nela a partir da recepção', () => {
		for (const sala of SALAS) {
			const alvo = chegadaDaSala(sala.id);
			expect(alvo, sala.id).not.toBeNull();
			const celulas = aEstrela(GRADE, inicio, { x: Math.floor(alvo!.x), y: Math.floor(alvo!.y) });
			expect(celulas, `sem caminho até ${sala.id}`).not.toBeNull();
		}
	});

	it('todo assento da recepção fica em chão livre, na recepção, e dá para chegar nele', () => {
		for (const a of ASSENTOS) {
			const c = { x: Math.floor(a.x), y: Math.floor(a.y) };
			expect(celulaLivre(c.x, c.y), `${a.x},${a.y}`).toBe(true);
			expect(zonaDaCelula(c.x, c.y)).toBe('recepcao');
			expect(aEstrela(GRADE, inicio, c), `sem caminho até ${a.x},${a.y}`).not.toBeNull();
		}
	});

	it('quem senta fica na beira do sofá, de frente para fora dele', () => {
		const sofas = ITENS.filter((i) => i.tipo === 'sofa' && i.sala === 'recepcao');
		expect(sofas).toHaveLength(2);
		for (const a of ASSENTOS.filter((x) => x.sentado)) {
			const sofa = sofas.find((s) => a.sy > s.y && a.sy < s.y + s.d && Math.abs(a.sx - (a.dirX > 0 ? s.x + s.w : s.x)) < 0.1);
			expect(sofa, `${a.sx},${a.sy}`).toBeDefined();
		}
	});

	it('dá para sair pela porta da frente e dar a volta no prédio', () => {
		expect(aEstrela(GRADE, inicio, { x: 0, y: 3 })).not.toBeNull();
		expect(aEstrela(GRADE, inicio, { x: 46, y: 0 })).not.toBeNull();
	});

	it('toda porta tem chão livre dos dois lados', () => {
		for (const sala of SALAS) {
			for (const p of sala.portas) {
				const [a, b] =
					p.linha === 'h'
						? [
								{ x: p.x, y: p.y - 1 },
								{ x: p.x, y: p.y }
							]
						: [
								{ x: p.x - 1, y: p.y },
								{ x: p.x, y: p.y }
							];
				expect(celulaLivre(a.x, a.y) && celulaLivre(b.x, b.y), `porta de ${sala.id} em ${p.linha}${p.x},${p.y}`).toBe(true);
				expect(paredeEntre(a.x, a.y, b.x, b.y)).toBe(false);
			}
		}
	});

	it('cada móvel de dentro cabe inteiro na própria sala', () => {
		for (const it of ITENS) {
			if (!it.sala) continue;
			const s = SALAS.find((x) => x.id === it.sala)!;
			const dentro = it.x >= s.x0 - 0.001 && it.y >= s.y0 - 0.001 && it.x + it.w <= s.x1 + 1.001 && it.y + it.d <= s.y1 + 1.001;
			expect(dentro, `${it.nome} (${it.id}) fora de ${s.nome}`).toBe(true);
		}
	});

	it('nenhum móvel que bloqueia está em cima de outro', () => {
		const solidos = ITENS.filter((i) => i.bloqueia);
		for (let i = 0; i < solidos.length; i++) {
			for (let j = i + 1; j < solidos.length; j++) {
				const a = solidos[i];
				const b = solidos[j];
				const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
				const iy = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y);
				expect(ix > 0.01 && iy > 0.01, `${a.nome} (${a.id}) × ${b.nome} (${b.id})`).toBe(false);
			}
		}
	});

	it('as paredes do fundo são altas e as outras cortadas', () => {
		const altas = SEGMENTOS.filter((s) => s.alta);
		expect(altas.length).toBe(40 + 21);
		expect(altas.every((s) => (s.orient === 'x' && s.y === 4) || (s.orient === 'y' && s.x === 4))).toBe(true);
	});

	it('o contador de setores não inclui o corredor', () => {
		expect(SETORES.some((s) => s.id === 'corredor')).toBe(false);
		expect(SETORES.length).toBe(SALAS.length - 1);
	});
});
