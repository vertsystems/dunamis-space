import { describe, expect, it } from 'vitest';
import {
	ANDARES,
	APARENCIA_PADRAO,
	BAIXOS,
	BARBAS,
	BICHOS,
	CABELOS,
	CHAPEUS,
	CORES_CABELO,
	DETALHES,
	NA_MAO,
	OCULOS,
	PELES,
	PORTES,
	ROSTOS,
	ROUPAS,
	SAPATOS,
	andarDe,
	bichoDe,
	iguais,
	lerAparencia,
	paraGuardar
} from './aparencia';
import { PERSONAGEM_POR_ID } from './personagens';

describe('lerAparencia', () => {
	it('lê o formato antigo do editor (8 campos): as peças voltam iguais e o resto é o padrão', () => {
		const a = { corpo: 'feminino', pele: 'negra', cabelo: 'black', corCabelo: 'castanho', roupa: 'jaqueta', corRoupa: '#3b6ef6', sapato: 'bota', oculos: 'grosso' };
		expect(lerAparencia(a)).toEqual({ ...APARENCIA_PADRAO, ...a });
		expect(lerAparencia(a).personagem).toBe('');
		expect(lerAparencia(a).bicho).toBe('nenhum');
	});

	it('sem nada salvo, é o padrão na cor de tema (como era antes do editor)', () => {
		expect(lerAparencia(null, '#E05A7A')).toEqual({ ...APARENCIA_PADRAO, corRoupa: '#e05a7a' });
		expect(lerAparencia(undefined)).toEqual(APARENCIA_PADRAO);
		expect(lerAparencia([], '#E05A7A')).toEqual({ ...APARENCIA_PADRAO, corRoupa: '#e05a7a' });
	});

	it('opção fora do catálogo ou cor malformada cai no padrão, campo por campo', () => {
		const a = lerAparencia({ corpo: 'robô', cabelo: 'longo', corRoupa: 'red', oculos: 42, porte: 'enorme', chapeu: 'topete', andar: 'voando', corBaixo: 'azul', corExtra: '#12' });
		expect(a.corpo).toBe(APARENCIA_PADRAO.corpo);
		expect(a.cabelo).toBe('longo');
		expect(a.corRoupa).toBe(APARENCIA_PADRAO.corRoupa);
		expect(a.oculos).toBe(APARENCIA_PADRAO.oculos);
		expect(a.porte).toBe('padrao');
		expect(a.chapeu).toBe('nenhum');
		expect(a.andar).toBe('normal');
		expect(a.corBaixo).toBe('');
		expect(a.corExtra).toBe('');
		expect(lerAparencia({ bicho: 'dragao' }).bicho).toBe('nenhum');
	});

	it('lê os campos novos', () => {
		const a = lerAparencia({
			porte: 'gigante',
			baixo: 'pantalona',
			corBaixo: '#AABBCC',
			barba: 'bigodao',
			chapeu: 'fedora',
			naMao: 'maleta',
			rosto: 'piscada',
			detalhes: ['capa', 'sardas'],
			corExtra: '#FF6F00',
			andar: 'gingado',
			bicho: 'panda'
		});
		expect(a).toMatchObject({ porte: 'gigante', baixo: 'pantalona', corBaixo: '#aabbcc', barba: 'bigodao', chapeu: 'fedora', naMao: 'maleta', rosto: 'piscada', detalhes: ['capa', 'sardas'], corExtra: '#ff6f00', andar: 'gingado', bicho: 'panda' });
	});

	it('lê as peças da segunda rodada', () => {
		const a = lerAparencia({ cabelo: 'coqueSolto', chapeu: 'chapeuPalha', oculos: 'tartaruga', roupa: 'haori', baixo: 'hakama', sapato: 'patas', naMao: 'bracosCruzados', detalhes: ['cracha', 'rabo'], bicho: 'lobo' });
		expect(a).toMatchObject({ cabelo: 'coqueSolto', chapeu: 'chapeuPalha', oculos: 'tartaruga', roupa: 'haori', baixo: 'hakama', sapato: 'patas', naMao: 'bracosCruzados', detalhes: ['cracha', 'rabo'], bicho: 'lobo' });
	});

	it('detalhes: só os do catálogo, sem repetir, no máximo 6, e lista nunca compartilhada', () => {
		expect(lerAparencia({ detalhes: ['capa', 'asa-delta', 'capa', 7, 'aura'] }).detalhes).toEqual(['capa', 'aura']);
		expect(lerAparencia({ detalhes: 'capa' }).detalhes).toEqual([]);
		expect(lerAparencia({ detalhes: DETALHES.map((d) => d.id) }).detalhes).toHaveLength(6);
		const x = lerAparencia(null);
		x.detalhes.push('capa');
		expect(APARENCIA_PADRAO.detalhes).toEqual([]);
		const p = lerAparencia({ personagem: 'vampiro' });
		p.detalhes.push('asas');
		expect(PERSONAGEM_POR_ID.get('vampiro')!.aparencia.detalhes).not.toContain('asas');
	});

	it('cor opcional aceita "" (volta para a automática)', () => {
		const p = PERSONAGEM_POR_ID.get('analista')!;
		expect(p.aparencia.corBaixo).not.toBe('');
		expect(lerAparencia({ personagem: 'analista', corBaixo: '' }).corBaixo).toBe('');
	});
});

