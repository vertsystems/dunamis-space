import { describe, expect, it } from 'vitest';
import { CHAVES, conferirConjunto, diferencas, formatarProblema, lerDefinicao, type DefinicaoAgente } from './definicao';

const ARQUIVO = 'agentes/dev/lewis.md';

/** O cabeçalho do contrato (seção 6.1), com troca de linhas para cada caso. */
function cabecalho(troca: Record<string, string | null> = {}): string[] {
	const base: [string, string][] = [
		['id', 'lewis'],
		['nome', 'Lewis'],
		['cargo', 'Gerente de Desenvolvimento e IA'],
		['equipe', 'dev'],
		['lider', 'sim'],
		['sala', 'dev'],
		['cadeira', 'Cadeira do gerente'],
		['pasta', 'dunamiscompany'],
		['autonomia', 'editar'],
		['modelo', ''],
		['esforco', ''],
		['ordem', '10'],
		['ativo', 'sim']
	];
	const linhas: string[] = [];
	for (const [k, v] of base) {
		if (k in troca) {
			if (troca[k] !== null) linhas.push(`${k}: ${troca[k]}`);
		} else linhas.push(v === '' ? `${k}:` : `${k}: ${v}`);
	}
	return linhas;
}

const CORPO = '# Lewis · Gerente de Desenvolvimento e IA\n\nVocê coordena a equipe dev.';

function arquivo(troca: Record<string, string | null> = {}, corpo = CORPO): string {
	return ['---', ...cabecalho(troca), '---', '', corpo, ''].join('\n');
}

/** As mensagens (sem o arquivo) de um texto. */
function mensagens(texto: string, nome = ARQUIVO): string[] {
	return lerDefinicao(texto, nome).problemas.map((p) => p.mensagem);
}

/** A linha do arquivo onde está a chave (1 = o primeiro "---"). */
function linhaDa(chave: string): number {
	return cabecalho().findIndex((l) => l.startsWith(`${chave}:`)) + 2;
}

const definicao = (extra: Partial<DefinicaoAgente> = {}): DefinicaoAgente => ({
	id: 'lewis',
	nome: 'Lewis',
	cargo: 'Gerente de Desenvolvimento e IA',
	equipe: 'dev',
	lider: true,
	sala: 'dev',
	cadeira: 'Cadeira do gerente',
	pasta: 'dunamiscompany',
	autonomia: 'editar',
	modelo: null,
	esforco: null,
	ordem: 10,
	ativo: true,
	instrucoes: CORPO,
	...extra
});

