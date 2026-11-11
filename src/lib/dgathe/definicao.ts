// A definição de cada agente do DGathe em arquivo: `agentes/<equipe>/<id>.md`,
// com um cabeçalho (`---` … `---`, uma `chave: valor` por linha) e as
// instruções em markdown no corpo. O arquivo é a fonte da verdade, versionada no
// git; `ponte/agentes.mjs` lê, confere com estas funções e grava em
// `dgathe_agentes`. Contrato: docs/dgathe/contrato-equipes.md, seção 6.
//
// Roda direto no Node da ponte (sem build): só TypeScript que o Node sabe
// apagar e nenhum import, nem do Node. Por isso o caminho do arquivo é
// desmontado à mão, sem `node:path`.
//
// As regras de cada campo repetem os checks da tabela `dgathe_agentes`
// (migrations 0101 e 0102): o erro aparece aqui, com o arquivo e a linha, em vez
// de estourar no meio da gravação.

export type DefinicaoAgente = {
	id: string;
	nome: string;
	cargo: string;
	equipe: string;
	lider: boolean;
	sala: string;
	cadeira: string;
	pasta: string;
	autonomia: 'perguntar' | 'editar' | 'livre';
	modelo: string | null;
	esforco: string | null;
	ordem: number;
	ativo: boolean;
	instrucoes: string;
};

export type Problema = { arquivo: string; linha: number | null; mensagem: string; aviso: boolean };

export const CHAVES: string[] = [
	'id',
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
	'ativo'
];

/** modelo e esforço vazios ou ausentes = o padrão do Mac; o resto é obrigatório. */
const OPCIONAIS = ['modelo', 'esforco'];
const AUTONOMIAS = ['perguntar', 'editar', 'livre'];
const ESFORCOS = ['low', 'medium', 'high', 'xhigh', 'max'];
const VERDADE = ['sim', 'true'];
const MENTIRA = ['não', 'nao', 'false'];
const LIMITE_INSTRUCOES = 20000;
/**
 * A equipe dos diretores (11/11/2026, igual a EQUIPE_DIRETORIA em equipe.ts):
 * não tem líder, e cada diretor passa trabalho aos gerentes das outras equipes.
 */
const DIRETORIA = 'diretoria';

/** A ordem em que `diferencas` devolve os campos (e a do `is distinct from` do agentes.mjs). */
const CAMPOS_COMPARADOS: (keyof DefinicaoAgente)[] = [
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
];

/** Caracteres de verdade (o `length` do Postgres conta assim; o do JS conta metades de emoji). */
function tamanho(s: string): number {
	return [...s].length;
}