describe('personagem pronto', () => {
	it('{"personagem": id} vira a aparência completa do personagem (a cor de tema não entra)', () => {
		const p = PERSONAGEM_POR_ID.get('executivo')!;
		expect(lerAparencia({ personagem: 'executivo' }, '#e05a7a')).toEqual(p.aparencia);
	});

	it('campos por cima trocam só aquela peça', () => {
		const p = PERSONAGEM_POR_ID.get('ogro')!;
		const a = lerAparencia({ personagem: 'ogro', corRoupa: '#3B6EF6', chapeu: 'bone', pele: 'xadrez' });
		expect(a).toEqual({ ...p.aparencia, corRoupa: '#3b6ef6', chapeu: 'bone' });
		expect(a.personagem).toBe('ogro');
	});

	it('personagem que não existe cai no formato antigo, com a cor de tema', () => {
		const a = lerAparencia({ personagem: 'hulk', cabelo: 'longo' }, '#17915a');
		expect(a).toEqual({ ...APARENCIA_PADRAO, cabelo: 'longo', corRoupa: '#17915a' });
	});

	it('paraGuardar: só o id quando é o personagem sem mudança; a aparência inteira quando mudou', () => {
		const a = lerAparencia({ personagem: 'detetive' });
		expect(paraGuardar(a)).toEqual({ personagem: 'detetive' });
		const mudou = { ...a, corRoupa: '#000000' };
		expect(paraGuardar(mudou)).toEqual(mudou);
		expect(lerAparencia(paraGuardar(mudou))).toEqual(mudou);
		expect(paraGuardar(APARENCIA_PADRAO)).toEqual(APARENCIA_PADRAO);
	});
});

describe('catálogo de peças', () => {
	it('nenhuma lista tem id repetido e o padrão existe nelas', () => {
		for (const lista of [PELES, CABELOS, CORES_CABELO, ROUPAS, SAPATOS, OCULOS, PORTES, BAIXOS, BARBAS, CHAPEUS, NA_MAO, ROSTOS, DETALHES, ANDARES, BICHOS]) {
			expect(new Set(lista.map((o) => o.id)).size).toBe(lista.length);
		}
		expect(lerAparencia(APARENCIA_PADRAO)).toEqual(APARENCIA_PADRAO);
	});

	it('a primeira pele e a primeira cor de cabelo continuam as de antes (reserva do desenho)', () => {
		expect(PELES[0].id).toBe('clara');
		expect(CORES_CABELO[0].id).toBe('preto');
	});

	it('jeito de andar: velocidade e cadência positivas; desconhecido anda normal', () => {
		for (const o of ANDARES) {
			expect(o.velocidade).toBeGreaterThan(0.5);
			expect(o.velocidade).toBeLessThan(1.5);
			expect(o.cadencia).toBeGreaterThan(0.3);
		}
		expect(andarDe('normal')).toMatchObject({ velocidade: 1, cadencia: 1 });
		expect(andarDe('voando').id).toBe('normal');
	});

	it('bichos: "nenhum" é gente; os outros têm forma de cabeça e as quatro cores', () => {
		expect(BICHOS[0].id).toBe('nenhum');
		expect(bichoDe('nenhum')).toBeNull();
		expect(bichoDe('dragao')).toBeNull();
		expect(bichoDe('urso')?.forma).toBe('urso');
		expect(bichoDe('panda')?.forma).toBe('urso');
		for (const b of BICHOS.slice(1)) {
			expect(b.forma, b.id).not.toBeNull();
			for (const c of [b.pelo, b.claro, b.escuro, b.mao]) expect(c, b.id).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('iguais compara campo a campo, inclusive os detalhes', () => {
		expect(iguais(APARENCIA_PADRAO, { ...APARENCIA_PADRAO })).toBe(true);
		expect(iguais(APARENCIA_PADRAO, { ...APARENCIA_PADRAO, oculos: 'sol' })).toBe(false);
		expect(iguais({ ...APARENCIA_PADRAO, detalhes: ['capa'] }, { ...APARENCIA_PADRAO, detalhes: ['capa'] })).toBe(true);
		expect(iguais({ ...APARENCIA_PADRAO, detalhes: ['capa'] }, { ...APARENCIA_PADRAO, detalhes: ['aura'] })).toBe(false);
		expect(iguais({ ...APARENCIA_PADRAO, detalhes: ['capa'] }, APARENCIA_PADRAO)).toBe(false);
	});
});