describe('lerDefinicao: arquivo certo', () => {
	it('lê o exemplo do contrato', () => {
		const r = lerDefinicao(arquivo(), ARQUIVO);
		expect(r.problemas).toEqual([]);
		expect(r.definicao).toEqual(definicao());
	});

	it('ignora BOM, linha em branco, aspas e CRLF', () => {
		const linhas = cabecalho({ nome: '"Lewis"', cargo: "'Gerente de Desenvolvimento e IA'" });
		linhas.splice(3, 0, '', '   ');
		const texto = '﻿' + ['---', ...linhas, '---', '', 'Linha 1', 'Linha 2', ''].join('\r\n');
		const r = lerDefinicao(texto, ARQUIVO);
		expect(r.problemas).toEqual([]);
		expect(r.definicao?.nome).toBe('Lewis');
		expect(r.definicao?.cargo).toBe('Gerente de Desenvolvimento e IA');
		// O corpo vai para o banco com quebra de linha do Mac e sem espaços nas pontas
		expect(r.definicao?.instrucoes).toBe('Linha 1\nLinha 2');
	});

	it('aceita sim/não/nao/true/false em qualquer caixa, inclusive "não" decomposto', () => {
		for (const [v, esperado] of [
			['sim', true],
			['SIM', true],
			['True', true],
			['não', false],
			['NÃO', false],
			['nao', false],
			['false', false],
			['não', false]
		] as const) {
			const r = lerDefinicao(arquivo({ lider: v, ativo: v }), ARQUIVO);
			expect(r.problemas, v).toEqual([]);
			expect(r.definicao?.lider, v).toBe(esperado);
			expect(r.definicao?.ativo, v).toBe(esperado);
		}
	});

	it('modelo e esforço vazios ou ausentes viram null; preenchidos passam', () => {
		expect(lerDefinicao(arquivo({ modelo: null, esforco: null }), ARQUIVO).definicao).toMatchObject({ modelo: null, esforco: null });
		const r = lerDefinicao(arquivo({ modelo: 'haiku', esforco: 'low' }), ARQUIVO);
		expect(r.definicao).toMatchObject({ modelo: 'haiku', esforco: 'low' });
		expect(lerDefinicao(arquivo({ modelo: 'claude-opus-4-1[1m]' }), ARQUIVO).problemas).toEqual([]);
	});

	it('ordem negativa, pasta funda e autonomias válidas', () => {
		expect(lerDefinicao(arquivo({ ordem: '-3' }), ARQUIVO).definicao?.ordem).toBe(-3);
		expect(lerDefinicao(arquivo({ pasta: 'dunamiscompany/dunamisspace' }), ARQUIVO).problemas).toEqual([]);
		for (const a of ['perguntar', 'editar', 'livre'])
			expect(lerDefinicao(arquivo({ autonomia: a }), ARQUIVO).definicao?.autonomia).toBe(a);
	});

	it('valor com dois-pontos e com espaço antes do dois-pontos', () => {
		const texto = arquivo({ cargo: 'Gerente: Dev & IA' }).replace('nome: Lewis', 'nome : Lewis');
		const r = lerDefinicao(texto, ARQUIVO);
		expect(r.problemas).toEqual([]);
		expect(r.definicao?.cargo).toBe('Gerente: Dev & IA');
	});

	it('nome, cargo e cadeira no limite passam (conta caractere, não metade de emoji)', () => {
		const r = lerDefinicao(arquivo({ nome: '🙂'.repeat(40), cargo: 'c'.repeat(60), cadeira: 'd'.repeat(60) }), ARQUIVO);
		expect(r.problemas).toEqual([]);
	});

	it('instruções com exatamente 20.000 caracteres passam', () => {
		expect(lerDefinicao(arquivo({}, 'x'.repeat(20000)), ARQUIVO).problemas).toEqual([]);
	});

	it('sem pasta no caminho, não confere a equipe com a pasta', () => {
		expect(lerDefinicao(arquivo(), 'lewis.md').problemas).toEqual([]);
	});

	it('com --pasta de fora, a equipe é a última pasta do caminho', () => {
		const texto = arquivo({ id: 'teste-a', equipe: 'teste', lider: 'não' });
		expect(lerDefinicao(texto, 'teste-agentes/teste/teste-a.md').problemas).toEqual([]);
	});
});

