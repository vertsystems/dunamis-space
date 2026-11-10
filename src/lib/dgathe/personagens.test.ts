import { describe, expect, it } from 'vitest';
import { ANDARES, APARENCIA_PADRAO, BICHOS, DETALHES, iguais, lerAparencia, type Aparencia } from './aparencia';
import { GRUPOS, NOME_DO_GRUPO, PERSONAGENS, PERSONAGEM_POR_ID, personagemDe, personagensDoSexo, sugerirPersonagem } from './personagens';
import { passada } from './avatar';

/** A aparência sem o id do personagem: é o que se vê no boneco. */
const visual = (a: Aparencia) => ({ ...a, personagem: '' });

describe('catálogo de personagens', () => {
	it('tem bastante opção: 90 ou mais, 40 ou mais de cada sexo, uns 2/3 reais, todo grupo nos dois sexos', () => {
		expect(PERSONAGENS.length).toBeGreaterThanOrEqual(90);
		expect(personagensDoSexo('masculino').length).toBeGreaterThanOrEqual(40);
		expect(personagensDoSexo('feminino').length).toBeGreaterThanOrEqual(40);
		const reais = PERSONAGENS.filter((p) => p.grupo === 'real').length / PERSONAGENS.length;
		expect(reais).toBeGreaterThan(0.55);
		expect(reais).toBeLessThan(0.75);
		for (const sexo of ['masculino', 'feminino'] as const) {
			const doSexo = personagensDoSexo(sexo);
			for (const g of GRUPOS) expect(doSexo.some((p) => p.grupo === g), `${sexo} ${g}`).toBe(true);
		}
		// Toda aba tem nome e todo personagem cai numa aba
		for (const g of GRUPOS) expect(NOME_DO_GRUPO[g].length).toBeGreaterThan(2);
		for (const p of PERSONAGENS) expect(GRUPOS, p.id).toContain(p.grupo);
	});

	it('a raquete é só do jogo (o agente no pingue-pongue): nenhum personagem sai com ela, e ela é lida', () => {
		for (const p of PERSONAGENS) expect(p.aparencia.naMao, p.id).not.toBe('raquete');
		expect(lerAparencia({ personagem: 'lobo', naMao: 'raquete' }).naMao).toBe('raquete');
	});

	it('segunda rodada: 34 ou mais personagens das refs. 18 a 55, com os 8 bichos de roupa', () => {
		const daRodada2 = PERSONAGENS.filter((p) => /refs?\. (1[89]|[2-4]\d|5[0-5])\b/.test(p.inspiracao));
		expect(daRodada2.length).toBeGreaterThanOrEqual(34);
		const bichosUsados = new Set(PERSONAGENS.map((p) => p.aparencia.bicho));
		for (const b of ['urso', 'panda', 'guaxinim', 'tigre', 'cachorro', 'dalmata', 'lobo', 'macaco']) expect(bichosUsados, b).toContain(b);
		// E todo bicho do catálogo tem quem o use
		for (const b of BICHOS.filter((x) => x.id !== 'nenhum')) expect(bichosUsados, b.id).toContain(b.id);
	});

	it('bicho é do grupo dos bichos (e só ele): cabeça de bicho e sem cabelo', () => {
		for (const p of PERSONAGENS) {
			expect(p.grupo === 'bicho', p.id).toBe(p.aparencia.bicho !== 'nenhum');
			if (p.grupo === 'bicho') expect(p.aparencia.cabelo, p.id).toBe('careca');
		}
	});

	it('regra de autoria: nome e personalidade sem personagem com dono, pessoa famosa ou marca', () => {
		const proibidos = /hulk|majin|\bboo\b|bugiganga|senna|jackson|aranha|spider|messi|nike|adidas|vans|jordan|\bpapa\b|rainha|chicago/i;
		for (const p of PERSONAGENS) {
			expect(p.nome, p.id).not.toMatch(proibidos);
			expect(p.personalidade, p.id).not.toMatch(proibidos);
		}
	});

	it('ids únicos e estáveis (minúsculas, números e hífen)', () => {
		const ids = PERSONAGENS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
		expect(PERSONAGEM_POR_ID.size).toBe(ids.length);
	});

	it('nome curto, uma linha de personalidade e a inspiração', () => {
		for (const p of PERSONAGENS) {
			expect(p.nome.length, p.id).toBeGreaterThan(1);
			expect(p.nome.length, p.id).toBeLessThanOrEqual(18);
			expect(p.personalidade, p.id).not.toMatch(/\n/);
			expect(p.personalidade.length, p.id).toBeLessThanOrEqual(100);
			expect(p.inspiracao.length, p.id).toBeGreaterThan(3);
		}
		// Dentro do mesmo sexo, nenhum nome repete (é o que aparece embaixo da cabecinha)
		for (const sexo of ['masculino', 'feminino'] as const) {
			const nomes = personagensDoSexo(sexo).map((p) => p.nome);
			expect(new Set(nomes).size).toBe(nomes.length);
		}
	});

	it('todos resolvem: {"personagem": id} volta a aparência completa e toda peça existe no catálogo', () => {
		for (const p of PERSONAGENS) {
			expect(lerAparencia({ personagem: p.id }), p.id).toEqual(p.aparencia);
			// Lida campo a campo (sem o atalho do id), nenhuma peça cai no padrão
			expect(lerAparencia({ ...p.aparencia, personagem: undefined }), p.id).toEqual(visual(p.aparencia));
			expect(Object.keys(p.aparencia).sort()).toEqual(Object.keys(APARENCIA_PADRAO).sort());
		}
	});

	it('a aparência confere com a ficha: corpo = sexo, andar = andar, personagem = id', () => {
		for (const p of PERSONAGENS) {
			expect(p.aparencia.corpo).toBe(p.sexo);
			expect(p.aparencia.andar).toBe(p.andar);
			expect(p.aparencia.personagem).toBe(p.id);
			expect(ANDARES.some((o) => o.id === p.andar), p.id).toBe(true);
		}
	});

	it('nenhum par idêntico', () => {
		for (let i = 0; i < PERSONAGENS.length; i++)
			for (let j = i + 1; j < PERSONAGENS.length; j++) {
				const [a, b] = [PERSONAGENS[i], PERSONAGENS[j]];
				expect(iguais(visual(a.aparencia), visual(b.aparencia)), `${a.id} = ${b.id}`).toBe(false);
			}
	});

	it('fantasia usa coisa de fantasia; gente real não tem pele de fantasia nem detalhe de fantasia', () => {
		const fantasia = new Set(DETALHES.filter((d) => d.fantasia).map((d) => d.id));
		const pelesFantasia = new Set(['verde', 'lima', 'rosa', 'azul', 'lilas', 'cinza', 'palida', 'vermelha']);
		for (const p of PERSONAGENS.filter((x) => x.grupo === 'real')) {
			expect(pelesFantasia.has(p.aparencia.pele), p.id).toBe(false);
			expect(p.aparencia.detalhes.some((d) => fantasia.has(d)), p.id).toBe(false);
		}
		// O rabo só faz sentido em bicho
		for (const p of PERSONAGENS.filter((x) => x.aparencia.detalhes.includes('rabo'))) expect(p.grupo, p.id).toBe('bicho');
	});

	it('a lista por sexo cobre o catálogo inteiro, na ordem', () => {
		const m = personagensDoSexo('masculino');
		const f = personagensDoSexo('feminino');
		expect(m.every((p) => p.sexo === 'masculino')).toBe(true);
		expect(f.every((p) => p.sexo === 'feminino')).toBe(true);
		expect(m.length + f.length).toBe(PERSONAGENS.length);
		// Os reais vêm primeiro em cada sexo
		for (const lista of [m, f]) {
			const primeiroFantasia = lista.findIndex((p) => p.grupo !== 'real');
			expect(lista.slice(primeiroFantasia).every((p) => p.grupo !== 'real')).toBe(true);
		}
	});

	it('personagemDe aceita só id conhecido', () => {
		expect(personagemDe('ninja')?.nome).toBe('Ninja');
		expect(personagemDe('nada-disso')).toBeNull();
		expect(personagemDe(42)).toBeNull();
	});

	it('sugerirPersonagem não repete enquanto houver livre, e respeita o grupo', () => {
		const usados: string[] = [];
		for (let i = 0; i < personagensDoSexo('feminino').length; i++) usados.push(sugerirPersonagem('feminino', usados).id);
		expect(new Set(usados).size).toBe(usados.length);
		expect(sugerirPersonagem('masculino', [], 'heroi').grupo).toBe('heroi');
		// Esgotou: pega o menos usado
		const todos = personagensDoSexo('masculino').map((p) => p.id);
		const p = sugerirPersonagem('masculino', [...todos, ...todos.slice(1)]);
		expect(p.id).toBe(todos[0]);
	});
});

