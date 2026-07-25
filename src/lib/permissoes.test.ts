// A lógica de permissão é o que guarda TODAS as rotas (hooks.server.ts) e todas
// as mutações (exigirPermissao nas actions). É pura, sem I/O — e um erro aqui é
// silencioso: ninguém percebe que uma rota ficou aberta.
import { describe, it, expect } from 'vitest';
import {
	moduloDaRota,
	rank,
	nivelDe,
	temNivel,
	podeVer,
	podeEditar,
	podeExcluir,
	podeAcessarRota,
	MODULO_IDS,
	type Permissoes
} from './permissoes';

describe('moduloDaRota', () => {
	it('resolve a rota mais específica primeiro', () => {
		// A ordenação por comprimento em PARES_ROTA existe só para isto: sem ela,
		// /administrativo/permissoes cairia em 'administrativo' e qualquer um com
		// acesso ao administrativo administraria permissões.
		expect(moduloDaRota('/administrativo/permissoes')).toBe('permissoes');
		expect(moduloDaRota('/administrativo')).toBe('administrativo');
	});

	it('casa subrotas, não prefixos parciais', () => {
		expect(moduloDaRota('/crm')).toBe('crm');
		expect(moduloDaRota('/crm/qualquer/coisa')).toBe('crm');
		// '/crmXPTO' NÃO é subrota de '/crm'
		expect(moduloDaRota('/crmXPTO')).not.toBe('crm');
	});

	it('trata rotas livres (pessoais) como sem módulo', () => {
		for (const r of ['/', '/meu-dia', '/perfil', '/notificacoes', '/atalhos', '/desempenho']) {
			expect(moduloDaRota(r)).toBeNull();
		}
		expect(moduloDaRota('/dtools')).toBeNull();
	});

	it('a raiz só casa exatamente', () => {
		expect(moduloDaRota('/')).toBeNull();
		expect(moduloDaRota('/financeiro')).toBe('financeiro');
	});
});

describe('rank e nivelDe', () => {
	it('ordena os níveis', () => {
		expect(rank('nenhum')).toBeLessThan(rank('ver'));
		expect(rank('ver')).toBeLessThan(rank('editar'));
		expect(rank('editar')).toBeLessThan(rank('excluir'));
	});

	it('ausente/nulo vale nenhum', () => {
		expect(rank(undefined)).toBe(0);
		expect(rank(null)).toBe(0);
		expect(nivelDe(undefined, 'crm')).toBe('nenhum');
		expect(nivelDe({}, 'crm')).toBe('nenhum');
	});
});

describe('temNivel', () => {
	const perms: Permissoes = { crm: 'editar', financeiro: 'ver', equipe: 'nenhum' };

	it('nível maior satisfaz exigência menor', () => {
		expect(temNivel(perms, 'crm', 'ver')).toBe(true);
		expect(temNivel(perms, 'crm', 'editar')).toBe(true);
		expect(temNivel(perms, 'crm', 'excluir')).toBe(false);
	});

	it('fecha para módulo ausente ou nenhum', () => {
		expect(podeVer(perms, 'equipe')).toBe(false);
		expect(podeVer(perms, 'inexistente')).toBe(false);
		expect(podeEditar(perms, 'financeiro')).toBe(false);
		expect(podeExcluir(perms, 'crm')).toBe(false);
	});

	it('sem permissões nenhuma, nada passa', () => {
		for (const m of MODULO_IDS) {
			expect(podeVer(undefined, m)).toBe(false);
			expect(podeVer({}, m)).toBe(false);
		}
	});
});

describe('podeAcessarRota', () => {
	it('libera rotas pessoais mesmo sem permissão', () => {
		expect(podeAcessarRota({}, '/perfil')).toBe(true);
		expect(podeAcessarRota(undefined, '/meu-dia')).toBe(true);
		expect(podeAcessarRota({}, '/')).toBe(true);
	});

	it('exige ao menos "ver" no módulo da rota', () => {
		expect(podeAcessarRota({ financeiro: 'ver' }, '/financeiro')).toBe(true);
		expect(podeAcessarRota({ financeiro: 'nenhum' }, '/financeiro')).toBe(false);
		expect(podeAcessarRota({}, '/financeiro')).toBe(false);
	});

	it('acesso a /administrativo não dá acesso a /administrativo/permissoes', () => {
		const perms: Permissoes = { administrativo: 'excluir' };
		expect(podeAcessarRota(perms, '/administrativo')).toBe(true);
		expect(podeAcessarRota(perms, '/administrativo/permissoes')).toBe(false);
	});
});