describe('lerDefinicao: cada mensagem do contrato (6.3)', () => {
	it('não começa com ---', () => {
		const r = lerDefinicao('id: lewis\n---\ncorpo', ARQUIVO);
		expect(r.definicao).toBeNull();
		expect(r.problemas).toEqual([
			{ arquivo: ARQUIVO, linha: 1, mensagem: 'falta o cabeçalho: o arquivo começa com uma linha "---"', aviso: false }
		]);
		expect(mensagens('')).toEqual(['falta o cabeçalho: o arquivo começa com uma linha "---"']);
	});

	it('sem o segundo ---', () => {
		const r = lerDefinicao('---\nid: lewis\nnome: Lewis\n', ARQUIVO);
		expect(r.definicao).toBeNull();
		expect(r.problemas).toEqual([
			{ arquivo: ARQUIVO, linha: null, mensagem: 'o cabeçalho não fecha: falta a segunda linha "---"', aviso: false }
		]);
	});

	it('linha estranha, com o número da linha', () => {
		const texto = arquivo().replace('sala: dev', 'sala: dev\nisto não é chave');
		const r = lerDefinicao(texto, ARQUIVO);
		expect(r.definicao).toBeNull();
		expect(r.problemas).toEqual([{ arquivo: ARQUIVO, linha: linhaDa('sala') + 1, mensagem: 'linha sem "chave: valor"', aviso: false }]);
	});

	it('chave desconhecida lista as chaves', () => {
		const texto = arquivo().replace('ativo: sim', 'ativo: sim\naparencia: {"cor": 1}');
		expect(mensagens(texto)).toEqual([
			'chave desconhecida "aparencia" (as chaves são: id, nome, cargo, equipe, lider, sala, cadeira, pasta, autonomia, modelo, esforco, ordem, ativo)'
		]);
		expect(CHAVES.join(', ')).toBe('id, nome, cargo, equipe, lider, sala, cadeira, pasta, autonomia, modelo, esforco, ordem, ativo');
	});

	it('chave repetida', () => {
		const texto = arquivo().replace('ordem: 10', 'ordem: 10\nordem: 11');
		const r = lerDefinicao(texto, ARQUIVO);
		expect(r.problemas).toEqual([{ arquivo: ARQUIVO, linha: linhaDa('ordem') + 1, mensagem: 'chave repetida "ordem"', aviso: false }]);
	});

	it('faltou cada chave obrigatória', () => {
		for (const k of CHAVES.filter((c) => c !== 'modelo' && c !== 'esforco')) {
			const r = lerDefinicao(arquivo({ [k]: null }), ARQUIVO);
			expect(r.definicao, k).toBeNull();
			expect(r.problemas.map((p) => p.mensagem), k).toContain(`falta a chave "${k}"`);
			expect(r.problemas.find((p) => p.mensagem === `falta a chave "${k}"`)?.linha).toBeNull();
		}
	});

	it('chave obrigatória vazia (inclusive só com aspas)', () => {
		expect(mensagens(arquivo({ nome: '' }))).toEqual(['"nome" está vazio']);
		expect(mensagens(arquivo({ cadeira: '""' }))).toEqual(['"cadeira" está vazio']);
		const r = lerDefinicao(arquivo({ sala: '' }), ARQUIVO);
		expect(r.problemas[0].linha).toBe(linhaDa('sala'));
		// Vazio não ganha também a mensagem do formato
		expect(mensagens(arquivo({ id: '' }))).toEqual(['"id" está vazio']);
		expect(mensagens(arquivo({ ordem: '' }))).toEqual(['"ordem" está vazio']);
		expect(mensagens(arquivo({ lider: '' }))).toEqual(['"lider" está vazio']);
	});

	it('id inválido', () => {
		for (const v of ['Lewis', 'l', '-lewis', 'lewis_1', 'a'.repeat(41)])
			expect(mensagens(arquivo({ id: v }), `agentes/dev/${v}.md`), v).toEqual([
				`id "${v}" inválido: minúsculas, números e hífen, de 2 a 40 caracteres, começando por letra ou número`
			]);
	});

	it('id diferente do nome do arquivo', () => {
		const r = lerDefinicao(arquivo({ id: 'lewis2' }), ARQUIVO);
		expect(r.problemas).toEqual([
			{ arquivo: ARQUIVO, linha: linhaDa('id'), mensagem: 'o id "lewis2" tem que ser o nome do arquivo ("lewis.md")', aviso: false }
		]);
	});

	it('equipe inválida', () => {
		for (const v of ['Dev', 'd', 'dev_ia', '-dev', 'e'.repeat(31)])
			expect(mensagens(arquivo({ equipe: v }), `agentes/${v}/lewis.md`), v).toEqual([
				`equipe "${v}" inválida: minúsculas, números e hífen, de 2 a 30 caracteres`
			]);
	});

	it('equipe diferente da pasta', () => {
		expect(mensagens(arquivo({ equipe: 'design' }))).toEqual(['a equipe "design" tem que ser a pasta do arquivo ("agentes/dev/")']);
	});

	it('nome, cargo e cadeira compridos demais', () => {
		expect(mensagens(arquivo({ nome: 'n'.repeat(41) }))).toEqual(['nome com mais de 40 caracteres']);
		expect(mensagens(arquivo({ cargo: 'c'.repeat(61) }))).toEqual(['cargo com mais de 60 caracteres']);
		expect(mensagens(arquivo({ cadeira: 'd'.repeat(61) }))).toEqual(['cadeira com mais de 60 caracteres']);
	});

	it('booleano que não é sim nem não', () => {
		expect(mensagens(arquivo({ lider: 'talvez' }))).toEqual(['"lider" precisa ser sim ou não']);
		expect(mensagens(arquivo({ ativo: '1' }))).toEqual(['"ativo" precisa ser sim ou não']);
	});

	it('ordem que não é inteiro', () => {
		for (const v of ['dez', '10.5', '1e3', '9999999999'])
			expect(mensagens(arquivo({ ordem: v })), v).toEqual(['ordem precisa ser um número inteiro']);
	});

	it('autonomia que não existe', () => {
		expect(mensagens(arquivo({ autonomia: 'total' }))).toEqual(['autonomia "total" não existe (use perguntar, editar ou livre)']);
	});

	it('modelo inválido', () => {
		for (const v of ['Opus', 'x', 'claude opus'])
			expect(mensagens(arquivo({ modelo: v })), v).toEqual([
				`modelo "${v}" inválido (ex.: opus, sonnet, haiku; vazio usa o padrão do Mac)`
			]);
	});

	it('esforço que não existe', () => {
		expect(mensagens(arquivo({ esforco: 'alto' }))).toEqual([
			'esforço "alto" não existe (use low, medium, high, xhigh ou max; vazio usa o padrão do Mac)'
		]);
	});

	it('pasta que sai da VERT SYS', () => {
		for (const v of ['../fora', 'dunamiscompany/../../x', '/Users/bruno', '..'])
			expect(mensagens(arquivo({ pasta: v })), v).toEqual([
				`pasta "${v}" inválida: relativa à VERT SYS, sem ".." e sem começar com "/"`
			]);
		// ".." dentro de um nome não é subir de pasta
		expect(mensagens(arquivo({ pasta: 'dunamiscompany/a..b' }))).toEqual([]);
	});

	it('sala inválida', () => {
		for (const v of ['Dev', 'd', 'sala dev', 's'.repeat(31)])
			expect(mensagens(arquivo({ sala: v })), v).toEqual([`sala "${v}" inválida`]);
	});

	it('corpo vazio', () => {
		const r = lerDefinicao(arquivo({}, '   \n\n  '), ARQUIVO);
		expect(r.definicao).toBeNull();
		expect(r.problemas).toEqual([
			{ arquivo: ARQUIVO, linha: null, mensagem: 'as instruções (o corpo do arquivo) estão vazias', aviso: false }
		]);
		expect(mensagens(['---', ...cabecalho(), '---'].join('\n'))).toEqual(['as instruções (o corpo do arquivo) estão vazias']);
	});

	it('corpo grande demais', () => {
		expect(mensagens(arquivo({}, 'x'.repeat(20001)))).toEqual(['as instruções passam de 20.000 caracteres (20.001)']);
		expect(mensagens(arquivo({}, 'x'.repeat(123456)))).toEqual(['as instruções passam de 20.000 caracteres (123.456)']);
	});

	it('junta todos os problemas do arquivo de uma vez', () => {
		const r = lerDefinicao(arquivo({ nome: '', ordem: 'dez', autonomia: 'total', ativo: null }), ARQUIVO);
		expect(r.definicao).toBeNull();
		expect(r.problemas.map((p) => p.mensagem)).toEqual([
			'"nome" está vazio',
			'falta a chave "ativo"',
			'ordem precisa ser um número inteiro',
			'autonomia "total" não existe (use perguntar, editar ou livre)'
		]);
	});
});

