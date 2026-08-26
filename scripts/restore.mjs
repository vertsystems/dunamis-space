#!/usr/bin/env node
/**
 * Restaura um backup gerado por scripts/backup.mjs.
 *
 * Antes de rodar, o banco de destino precisa ter a ESTRUTURA: aplique as
 * migrations de supabase/migrations/ na ordem (elas são idempotentes).
 *
 *   PGPASSWORD='...' node scripts/restore.mjs backups/2026-08-26_dunamisspace.sql.gz
 *
 * Por padrão só INSERE. Se o banco já tiver dados e você quiser trocar tudo
 * pelo backup, use --limpar (apaga as tabelas na ordem inversa das dependências
 * antes de inserir). Ele pergunta antes, porque não dá para desfazer.
 */
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createInterface } from 'node:readline/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import pg from 'pg';

const alvo = process.argv[2];
const limpar = process.argv.includes('--limpar');
if (!alvo || !existsSync(alvo)) {
	console.error('Uso: node scripts/restore.mjs <arquivo.sql.gz> [--limpar]');
	process.exit(1);
}

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

const senha = senhaDoBanco();
if (!senha) {
	console.error('ERRO: senha do banco não encontrada (PGPASSWORD ou ~/.config/dunamisspace/backup.env).');
	process.exit(1);
}

const sql = alvo.endsWith('.gz')
	? gunzipSync(readFileSync(alvo)).toString('utf8')
	: readFileSync(alvo, 'utf8');
const inserts = (sql.match(/^INSERT INTO/gm) || []).length;
const tabelas = [...new Set([...sql.matchAll(/^INSERT INTO public\."([^"]+)"/gm)].map((m) => m[1]))];

console.log(`Arquivo: ${alvo}`);
console.log(`Contém: ${inserts} linhas em ${tabelas.length} tabelas`);
console.log(`Destino: db.rboenllphxqecjroolzo.supabase.co`);
if (limpar) console.log('MODO --limpar: os dados atuais dessas tabelas serão APAGADOS antes.');

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ok = await rl.question('Confirma? (digite "sim") ');
rl.close();
if (ok.trim().toLowerCase() !== 'sim') {
	console.log('Cancelado.');
	process.exit(0);
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

try {
	await cliente.connect();
	if (limpar) {
		// Ordem inversa à dos INSERTs: filhas primeiro, pais depois.
		const reverso = [...tabelas].reverse().map((t) => `delete from public."${t}";`).join('\n');
		await cliente.query(`BEGIN;\n${reverso}\nCOMMIT;`);
		console.log(`Limpou ${tabelas.length} tabelas.`);
	}
	await cliente.query(sql);
	console.log(`Restaurado: ${inserts} linhas.`);
} catch (e) {
	console.error('ERRO na restauração:', e.message);
	process.exitCode = 1;
} finally {
	await cliente.end().catch(() => {});
}
