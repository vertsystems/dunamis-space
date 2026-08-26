#!/usr/bin/env node
/**
 * Backup do Dunamis Space — dados do banco + arquivos do Storage.
 *
 * Por que em Node e não `pg_dump`: o Mac do Bruno não tem cliente Postgres
 * instalado (nem Homebrew para instalar), e o banco inteiro cabe em poucos MB.
 * A ESTRUTURA das tabelas já está versionada em supabase/migrations/ — o que
 * precisa de cópia são os DADOS.
 *
 * O que gera, em backups/:
 *   AAAA-MM-DD_dunamisspace.sql.gz   INSERTs de todas as tabelas, na ordem em
 *                                    que podem ser inseridas (pais antes de
 *                                    filhos), dentro de uma transação.
 *   arquivos/<bucket>/<nome>         espelho dos arquivos do Storage (logos dos
 *                                    clientes, prints do SOS). Só baixa o que
 *                                    falta; nada é apagado daqui.
 *   ultimo-backup.txt                resumo legível da última execução.
 *
 * Como restaurar: `node scripts/restore.mjs backups/<arquivo>.sql.gz` num banco
 * que já tenha as migrations aplicadas (o próprio arquivo explica no cabeçalho).
 *
 * Rodar na mão:  PGPASSWORD='...' node scripts/backup.mjs
 * Agendado:      launchd chama este script nos dias 10 e 25 (ver docs/BACKUP.md)
 *                e a senha vem de ~/.config/dunamisspace/backup.env
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createGzip, gunzipSync } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = path.join(RAIZ, 'backups');
const DESTINO_ARQUIVOS = path.join(DESTINO, 'arquivos');
/** Quantos dumps guardar (2 por mês → 24 = um ano). Os arquivos nunca somem. */
const MANTER = 24;

const log = [];
function diz(msg) {
	const linha = `${new Date().toISOString().slice(0, 19).replace('T', ' ')}  ${msg}`;
	console.log(linha);
	log.push(msg);
}