describe('conferirConjunto', () => {
	const item = (arquivo: string, extra: Partial<DefinicaoAgente>) => ({ arquivo, definicao: definicao(extra) });

	it('equipe com um líder ativo não tem problema', () => {
		expect(
			conferirConjunto([
				item('agentes/dev/lewis.md', {}),
				item('agentes/dev/clovis.md', { id: 'clovis', nome: 'Clovis', lider: false, ordem: 11 })
			])
		).toEqual([]);
	});

	it('id repetido em duas pastas é erro', () => {
		const p = conferirConjunto([
			item('agentes/dev/lewis.md', {}),
			item('agentes/qa/lewis.md', { equipe: 'qa' })
		]);
		expect(p).toContainEqual({
			arquivo: 'agentes/qa/lewis.md',
			linha: null,
			mensagem: 'o id "lewis" aparece em dois arquivos: agentes/dev/lewis.md e agentes/qa/lewis.md',
			aviso: false
		});
	});

	it('dois líderes ativos na mesma equipe é erro; líder desativado não conta', () => {
		const p = conferirConjunto([
			item('agentes/dev/lewis.md', {}),
			item('agentes/dev/clovis.md', { id: 'clovis', ordem: 11 }),
			item('agentes/dev/steve.md', { id: 'steve', ordem: 13, ativo: false })
		]);
		expect(p).toEqual([
			{ arquivo: 'agentes/dev/clovis.md', linha: null, mensagem: 'a equipe "dev" tem dois líderes: lewis e clovis', aviso: false }
		]);
	});

	it('equipe sem líder ativo é aviso, apontando a pasta', () => {
		const p = conferirConjunto([
			item('agentes/dev/lewis.md', { lider: false }),
			item('agentes/teste/teste-a.md', { id: 'teste-a', equipe: 'teste', lider: true, ativo: false })
		]);
		expect(p).toEqual([
			{ arquivo: 'agentes/dev/', linha: null, mensagem: 'a equipe "dev" não tem líder ativo: ninguém delega nela', aviso: true },
			{ arquivo: 'agentes/teste/', linha: null, mensagem: 'a equipe "teste" não tem líder ativo: ninguém delega nela', aviso: true }
		]);
	});

	it('líder com autonomia "perguntar" é aviso', () => {
		expect(conferirConjunto([item('agentes/dev/lewis.md', { autonomia: 'perguntar' })])).toEqual([
			{
				arquivo: 'agentes/dev/lewis.md',
				linha: null,
				mensagem: 'lewis é líder com autonomia "perguntar": cada delegação vai pedir licença no jogo',
				aviso: true
			}
		]);
		// Especialista com "perguntar" é normal
		expect(
			conferirConjunto([
				item('agentes/dev/lewis.md', {}),
				item('agentes/dev/clovis.md', { id: 'clovis', lider: false, autonomia: 'perguntar' })
			])
		).toEqual([]);
	});

	it('lista vazia não tem problema', () => {
		expect(conferirConjunto([])).toEqual([]);
	});
});

