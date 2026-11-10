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
	TAPETES,
	celulaLivre,
	corDoPiso,
	pisoDaCelula,
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

	it('a sala de Desenvolvimento tem 2 baias de 8 lugares (16 cadeiras, 16 computadores)', () => {
		const dev = ITENS.filter((i) => i.sala === 'dev');
		expect(dev.filter((i) => i.tipo === 'cadeira' && i.nome === 'Cadeira de Bandolete')).toHaveLength(16);
		// 12 nas baias e 1 na mesa do gerente
		expect(dev.filter((i) => i.tipo === 'monitor')).toHaveLength(17);
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

	it('cada departamento tem uma mesa de gerente; a sala do Bruno, a do assessor; a da Aline, a da assessora', () => {
		for (const sala of ['financeiro', 'comercial', 'dev', 'marketing', 'design', 'trafego']) {
			const itens = ITENS.filter((i) => i.sala === sala);
			expect(itens.filter((i) => i.nome === 'Mesa do gerente'), sala).toHaveLength(1);
			expect(itens.filter((i) => i.nome === 'Cadeira do gerente'), sala).toHaveLength(1);
		}
		const bruno = ITENS.filter((i) => i.sala === 'sala-bruno');
		expect(bruno.filter((i) => i.nome === 'Mesa do assessor')).toHaveLength(1);
		expect(bruno.filter((i) => i.nome === 'Cadeira do assessor')).toHaveLength(1);
		const aline = ITENS.filter((i) => i.sala === 'sala-aline');
		expect(aline.filter((i) => i.nome === 'Mesa da assessora')).toHaveLength(1);
		expect(aline.filter((i) => i.nome === 'Cadeira da assessora')).toHaveLength(1);
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
		// Marketing: as 4 do conteúdo, a mesa de edição do estúdio e a cadeira do diretor
		expect(contar('marketing')).toEqual({ mesas: 5, cadeiras: 6, computadores: 5 });
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
		expect(bruno.x1).toBeLessThan(aline.x0);
		expect(aline.x1).toBeLessThan(SALA_POR_ID.get('sala-4')!.x0);
		for (const id of ['sala-1', 'sala-2', 'sala-3']) expect(SALA_POR_ID.get(id)!.x1, id).toBeLessThan(SALA_POR_ID.get('marketing')!.x0);
		// A Diretoria foi esvaziada no mesmo dia: virou a Sala 4, vazia como as outras
		expect(SALA_POR_ID.has('diretoria')).toBe(false);
		for (const id of ['sala-1', 'sala-2', 'sala-3', 'sala-4']) {
			expect(SALA_POR_ID.get(id)!.setor, id).toBe('A definir');
			expect(ITENS.filter((i) => i.sala === id), `${id} vazia`).toHaveLength(0);
		}
		// O corredor vai de parede a parede, e cada sala nova abre para ele
		const corredor = SALA_POR_ID.get('corredor')!;
		expect(corredor.x0).toBe(4);
		for (const id of ['sala-bruno', 'sala-aline', 'sala-1', 'sala-2', 'sala-3', 'sala-4']) {
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

	it('Conteúdo e Estúdio viraram o Marketing, sem parede no meio e com o chão do estúdio (10/11/2026)', () => {
		expect(SALA_POR_ID.has('conteudo') || SALA_POR_ID.has('estudio')).toBe(false);
		const m = SALA_POR_ID.get('marketing')!;
		expect(zonaDaCelula(22, 20)).toBe('marketing');
		expect(zonaDaCelula(30, 20)).toBe('marketing');
		expect(paredeEntre(26, 20, 27, 20)).toBe(false);
		expect(pisoDaCelula(22, 20)).toBe('piso');
		expect(pisoDaCelula(30, 20)).toBe('estudio');
		expect(corDoPiso(30, 20)).toBe('#3a3a42');
		expect(m.portas).toHaveLength(4);
		// As plantas do lado do conteúdo subiram para as quinas de cima
		const plantas = ITENS.filter((i) => i.tipo === 'planta' && i.sala === 'marketing' && i.x < 27).map((i) => `${Math.floor(i.x)},${Math.floor(i.y)}`);
		expect(plantas).toEqual(expect.arrayContaining(['20,15', '26,15']));
		expect(plantas).not.toContain('20,24');
		expect(plantas).not.toContain('26,24');
	});

	it('cada sala tem o nome num tapete na porta, na casa da frente (que parede nenhuma tapa) (10/11/2026)', () => {
		const nomes = TAPETES.filter((t) => t.variante === 'nome');
		const casas = new Set<string>();
		for (const s of SETORES) {
			const t = nomes.filter((x) => x.texto === s.nome.toLocaleUpperCase('pt-BR'));
			expect(t, s.id).toHaveLength(1);
			const { x0, y0, x1 } = t[0];
			const linha = Math.floor(y0);
			for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
				expect(celulaLivre(x, linha), `${s.id} ${x},${linha}`).toBe(true);
				expect(x >= s.x0 && x <= s.x1, `${s.id} ${x} dentro da largura da sala`).toBe(true);
				expect(casas.has(`${x},${linha}`), `${s.id} ${x},${linha} em cima de outro tapete`).toBe(false);
				casas.add(`${x},${linha}`);
			}
			// Na frente de uma porta da sala: a linha do tapete é a da aresta da porta
			expect(s.portas.some((p) => p.linha === 'h' && p.y === linha && p.x >= Math.floor(x0) && p.x <= Math.floor(x1)), s.id).toBe(true);
			// Sala de cima: no corredor; de baixo: dentro dela
			expect(zonaDaCelula(Math.floor(x0), linha), s.id).toBe(linha === s.y1 + 1 ? 'corredor' : s.id);
		}
		expect(nomes.some((t) => t.texto === 'CORREDOR')).toBe(false);
	});

	it('o id de cada móvel sai do tipo e do lugar dele (não muda quando outra sala é reformada)', () => {
		expect(new Set(ITENS.map((i) => i.id)).size).toBe(ITENS.length);
		const cadeira = ITENS.find((i) => i.nome === 'Cadeira do Bruno')!;
		expect(cadeira.id).toBe('cadeira-720-520');
		expect(ITENS.every((i) => /^[a-z]+-\d+-\d+(-\d+)?$/.test(i.id))).toBe(true);
	});

	it('o contador de setores não inclui o corredor', () => {
		expect(SETORES.some((s) => s.id === 'corredor')).toBe(false);
		expect(SETORES.length).toBe(SALAS.length - 1);
	});
});
