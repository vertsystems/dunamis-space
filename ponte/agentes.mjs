#!/usr/bin/env node
// Sincroniza as definições dos agentes do DGathe (arquivos versionados em
// agentes/<equipe>/<id>.md) com a tabela dgathe_agentes do banco.
//
// Por que arquivo: as instruções de cada agente são o "manual operacional da
// cadeira" (pedido do Bruno em 10/11/2026, departamento de Desenvolvimento & IA)
// e precisam de histórico e revisão, como código. O banco é só o que a ponte lê
// a cada sessão: instrução nova vale na próxima rodada do agente.
//
// Uso:
//   node ponte/agentes.mjs                        valida e grava (upsert pelo id)
//   node ponte/agentes.mjs --conferir             valida e mostra o que mudaria, sem gravar
//   node ponte/agentes.mjs --desativar-ausentes   também desativa quem sumiu dos arquivos
//   node ponte/agentes.mjs --pasta <dir>          lê <dir>/<equipe>/<id>.md (padrão: agentes/ do repositório)
//
// Regras (contrato em docs/dgathe/contrato-equipes.md, seção 6):
//   - Nunca apaga agente e nunca toca em `aparencia` nem `criado_em`.
//   - Agente que sumiu dos arquivos continua ativo; só `--desativar-ausentes`
//     desativa, e só nas equipes que têm pasta com arquivo (o `assessor`, sem
//     equipe, nunca entra).
//   - Qualquer erro num arquivo: nada é gravado. Avisos aparecem e não impedem.
//   - Entra como `postgres`, com a senha de ~/.config/dunamisspace/backup.env
//     (PGPASSWORD): o usuário da ponte só lê dgathe_agentes.
//
// Saída: 0 = deu certo; 1 = erro nas definições (nada gravado); 2 = uso errado,
// banco fora do ar, sem senha, sem a migration 0102 ou erro no meio da gravação
// (desfeita).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { conferirConjunto, diferencas, formatarProblema, lerDefinicao } from '../src/lib/dgathe/definicao.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PASTA_PADRAO = resolve(AQUI, '../agentes');
const CONFIG = join(homedir(), '.config/dunamisspace');
const HOST_PADRAO = 'db.rboenllphxqecjroolzo.supabase.co';

/** As colunas que o arquivo define, na ordem do insert (aparencia e criado_em ficam de fora de propósito). */
const COLUNAS = ['id', 'nome', 'cargo', 'equipe', 'lider', 'sala', 'cadeira', 'pasta', 'autonomia', 'modelo', 'esforco', 'ordem', 'ativo', 'instrucoes'];

const AJUDA = `Sincroniza agentes/<equipe>/<id>.md com a tabela dgathe_agentes.

  node ponte/agentes.mjs                        valida e grava (upsert pelo id)
  node ponte/agentes.mjs --conferir             valida e mostra o que mudaria, sem gravar
  node ponte/agentes.mjs --desativar-ausentes   também desativa quem sumiu dos arquivos
  node ponte/agentes.mjs --pasta <dir>          lê <dir>/<equipe>/<id>.md (padrão: agentes/)

O formato dos arquivos está em agentes/README.md.`;

// ------------------------------------------------------------ argumentos

function lerArgumentos(argv) {
	const o = { conferir: false, desativar: false, pasta: PASTA_PADRAO, ajuda: false };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--conferir') o.conferir = true;
		else if (a === '--desativar-ausentes') o.desativar = true;
		else if (a === '--ajuda' || a === '--help' || a === '-h') o.ajuda = true;
		else if (a === '--pasta' || a.startsWith('--pasta=')) {
			const v = a === '--pasta' ? argv[++i] : a.slice('--pasta='.length);
			if (!v) return { erro: 'Falta a pasta depois de --pasta.' };
			o.pasta = resolve(v);
		} else return { erro: `Opção desconhecida: ${a}` };
	}
	return o;
}