describe('jeito de andar (avatar.ts, passada)', () => {
	const instantes = [
		{ andando: false, fase: 0, t: 0.3 },
		{ andando: true, fase: 1.1, t: 2 },
		{ andando: true, fase: 4.4, t: 5 },
		{ andando: false, fase: 0, t: 1, sentado: true }
	];

	it('todo jeito do catálogo dá números finitos e o sentado não flutua nem anda', () => {
		for (const o of ANDARES)
			for (const p of instantes) {
				const ps = passada(o.id, p);
				for (const v of Object.values(ps)) expect(Number.isFinite(v), `${o.id} ${JSON.stringify(p)}`).toBe(true);
				if (p.sentado) expect(ps).toMatchObject({ passo: 0, flutua: 0, inclina: 0 });
			}
	});

	it('o normal é o andar de antes (09/11/2026)', () => {
		const ps = passada('normal', { andando: true, fase: 1.1, t: 2 });
		expect(ps.passo).toBeCloseTo(Math.sin(1.1));
		expect(ps.sobe).toBeCloseTo(Math.abs(Math.sin(1.1)) * 1.4);
		expect(ps.balanco).toBeCloseTo(Math.sin(1.1) * 0.5);
		expect(ps.pe).toBe(1.5);
		expect(passada('normal', { andando: false, fase: 0, t: 0.3 }).sobe).toBeCloseTo(Math.sin(0.6) * 0.4);
		expect(passada('voando', { andando: true, fase: 1.1, t: 2 })).toEqual(ps);
	});

	it('flutuante fica no ar mesmo parado; os outros pisam no chão', () => {
		expect(passada('flutuante', { andando: false, fase: 0, t: 0 }).flutua).toBeGreaterThan(2);
		for (const o of ANDARES.filter((x) => x.id !== 'flutuante')) expect(passada(o.id, { andando: true, fase: 1, t: 1 }).flutua).toBe(0);
	});
});