/** 20000 → '20.000', sem depender do Intl do Node. */
function milhar(n: number): string {
	return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 'agentes/dev/lewis.md' → { pasta: 'agentes/dev/', equipe: 'dev', base: 'lewis' }. */
function partesDoArquivo(arquivo: string): { pasta: string; equipe: string | null; base: string } {
	const partes = arquivo.replace(/\\/g, '/').split('/').filter((p) => p !== '');
	const nome = partes.pop() ?? '';
	return {
		pasta: partes.length ? partes.join('/') + '/' : '',
		equipe: partes.length ? partes[partes.length - 1] : null,
		base: nome.replace(/\.md$/i, '')
	};
}

/** Tira aspas simples ou duplas em volta do valor. */
function semAspas(v: string): string {
	const m = v.match(/^(['"])(.*)\1$/);
	return m ? m[2].trim() : v;
}

function booleano(v: string): boolean | null {
	const s = v.toLowerCase();
	if (VERDADE.includes(s)) return true;
	if (MENTIRA.includes(s)) return false;
	return null;
}

/**
 * Lê um arquivo de agente. `arquivo` é o caminho relativo (ex.: 'agentes/dev/lewis.md'):
 * dá o id esperado (o nome do arquivo) e a equipe esperada (a pasta). Com qualquer
 * erro, `definicao` vem null; avisos não existem aqui (só no conjunto).
 */
export function lerDefinicao(
	texto: string,
	arquivo: string
): { definicao: DefinicaoAgente | null; problemas: Problema[] } {
	const problemas: Problema[] = [];
	const erro = (linha: number | null, mensagem: string) =>
		problemas.push({ arquivo, linha, mensagem, aviso: false });

	// NFC: o "não" digitado no Mac às vezes vem decomposto (n + a + til)
	const linhas = (texto ?? '').replace(/^﻿/, '').normalize('NFC').split(/\r?\n/);
	if (linhas[0]?.trim() !== '---') {
		erro(1, 'falta o cabeçalho: o arquivo começa com uma linha "---"');
		return { definicao: null, problemas };
	}
	let fim = -1;
	for (let i = 1; i < linhas.length; i++) {
		if (linhas[i].trim() === '---') {
			fim = i;
			break;
		}
	}
	if (fim < 0) {
		erro(null, 'o cabeçalho não fecha: falta a segunda linha "---"');
		return { definicao: null, problemas };
	}

	// Cabeçalho: chave → valor e a linha (1 = o primeiro "---")
	const valores = new Map<string, { valor: string; linha: number }>();
	for (let i = 1; i < fim; i++) {
		const n = i + 1;
		const crua = linhas[i];
		if (crua.trim() === '') continue;
		const m = crua.match(/^\s*([^\s:]+)\s*:(.*)$/);
		if (!m) {
			erro(n, 'linha sem "chave: valor"');
			continue;
		}
		const chave = m[1];
		if (!CHAVES.includes(chave)) {
			erro(n, `chave desconhecida "${chave}" (as chaves são: ${CHAVES.join(', ')})`);
			continue;
		}
		if (valores.has(chave)) {
			erro(n, `chave repetida "${chave}"`);
			continue;
		}
		valores.set(chave, { valor: semAspas(m[2].trim()), linha: n });
	}

	const linhaDe = (k: string) => valores.get(k)?.linha ?? null;
	const valor = (k: string) => valores.get(k)?.valor ?? '';
	for (const k of CHAVES) {
		if (OPCIONAIS.includes(k)) continue;
		if (!valores.has(k)) erro(null, `falta a chave "${k}"`);
		else if (valor(k) === '') erro(linhaDe(k), `"${k}" está vazio`);
	}
	/** Só confere o formato de quem veio preenchido (o vazio já foi acusado acima). */
	const tem = (k: string) => valor(k) !== '';
	const { pasta: pastaDoArquivo, equipe: equipeDaPasta, base } = partesDoArquivo(arquivo);

	const id = valor('id');
	if (tem('id')) {
		if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(id))
			erro(linhaDe('id'), `id "${id}" inválido: minúsculas, números e hífen, de 2 a 40 caracteres, começando por letra ou número`);
		else if (id !== base) erro(linhaDe('id'), `o id "${id}" tem que ser o nome do arquivo ("${base}.md")`);
	}

	const equipe = valor('equipe');
	if (tem('equipe')) {
		if (!/^[a-z0-9][a-z0-9-]{1,29}$/.test(equipe))
			erro(linhaDe('equipe'), `equipe "${equipe}" inválida: minúsculas, números e hífen, de 2 a 30 caracteres`);
		else if (equipeDaPasta !== null && equipe !== equipeDaPasta)
			erro(linhaDe('equipe'), `a equipe "${equipe}" tem que ser a pasta do arquivo ("${pastaDoArquivo}")`);
	}

	const nome = valor('nome');
	if (tamanho(nome) > 40) erro(linhaDe('nome'), 'nome com mais de 40 caracteres');
	const cargo = valor('cargo');
	if (tamanho(cargo) > 60) erro(linhaDe('cargo'), 'cargo com mais de 60 caracteres');

	const lider = booleano(valor('lider'));
	if (tem('lider') && lider === null) erro(linhaDe('lider'), '"lider" precisa ser sim ou não');
	const ativo = booleano(valor('ativo'));
	if (tem('ativo') && ativo === null) erro(linhaDe('ativo'), '"ativo" precisa ser sim ou não');

	// int do Postgres: de −2.147.483.648 a 2.147.483.647
	const ordemTexto = valor('ordem');
	const ordem = Number(ordemTexto);
	if (tem('ordem') && (!/^[+-]?\d+$/.test(ordemTexto) || ordem < -2147483648 || ordem > 2147483647))
		erro(linhaDe('ordem'), 'ordem precisa ser um número inteiro');

	const autonomia = valor('autonomia');
	if (tem('autonomia') && !AUTONOMIAS.includes(autonomia))
		erro(linhaDe('autonomia'), `autonomia "${autonomia}" não existe (use perguntar, editar ou livre)`);

	const modelo = valor('modelo');
	if (modelo !== '' && !/^[a-z0-9.\[\]-]{2,40}$/.test(modelo))
		erro(linhaDe('modelo'), `modelo "${modelo}" inválido (ex.: opus, sonnet, haiku; vazio usa o padrão do Mac)`);
	const esforco = valor('esforco');
	if (esforco !== '' && !ESFORCOS.includes(esforco))
		erro(
			linhaDe('esforco'),
			`esforço "${esforco}" não existe (use low, medium, high, xhigh ou max; vazio usa o padrão do Mac)`
		);

	// O mesmo check da coluna: relativa à VERT SYS, sem subir de pasta
	const pasta = valor('pasta');
	if (tem('pasta') && (/(^|\/)\.\.(\/|$)/.test(pasta) || pasta.startsWith('/')))
		erro(linhaDe('pasta'), `pasta "${pasta}" inválida: relativa à VERT SYS, sem ".." e sem começar com "/"`);

	// A sala existir no mapa é conferido no teste da tela (agentes.test.ts), não aqui
	const sala = valor('sala');
	if (tem('sala') && !/^[a-z0-9-]{2,30}$/.test(sala)) erro(linhaDe('sala'), `sala "${sala}" inválida`);
	const cadeira = valor('cadeira');
	if (tamanho(cadeira) > 60) erro(linhaDe('cadeira'), 'cadeira com mais de 60 caracteres');

	// O corpo: tudo depois do segundo "---", com as quebras de linha no formato do Mac
	const instrucoes = linhas.slice(fim + 1).join('\n').trim();
	const n = tamanho(instrucoes);
	if (n === 0) erro(null, 'as instruções (o corpo do arquivo) estão vazias');
	else if (n > LIMITE_INSTRUCOES)
		erro(null, `as instruções passam de ${milhar(LIMITE_INSTRUCOES)} caracteres (${milhar(n)})`);

	if (problemas.length) return { definicao: null, problemas };
	return {
		definicao: {
			id,
			nome,
			cargo,
			equipe,
			lider: lider === true,
			sala,
			cadeira,
			pasta,
			autonomia: autonomia as DefinicaoAgente['autonomia'],
			modelo: modelo === '' ? null : modelo,
			esforco: esforco === '' ? null : esforco,
			ordem,
			ativo: ativo === true,
			instrucoes
		},
		problemas
	};
}

/**
 * O que só aparece olhando todos os arquivos juntos. Erro: id repetido, dois
 * líderes ativos na mesma equipe (o banco tem um índice único que recusaria) e
 * líder na diretoria. Aviso: equipe sem líder ativo (menos a diretoria, que
 * não tem) e líder ativo com autonomia "perguntar".
 */
export function conferirConjunto(lista: { arquivo: string; definicao: DefinicaoAgente }[]): Problema[] {
	const problemas: Problema[] = [];
	const primeiroComId = new Map<string, string>();
	for (const { arquivo, definicao: d } of lista) {
		const antes = primeiroComId.get(d.id);
		if (antes !== undefined)
			problemas.push({ arquivo, linha: null, mensagem: `o id "${d.id}" aparece em dois arquivos: ${antes} e ${arquivo}`, aviso: false });
		else primeiroComId.set(d.id, arquivo);
	}

	// Equipes na ordem em que aparecem, com a pasta (para apontar o aviso)
	const equipes = new Map<string, { pasta: string; lideres: { id: string; arquivo: string }[] }>();
	for (const { arquivo, definicao: d } of lista) {
		if (!equipes.has(d.equipe)) equipes.set(d.equipe, { pasta: partesDoArquivo(arquivo).pasta || arquivo, lideres: [] });
		if (d.lider && d.ativo) equipes.get(d.equipe)!.lideres.push({ id: d.id, arquivo });
	}
	for (const [equipe, { pasta, lideres }] of equipes) {
		if (equipe === DIRETORIA) continue;
		if (lideres.length === 0)
			problemas.push({ arquivo: pasta, linha: null, mensagem: `a equipe "${equipe}" não tem líder ativo: ninguém delega nela`, aviso: true });
		for (const outro of lideres.slice(1))
			problemas.push({
				arquivo: outro.arquivo,
				linha: null,
				mensagem: `a equipe "${equipe}" tem dois líderes: ${lideres[0].id} e ${outro.id}`,
				aviso: false
			});
	}

	for (const { arquivo, definicao: d } of lista) {
		// O banco também recusa (dgathe_agentes_diretoria_check, migration 0110)
		if (d.equipe === DIRETORIA && d.lider)
			problemas.push({ arquivo, linha: null, mensagem: `${d.id} está na diretoria com "lider: sim": a diretoria não tem líder`, aviso: false });
		if (d.lider && d.ativo && d.autonomia === 'perguntar')
			problemas.push({
				arquivo,
				linha: null,
				mensagem: `${d.id} é líder com autonomia "perguntar": cada delegação vai pedir licença no jogo`,
				aviso: true
			});
	}
	return problemas;
}

/** Valor do banco no mesmo formato do arquivo (o pg devolve int como número; ausente = null). */
function comparavel(campo: keyof DefinicaoAgente, v: unknown): unknown {
	if (v === undefined || v === null) return null;
	if (campo === 'ordem') return Number(v);
	return v;
}

/**
 * Os campos em que o arquivo difere do banco, na ordem de CAMPOS_COMPARADOS.
 * banco null = agente novo (devolve []). `aparencia` e `criado_em` não entram:
 * o arquivo nunca mexe neles.
 */
export function diferencas(d: DefinicaoAgente, banco: Partial<DefinicaoAgente> | null): string[] {
	if (!banco) return [];
	return CAMPOS_COMPARADOS.filter((c) => comparavel(c, d[c]) !== comparavel(c, banco[c]));
}

/** 'agentes/dev/lewis.md:7: <mensagem>', com 'aviso: ' na frente quando for aviso. */
export function formatarProblema(p: Problema): string {
	const onde = p.linha === null ? p.arquivo : `${p.arquivo}:${p.linha}`;
	return `${p.aviso ? 'aviso: ' : ''}${onde}: ${p.mensagem}`;
}