describe('diferencas', () => {
	const doBanco = (extra: Partial<DefinicaoAgente> = {}): Partial<DefinicaoAgente> => ({ ...definicao(), ...extra });

	it('agente novo (sem linha no banco) devolve []', () => {
		expect(diferencas(definicao(), null)).toEqual([]);
	});

	it('igual devolve []', () => {
		expect(diferencas(definicao(), doBanco())).toEqual([]);
	});

	it('lista os campos que mudam, na ordem do contrato', () => {
		const banco = doBanco({ instrucoes: 'velhas', ordem: 99, nome: 'Lewis Antigo', ativo: false, modelo: 'sonnet' });
		expect(diferencas(definicao(), banco)).toEqual(['nome', 'modelo', 'ordem', 'ativo', 'instrucoes']);
		const tudo = doBanco({
			nome: 'x',
			cargo: 'x',
			equipe: 'x',
			lider: false,
			sala: 'x',
			cadeira: 'x',
			pasta: 'x',
			autonomia: 'livre',
			modelo: 'x',
			esforco: 'x',
			ordem: 1,
			ativo: false,
			instrucoes: 'x'
		});
		expect(diferencas(definicao(), tudo)).toEqual([
			'nome',
			'cargo',
			'equipe',
			'lider',
			'sala',
			'cadeira',
			'pasta',
			'autonomia',
			'modelo',
			'esforco',
			'ordem',
			'ativo',
			'instrucoes'
		]);
	});

	it('equipe nula no banco (agente de antes da 0102) conta como mudança', () => {
		expect(diferencas(definicao(), doBanco({ equipe: null as unknown as string, lider: false }))).toEqual(['equipe', 'lider']);
	});

	it('campo ausente no banco vale null; ordem em texto vale número', () => {
		const banco = doBanco({ ordem: '10' as unknown as number });
		delete banco.modelo;
		delete banco.esforco;
		expect(diferencas(definicao(), banco)).toEqual([]);
		expect(diferencas(definicao({ modelo: 'haiku' }), banco)).toEqual(['modelo']);
	});

	it('ignora o que o arquivo não tem (aparencia, criado_em)', () => {
		const banco = { ...doBanco(), aparencia: { cabelo: 1 }, criado_em: '2026-11-10' } as Partial<DefinicaoAgente>;
		expect(diferencas(definicao(), banco)).toEqual([]);
	});
});

describe('formatarProblema', () => {
	it('arquivo:linha: mensagem', () => {
		expect(formatarProblema({ arquivo: 'agentes/dev/lewis.md', linha: 7, mensagem: 'ordem precisa ser um número inteiro', aviso: false })).toBe(
			'agentes/dev/lewis.md:7: ordem precisa ser um número inteiro'
		);
	});
	it('sem linha, só o arquivo', () => {
		expect(formatarProblema({ arquivo: 'agentes/dev/lewis.md', linha: null, mensagem: 'falta a chave "id"', aviso: false })).toBe(
			'agentes/dev/lewis.md: falta a chave "id"'
		);
	});
	it('aviso ganha "aviso: " na frente', () => {
		expect(
			formatarProblema({ arquivo: 'agentes/dev/', linha: null, mensagem: 'a equipe "dev" não tem líder ativo: ninguém delega nela', aviso: true })
		).toBe('aviso: agentes/dev/: a equipe "dev" não tem líder ativo: ninguém delega nela');
	});
});