/** Senha: da variável de ambiente ou do arquivo fora do repositório. */
function senhaDoBanco() {
	if (process.env.PGPASSWORD) return process.env.PGPASSWORD;
	const env = path.join(homedir(), '.config', 'dunamisspace', 'backup.env');
	if (existsSync(env)) {
		for (const linha of readFileSync(env, 'utf8').split('\n')) {
			const m = linha.match(/^\s*PGPASSWORD\s*=\s*(.+?)\s*$/);
			if (m) return m[1].replace(/^['"]|['"]$/g, '');
		}
	}
	return null;
}

/** URL e chave pública do Supabase, lidas do .env do projeto (para o Storage). */
function configSupabase() {
	const arquivo = path.join(RAIZ, '.env');
	if (!existsSync(arquivo)) return {};
	const out = {};
	for (const linha of readFileSync(arquivo, 'utf8').split('\n')) {
		const m = linha.match(/^\s*(PUBLIC_SUPABASE_URL|PUBLIC_SUPABASE_ANON_KEY)\s*=\s*(.+?)\s*$/);
		if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
	}
	return out;
}

/**
 * Ordem de inserção: uma tabela só entra depois daquelas de quem ela depende.
 * Sem isso, restaurar quebraria na primeira chave estrangeira.
 */
function ordenarPorDependencia(tabelas, arestas) {
	const restantes = new Set(tabelas);
	const ordem = [];
	while (restantes.size) {
		const livres = [...restantes].filter((t) =>
			!arestas.some((a) => a.filha === t && a.pai !== t && restantes.has(a.pai))
		);
		// Ciclo entre tabelas (A aponta para B que aponta para A): o resto entra
		// como está — o restore desliga as travas quando precisa.
		if (!livres.length) {
			ordem.push(...[...restantes].sort());
			break;
		}
		livres.sort().forEach((t) => {
			ordem.push(t);
			restantes.delete(t);
		});
	}
	return ordem;
}

async function baixarArquivos(cliente, { PUBLIC_SUPABASE_URL: url }) {
	if (!url) {
		diz('Storage: PUBLIC_SUPABASE_URL não encontrada no .env — arquivos não copiados.');
		return { baixados: 0, total: 0, bytes: 0 };
	}
	const { rows } = await cliente.query(
		`select o.bucket_id, o.name, (o.metadata->>'size')::bigint as bytes, b.public
		 from storage.objects o join storage.buckets b on b.id = o.bucket_id
		 order by 1, 2`
	);
	let baixados = 0;
	let bytes = 0;
	for (const o of rows) {
		const destino = path.join(DESTINO_ARQUIVOS, o.bucket_id, o.name);
		bytes += Number(o.bytes ?? 0);
		if (existsSync(destino)) continue; // já temos esta cópia
		if (!o.public) {
			diz(`Storage: ${o.bucket_id}/${o.name} está num bucket privado — pulado.`);
			continue;
		}
		mkdirSync(path.dirname(destino), { recursive: true });
		const r = await fetch(`${url}/storage/v1/object/public/${o.bucket_id}/${encodeURIComponent(o.name)}`);
		if (!r.ok) {
			diz(`Storage: falhou ao baixar ${o.bucket_id}/${o.name} (HTTP ${r.status}).`);
			continue;
		}
		writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
		baixados++;
	}
	return { baixados, total: rows.length, bytes };
}

const senha = senhaDoBanco();
if (!senha) {
	console.error(
		'ERRO: senha do banco não encontrada.\n' +
		'  Rodando na mão:  PGPASSWORD=\'...\' node scripts/backup.mjs\n' +
		'  Agendado:        crie ~/.config/dunamisspace/backup.env com PGPASSWORD=...'
	);
	process.exit(1);
}

const cliente = new pg.Client({
	host: 'db.rboenllphxqecjroolzo.supabase.co',
	port: 5432,
	user: 'postgres',
	password: senha,
	database: 'postgres',
	ssl: { rejectUnauthorized: false },
	connectionTimeoutMillis: 30000
});

const hoje = new Date().toISOString().slice(0, 10);
const arquivoSql = path.join(DESTINO, `${hoje}_dunamisspace.sql.gz`);

try {
	mkdirSync(DESTINO, { recursive: true });
	await cliente.connect();
	diz('Conectado ao banco.');

	const { rows: tabelas } = await cliente.query(
		`select c.relname as tabela from pg_class c
		 join pg_namespace n on n.oid = c.relnamespace
		 where n.nspname = 'public' and c.relkind = 'r'
		 order by 1`
	);
	const { rows: fks } = await cliente.query(
		`select conrelid::regclass::text as filha, confrelid::regclass::text as pai
		 from pg_constraint
		 where contype = 'f' and connamespace = 'public'::regnamespace`
	);
	const nomes = tabelas.map((t) => t.tabela);
	const ordem = ordenarPorDependencia(
		nomes,
		fks.map((f) => ({ filha: f.filha.replace(/^public\./, ''), pai: f.pai.replace(/^public\./, '') }))
	);

	const partes = [];
	const contagem = {};
	let totalLinhas = 0;

	for (const tabela of ordem) {
		const { rows: cols } = await cliente.query(
			`select attname from pg_attribute
			 where attrelid = format('public.%I', $1::text)::regclass and attnum > 0 and not attisdropped
			 order by attnum`,
			[tabela]
		);
		const listaCols = cols.map((c) => `"${c.attname}"`).join(', ');
		// Cada valor vai como texto entre aspas e o Postgres reconverte para o tipo
		// da coluna na hora do INSERT. Resolve uuid, array, jsonb e data de uma vez,
		// sem precisar escapar nada à mão aqui no Node.
		const valores = cols.map((c) => `quote_nullable("${c.attname}"::text)`).join(", ', ', ");
		const { rows: linhas } = await cliente.query(
			`select 'INSERT INTO public."${tabela}" (${listaCols}) VALUES (' || concat(${valores}) || ');' as sql
			 from public."${tabela}"`
		);
		contagem[tabela] = linhas.length;
		totalLinhas += linhas.length;
		if (!linhas.length) continue;
		partes.push(`\n-- ${tabela} (${linhas.length} linhas)`);
		partes.push(...linhas.map((l) => l.sql));
	}

	// Quem tem login, para referência: recriar usuário é manual (o Supabase não
	// aceita reinserir auth.users por SQL). Sem hash de senha aqui, de propósito.
	const { rows: usuarios } = await cliente.query(
		`select email, created_at::date as desde, last_sign_in_at::date as ultimo_login
		 from auth.users order by created_at`
	);

	const cabecalho = [
		'-- ============================================================',
		'-- Backup de DADOS do Dunamis Space',
		`-- Gerado em ${new Date().toISOString()}`,
		`-- ${ordem.length} tabelas, ${totalLinhas} linhas`,
		'--',
		'-- COMO RESTAURAR',
		'--   1. Num banco novo, aplique as migrations de supabase/migrations/ na ordem.',
		'--   2. node scripts/restore.mjs backups/<este-arquivo>.sql.gz',
		'--      (ou descompacte e cole no SQL Editor do Supabase)',
		'--   3. Recrie os logins no painel (Authentication → Users):',
		...usuarios.map((u) => `--      ${u.email}  (desde ${u.desde}, último acesso ${u.ultimo_login ?? '—'})`),
		'--',
		'-- Os INSERTs estão na ordem em que as tabelas podem ser inseridas.',
		'-- ============================================================',
		'BEGIN;',
		''
	].join('\n');

	const conteudo = `${cabecalho}${partes.join('\n')}\n\nCOMMIT;\n`;
	await pipeline(Readable.from([conteudo]), createGzip({ level: 9 }), createWriteStream(arquivoSql));

	// Confere que o arquivo volta a abrir e tem tudo o que se esperava.
	const devolta = gunzipSync(readFileSync(arquivoSql)).toString('utf8');
	const inserts = (devolta.match(/^INSERT INTO/gm) || []).length;
	if (inserts !== totalLinhas) throw new Error(`arquivo conferido: ${inserts} INSERTs para ${totalLinhas} linhas`);
	const tamanho = readFileSync(arquivoSql).length;
	diz(`Banco: ${totalLinhas} linhas de ${ordem.length} tabelas → ${(tamanho / 1024).toFixed(0)} kB (conferido).`);

	const arq = await baixarArquivos(cliente, configSupabase());
	diz(`Arquivos: ${arq.baixados} novos de ${arq.total} no Storage (${(arq.bytes / 1024).toFixed(0)} kB no total).`);

	// Faxina: mantém os últimos MANTER dumps. Os arquivos do Storage ficam.
	const dumps = readdirSync(DESTINO).filter((f) => f.endsWith('_dunamisspace.sql.gz')).sort();
	const apagar = dumps.slice(0, Math.max(0, dumps.length - MANTER));
	apagar.forEach((f) => unlinkSync(path.join(DESTINO, f)));
	if (apagar.length) diz(`Faxina: ${apagar.length} backup(s) antigo(s) removido(s), ${MANTER} mantidos.`);

	const top = Object.entries(contagem)
		.filter(([, n]) => n > 0)
		.sort((a, b) => b[1] - a[1]);
	writeFileSync(
		path.join(DESTINO, 'ultimo-backup.txt'),
		[
			`Último backup: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
			`Arquivo: ${path.basename(arquivoSql)} (${(tamanho / 1024).toFixed(0)} kB)`,
			'',
			...log.map((l) => `- ${l}`),
			'',
			'Linhas por tabela:',
			...top.map(([t, n]) => `  ${t.padEnd(30)} ${n}`),
			'',
			'Restaurar: node scripts/restore.mjs backups/' + path.basename(arquivoSql),
			''
		].join('\n')
	);
	diz('Pronto.');
} catch (e) {
	console.error('ERRO no backup:', e.message);
	try {
		writeFileSync(
			path.join(DESTINO, 'ultimo-backup.txt'),
			`FALHOU em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n${e.message}\n`
		);
	} catch {}
	process.exitCode = 1;
} finally {
	await cliente.end().catch(() => {});
}
