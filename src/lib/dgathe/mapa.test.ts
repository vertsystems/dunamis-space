import { describe, expect, it } from 'vitest';
import {
	ALINE,
	ALTURA,
	BRUNO,
	INICIO,
	ITENS,
	LARGURA,
	SALAS,
	SETORES,
	SEGMENTOS,
	SALA_POR_ID,
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
		expect(altas.length).toBe(56 + 21);
		expect(altas.every((s) => (s.orient === 'x' && s.y === 4) || (s.orient === 'y' && s.x === 4))).toBe(true);
	});

	it('a sala de Desenvolvimento tem 2 baias de 6 lugares (12 cadeiras, 12 computadores)', () => {
		const dev = ITENS.filter((i) => i.sala === 'dev');
		expect(dev.filter((i) => i.tipo === 'cadeira' && i.nome === 'Cadeira de agente')).toHaveLength(12);
		// 12 nas baias e 1 na mesa do gerente
		expect(dev.filter((i) => i.tipo === 'monitor')).toHaveLength(13);
		expect(dev.filter((i) => i.tipo === 'mesa' && i.nome !== 'Mesa do gerente')).toHaveLength(2);
	});

	it('o Comercial tem 4 mesas maiores, cada uma com 2 cadeiras e 2 computadores', () => {
		const comercial = ITENS.filter((i) => i.sala === 'comercial');
		const mesas = comercial.filter((i) => i.tipo === 'mesa' && i.nome !== 'Mesa do gerente');
		expect(mesas).toHaveLength(4);
		for (const m of mesas) {
			expect(m.w).toBeGreaterThan(2.5);
			const naMesa = (i: (typeof ITENS)[number]) => i.x >= m.x - 0.1 && i.x + i.w <= m.x + m.w + 0.1;
			expect(comercial.filter((i) => i.tipo === 'monitor' && naMesa(i) && i.y > m.y && i.y < m.y + m.d)).toHaveLength(2);
			expect(comercial.filter((i) => i.tipo === 'cadeira' && naMesa(i) && i.y > m.y && i.y < m.y + 2)).toHaveLength(2);
		}
	});

	it('cada departamento tem uma mesa de gerente; a Diretoria, a do assessor', () => {
		for (const sala of ['financeiro', 'comercial', 'dev', 'conteudo', 'estudio', 'design', 'trafego']) {
			const itens = ITENS.filter((i) => i.sala === sala);
			expect(itens.filter((i) => i.nome === 'Mesa do gerente'), sala).toHaveLength(1);
			expect(itens.filter((i) => i.nome === 'Cadeira do gerente'), sala).toHaveLength(1);
		}
		const diretoria = ITENS.filter((i) => i.sala === 'diretoria');
		expect(diretoria.filter((i) => i.nome === 'Mesa do assessor')).toHaveLength(1);
		expect(diretoria.filter((i) => i.nome === 'Cadeira do assessor')).toHaveLength(1);
	});

	it('mesas de cada sala: Tráfego 2 e Design 3 de 2 lugares; Conteúdo 4 e Financeiro 3 de 1 computador', () => {
		const contar = (sala: string) => {
			const itens = ITENS.filter((i) => i.sala === sala && i.nome !== 'Mesa do gerente' && i.nome !== 'Cadeira do gerente');
			const gerente = ITENS.find((i) => i.sala === sala && i.nome === 'Mesa do gerente')!;
			const doGerente = (i: (typeof ITENS)[number]) => i.tipo === 'monitor' && i.x >= gerente.x && i.x <= gerente.x + gerente.w && i.y >= gerente.y && i.y <= gerente.y + gerente.d;
			return {
				mesas: itens.filter((i) => i.tipo === 'mesa').length,
				cadeiras: itens.filter((i) => i.tipo === 'cadeira').length,
				computadores: itens.filter((i) => i.tipo === 'monitor' && !doGerente(i)).length
			};
		};
		expect(contar('trafego')).toEqual({ mesas: 2, cadeiras: 4, computadores: 4 });
		expect(contar('design')).toEqual({ mesas: 3, cadeiras: 6, computadores: 6 });
		expect(contar('conteudo')).toEqual({ mesas: 4, cadeiras: 4, computadores: 4 });
		expect(contar('financeiro')).toEqual({ mesas: 3, cadeiras: 3, computadores: 3 });
	});

	it('o prédio cresceu para a esquerda: sala do Bruno, sala da Aline e 3 vazias (10/11/2026)', () => {
		const bruno = SALA_POR_ID.get('sala-bruno')!;
		const aline = SALA_POR_ID.get('sala-aline')!;
		expect(bruno.dono).toEqual({ id: BRUNO, cadeira: 'Cadeira do Bruno' });
		expect(aline.dono).toEqual({ id: ALINE, cadeira: 'Cadeira da Aline' });
		for (const [sala, cadeira] of [['sala-bruno', 'Cadeira do Bruno'], ['sala-aline', 'Cadeira da Aline']]) {
			expect(ITENS.filter((i) => i.sala === sala && i.nome === cadeira), sala).toHaveLength(1);
		}
		// As novas ficam do lado de lá da Diretoria e do Conteúdo, que andaram 16 casas
		expect(bruno.x1).toBeLessThan(SALA_POR_ID.get('diretoria')!.x0);
		expect(aline.x1).toBeLessThan(SALA_POR_ID.get('diretoria')!.x0);
		for (const id of ['sala-1', 'sala-2', 'sala-3']) {
			const s = SALA_POR_ID.get(id)!;
			expect(s.x1, id).toBeLessThan(SALA_POR_ID.get('conteudo')!.x0);
			expect(ITENS.filter((i) => i.sala === id), `${id} vazia`).toHaveLength(0);
		}
		// O corredor vai de parede a parede, e cada sala nova abre para ele
		const corredor = SALA_POR_ID.get('corredor')!;
		expect(corredor.x0).toBe(4);
		for (const id of ['sala-bruno', 'sala-aline', 'sala-1', 'sala-2', 'sala-3']) {
			for (const p of SALA_POR_ID.get(id)!.portas) expect(p.y === corredor.y0 || p.y === corredor.y1 + 1, id).toBe(true);
		}
	});

	it('salas não se sobrepõem', () => {
		for (let y = 0; y < ALTURA; y++) {
			for (let x = 0; x < LARGURA; x++) {
				const donas = SALAS.filter((s) => x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1);
				expect(donas.length, `${x},${y}: ${donas.map((s) => s.id)}`).toBeLessThanOrEqual(1);
			}
		}
	});

	it('o contador de setores não inclui o corredor', () => {
		expect(SETORES.some((s) => s.id === 'corredor')).toBe(false);
		expect(SETORES.length).toBe(SALAS.length - 1);
	});
});