function lerEnv(arquivo) {
	const r = {};
	if (!existsSync(arquivo)) return r;
	for (const linha of readFileSync(arquivo, 'utf8').split('\n')) {
		const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
		if (!m) continue;
		r[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
	}
	return r;
}

// ------------------------------------------------------------ arquivos

const ignorado = (nome) => nome.startsWith('_') || nome.startsWith('.');
const ehPasta = (c) => {
	try {
		return statSync(c).isDirectory();
	} catch {
		return false;
	}
};

/**
 * Lê <pasta>/<equipe>/*.md. O caminho de cada arquivo nas mensagens começa pelo
 * nome da pasta (ex.: 'agentes/dev/lewis.md'): é dele que o parser tira a equipe
 * e o id esperados. Fora de uma pasta de equipe, README.md e nomes com "_" ou "."
 * na frente são ignorados.
 */
function lerPasta(pasta) {
	const rotulo = basename(pasta);
	const lista = [];
	const problemas = [];
	const equipes = [];
	let total = 0;
	for (const nome of readdirSync(pasta).sort()) {
		if (ignorado(nome)) continue;
		const caminho = join(pasta, nome);
		if (!ehPasta(caminho)) {
			// .md solto na raiz é quase sempre engano: avisa em vez de sumir em silêncio
			if (/\.md$/i.test(nome) && nome.toLowerCase() !== 'readme.md')
				problemas.push({ arquivo: `${rotulo}/${nome}`, linha: null, mensagem: 'fora de uma pasta de equipe: ignorado', aviso: true });
			continue;
		}
		const arquivos = readdirSync(caminho)
			.filter((a) => /\.md$/i.test(a) && !ignorado(a) && a.toLowerCase() !== 'readme.md' && !ehPasta(join(caminho, a)))
			.sort();
		if (arquivos.length) equipes.push(nome);
		for (const a of arquivos) {
			total++;
			const arquivo = `${rotulo}/${nome}/${a}`;
			const r = lerDefinicao(readFileSync(join(caminho, a), 'utf8'), arquivo);
			problemas.push(...r.problemas);
			if (r.definicao) lista.push({ arquivo, definicao: r.definicao });
		}
	}
	problemas.push(...conferirConjunto(lista));
	return { rotulo, lista, problemas, equipes, total };
}

// ------------------------------------------------------------ plano

/**
 * Compara os arquivos com o banco: novo, mudou (com os campos) ou igual, e os
 * ausentes (ativos no banco, de equipe com pasta, sem arquivo). Também acusa a
 * equipe que ficaria com dois líderes ativos, que o índice único do banco recusaria.
 */
function planejar(lista, banco, equipes, desativar) {
	const porId = new Map(banco.map((b) => [b.id, b]));
	const ids = new Set(lista.map((x) => x.definicao.id));
	const ordenada = [...lista].sort(
		(x, y) =>
			equipes.indexOf(x.definicao.equipe) - equipes.indexOf(y.definicao.equipe) ||
			x.definicao.ordem - y.definicao.ordem ||
			x.definicao.id.localeCompare(y.definicao.id)
	);
	const itens = ordenada.map(({ arquivo, definicao: d }) => {
		const b = porId.get(d.id);
		if (!b) return { tipo: 'novo', arquivo, d, campos: [] };
		const campos = diferencas(d, b);
		return { tipo: campos.length ? 'mudou' : 'igual', arquivo, d, campos };
	});
	const ausentes = banco
		.filter((b) => b.ativo && b.equipe && equipes.includes(b.equipe) && !ids.has(b.id))
		.sort((x, y) => x.ordem - y.ordem || x.id.localeCompare(y.id));

	const problemas = [];
	if (!desativar) {
		for (const e of equipes) {
			const doArquivo = lista.filter((x) => x.definicao.equipe === e && x.definicao.lider && x.definicao.ativo);
			const soNoBanco = ausentes.filter((b) => b.equipe === e && b.lider);
			if (doArquivo.length && soNoBanco.length)
				problemas.push({
					arquivo: doArquivo[0].arquivo,
					linha: null,
					mensagem: `a equipe "${e}" ficaria com dois líderes ativos: ${doArquivo[0].definicao.id} (no arquivo) e ${soNoBanco[0].id} (só no banco, sem arquivo). Rode com --desativar-ausentes ou desative ${soNoBanco[0].id} antes`,
					aviso: false
				});
		}
	}
	return { itens, ausentes, problemas };
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function imprimirPlano({ itens, ausentes }, o) {
	const largura = Math.max(11, ...itens.map((x) => x.d.id.length + 2), ...ausentes.map((b) => b.id.length + 2));
	const linha = (rotulo, id, resto = '') => console.log(`  ${rotulo.padEnd(13)}${resto ? id.padEnd(largura) + resto : id}`);
	for (const x of itens) {
		const d = x.d;
		if (x.tipo === 'novo')
			linha('novo', d.id, `${d.nome} · ${d.cargo} · ${d.equipe}${d.lider ? ' (líder)' : ''}${d.ativo ? '' : ' · desativado'}`);
		else if (x.tipo === 'mudou') linha('mudou', d.id, x.campos.join(', '));
		else linha('igual', d.id);
	}
	for (const b of ausentes) {
		if (!o.desativar) linha('sem arquivo', b.id, `(equipe ${b.equipe}) continua ativo; --desativar-ausentes desativa`);
		else linha(o.conferir ? 'a desativar' : 'desativado', b.id, `(equipe ${b.equipe})`);
	}
}

function resumo({ itens, ausentes }, o) {
	const conta = (t) => itens.filter((x) => x.tipo === t).length;
	const partes = [plural(conta('novo'), 'novo', 'novos'), plural(conta('mudou'), 'mudou', 'mudaram'), plural(conta('igual'), 'igual', 'iguais')];
	if (o.desativar && ausentes.length) partes.push(plural(ausentes.length, 'desativado', 'desativados'));
	return partes.join(', ');
}

// ------------------------------------------------------------ banco

const SELECT = `select ${COLUNAS.join(', ')} from public.dgathe_agentes`;

/** Upsert que só regrava (e só mexe no atualizado_em) quando algum campo mudou. */
const UPSERT = `insert into public.dgathe_agentes (${COLUNAS.join(', ')})
values (${COLUNAS.map((_, i) => `$${i + 1}`).join(', ')})
on conflict (id) do update set ${COLUNAS.slice(1)
	.map((c) => `${c} = excluded.${c}`)
	.join(', ')}, atualizado_em = now()
where (${COLUNAS.slice(1)
	.map((c) => `dgathe_agentes.${c}`)
	.join(', ')}) is distinct from (${COLUNAS.slice(1)
	.map((c) => `excluded.${c}`)
	.join(', ')})`;

function conectar() {
	const senha = process.env.PGPASSWORD || lerEnv(join(CONFIG, 'backup.env')).PGPASSWORD;
	if (!senha) return null;
	const host = process.env.DGATHE_PG_HOST || lerEnv(join(CONFIG, 'ponte.env')).DGATHE_PG_HOST || HOST_PADRAO;
	return new pg.Client({
		host,
		port: 5432,
		user: 'postgres',
		password: senha,
		database: 'postgres',
		ssl: { rejectUnauthorized: false },
		connectionTimeoutMillis: 15000
	});
}

/**
 * Grava o plano numa transação. Ordem: os desativados, depois quem não é líder
 * ativo, por fim os líderes ativos. O índice único de um líder ativo por equipe
 * pede isso: na troca de líder, o antigo deixa a vaga antes de o novo entrar.
 */
async function gravar(db, plano, o) {
	await db.query('begin');
	try {
		// Trava as linhas e refaz o plano com o que está no banco agora
		const banco = (await db.query(`${SELECT} for update`)).rows;
		const p = planejar(plano.lista, banco, plano.equipes, o.desativar);
		if (p.problemas.length) throw Object.assign(new Error(p.problemas.map(formatarProblema).join('\n')), { definicao: true });

		if (o.desativar && p.ausentes.length)
			await db.query('update public.dgathe_agentes set ativo = false, atualizado_em = now() where id = any($1::text[]) and ativo', [
				p.ausentes.map((b) => b.id)
			]);
		const aGravar = p.itens.filter((x) => x.tipo !== 'igual');
		for (const lider of [false, true])
			for (const x of aGravar.filter((y) => (y.d.lider && y.d.ativo) === lider))
				await db.query(UPSERT, COLUNAS.map((c) => x.d[c]));

		// Confere antes de fechar: o banco tem que ter ficado igual aos arquivos
		const depois = new Map((await db.query(`${SELECT} where id = any($1::text[])`, [plano.lista.map((x) => x.definicao.id)])).rows.map((b) => [b.id, b]));
		for (const { definicao: d } of plano.lista) {
			const b = depois.get(d.id);
			const campos = b ? diferencas(d, b) : ['a linha não existe'];
			if (campos.length) throw new Error(`depois de gravar, ${d.id} ainda difere do arquivo em: ${campos.join(', ')}`);
		}
		await db.query('commit');
		return p;
	} catch (e) {
		await db.query('rollback').catch(() => {});
		throw e;
	}
}

// ------------------------------------------------------------ principal

async function principal() {
	const o = lerArgumentos(process.argv.slice(2));
	if (o.erro) {
		console.error(`${o.erro}\n\n${AJUDA}`);
		return 2;
	}
	if (o.ajuda) {
		console.log(AJUDA);
		return 0;
	}
	if (!ehPasta(o.pasta)) {
		console.error(`A pasta ${o.pasta} não existe.`);
		return 2;
	}

	// 1. Arquivos
	const lidos = lerPasta(o.pasta);
	const erros = lidos.problemas.filter((p) => !p.aviso);
	const avisos = lidos.problemas.filter((p) => p.aviso);
	console.log(
		`Definições em ${lidos.rotulo}/: ${lidos.total} arquivo(s), ${plural(lidos.equipes.length, 'equipe', 'equipes')}${lidos.equipes.length ? ` (${lidos.equipes.join(', ')})` : ''}`
	);
	for (const p of avisos) console.log(formatarProblema(p));
	if (erros.length) {
		console.log('');
		for (const p of erros) console.log(formatarProblema(p));
		console.log('\nNada foi gravado.');
		return 1;
	}
	if (!lidos.lista.length) {
		console.log(`\nNenhuma definição em ${lidos.rotulo}/<equipe>/<id>.md. Nada foi gravado.`);
		return 1;
	}

	// 2. Banco
	const db = conectar();
	if (!db) {
		console.error(`Sem a senha do banco: falta PGPASSWORD em ${join(CONFIG, 'backup.env')}.`);
		return 2;
	}
	try {
		await db.connect();
	} catch (e) {
		console.error(`Não deu para conectar no banco: ${e.message}`);
		return 2;
	}
	try {
		try {
			await db.query('select equipe, lider from public.dgathe_agentes limit 0');
		} catch (e) {
			if (e.code === '42703') {
				console.error('Rode a migration 0102 antes.');
				return 2;
			}
			throw e;
		}

		// 3. Comparação
		const plano = { lista: lidos.lista, equipes: lidos.equipes };
		let p = planejar(plano.lista, (await db.query(SELECT)).rows, plano.equipes, o.desativar);
		if (p.problemas.length) {
			console.log('');
			for (const x of p.problemas) console.log(formatarProblema(x));
			console.log('\nNada foi gravado.');
			return 1;
		}
		if (o.conferir) {
			console.log('');
			imprimirPlano(p, o);
			console.log(`\nGravaria: ${resumo(p, o)}.`);
			console.log('Nada foi gravado (--conferir).');
			return 0;
		}

		// 4. Gravação
		const mudancas = p.itens.some((x) => x.tipo !== 'igual') || (o.desativar && p.ausentes.length > 0);
		if (mudancas) {
			try {
				p = await gravar(db, plano, o);
			} catch (e) {
				if (e.definicao) {
					console.log(`\n${e.message}\n\nNada foi gravado.`);
					return 1;
				}
				console.error(`\nErro ao gravar (tudo desfeito, nada foi gravado): ${e.message}`);
				return 2;
			}
		}

		// 5. Saída
		console.log('');
		imprimirPlano(p, o);
		console.log(mudancas ? `\nGravado: ${resumo(p, o)}.` : `\nNada mudou: ${resumo(p, o)}.`);
		return 0;
	} catch (e) {
		console.error(`Não deu: ${e.message}`);
		return 2;
	} finally {
		await db.end().catch(() => {});
	}
}

process.exitCode = await principal();
