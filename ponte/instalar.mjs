#!/usr/bin/env node
// Instala (ou atualiza) a ponte do DGathe neste Mac.
//
//   node ponte/instalar.mjs              cria a senha (se ainda não houver), grava a
//                                        configuração e liga a ponte no launchd
//   node ponte/instalar.mjs --senha-nova troca a senha do usuário dgathe_ponte no banco
//   node ponte/instalar.mjs --sem-launchd  só a senha e a configuração (para testar à mão)
//   node ponte/instalar.mjs --parar      desliga a ponte (tira do launchd)
//   node ponte/instalar.mjs --status     mostra se está rodando e o fim do log
//
// Para criar ou trocar a senha usa a senha do Postgres que já fica no Mac
// (~/.config/dunamisspace/backup.env, a mesma do backup e das migrations).
//
// O plist guarda o caminho desta pasta: se a dunamisspace mudar de lugar,
// rodar este instalador de novo.

import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PROJETO = resolve(AQUI, '..');
const CONFIG = join(homedir(), '.config/dunamisspace');
const ENV = join(CONFIG, 'ponte.env');
const BACKUP_ENV = join(CONFIG, 'backup.env');
const ROTULO = 'com.vertsystems.dgathe-ponte';
const PLIST = join(homedir(), 'Library/LaunchAgents', `${ROTULO}.plist`);
const LOG = join(homedir(), 'Library/Logs/dgathe-ponte.log');
const DOMINIO = `gui/${userInfo().uid}`;
const HOST = 'db.rboenllphxqecjroolzo.supabase.co';

const args = process.argv.slice(2);
const tem = (f) => args.includes(f);

function lerEnv(arquivo) {
	const r = {};
	if (!existsSync(arquivo)) return r;
	for (const linha of readFileSync(arquivo, 'utf8').split('\n')) {
		const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
		if (m) r[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
	}
	return r;
}

function launchctl(...a) {
	return spawnSync('/bin/launchctl', a, { encoding: 'utf8' });
}

function status() {
	const r = launchctl('print', `${DOMINIO}/${ROTULO}`);
	if (r.status !== 0) {
		console.log('A ponte não está no launchd.');
		return;
	}
	const pega = (chave) => r.stdout.match(new RegExp(`\\n\\s*${chave} = ([^\\n]+)`))?.[1]?.trim();
	console.log(`launchd: ${pega('state') ?? '?'} · pid ${pega('pid') ?? '-'} · execuções ${pega('runs') ?? '?'} · última saída ${pega('last exit code') ?? '-'}`);
	if (existsSync(LOG)) {
		const linhas = readFileSync(LOG, 'utf8').trimEnd().split('\n');
		console.log(`\nFim do log (${LOG}):`);
		console.log(linhas.slice(-12).join('\n'));
	}
}

function parar() {
	const r = launchctl('bootout', `${DOMINIO}/${ROTULO}`);
	console.log(r.status === 0 ? 'Ponte desligada.' : 'A ponte já não estava ligada.');
}

/** O PATH do terminal do Bruno (o launchd começa com um PATH mínimo). */
function pathDoTerminal() {
	try {
		const saida = execFileSync('/bin/zsh', ['-lic', 'printf "__PATH__%s" "$PATH"'], { encoding: 'utf8', timeout: 15_000 });
		const p = saida.split('__PATH__').pop()?.trim();
		if (p) return p;
	} catch {}
	return '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin';
}

async function trocarSenha() {
	const admin = lerEnv(BACKUP_ENV).PGPASSWORD || process.env.PGPASSWORD;
	if (!admin) throw new Error(`Sem a senha do Postgres em ${BACKUP_ENV}`);
	const senha = randomBytes(24).toString('base64url');
	const c = new pg.Client({ host: HOST, port: 5432, user: 'postgres', password: admin, database: 'postgres', ssl: { rejectUnauthorized: false } });
	await c.connect();
	try {
		await c.query(`alter role dgathe_ponte with login password ${c.escapeLiteral(senha)}`);
	} finally {
		await c.end();
	}
	return senha;
}

function xml(t) {
	return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function instalar() {
	mkdirSync(CONFIG, { recursive: true });
	const atual = lerEnv(ENV);
	let senha = atual.DGATHE_PG_SENHA;
	if (!senha || tem('--senha-nova')) {
		senha = await trocarSenha();
		console.log('Senha do usuário dgathe_ponte criada no banco.');
	}
	const PATH = pathDoTerminal();
	const conf = {
		DGATHE_PG_SENHA: senha,
		DGATHE_PONTE_ID: atual.DGATHE_PONTE_ID || 'mac-bruno',
		DGATHE_BASE: atual.DGATHE_BASE || resolve(PROJETO, '../..'),
		DGATHE_MAX: atual.DGATHE_MAX || '3',
		DGATHE_PATH: PATH,
		...(atual.DGATHE_CLAUDE ? { DGATHE_CLAUDE: atual.DGATHE_CLAUDE } : {})
	};
	writeFileSync(
		ENV,
		[
			'# Ponte do DGathe (dunamisspace/ponte). Gerado por ponte/instalar.mjs.',
			'# A senha é do usuário dgathe_ponte, que só enxerga as tabelas do DGathe.',
			...Object.entries(conf).map(([k, v]) => `${k}=${v}`)
		].join('\n') + '\n'
	);
	chmodSync(ENV, 0o600);
	console.log(`Configuração gravada em ${ENV}`);
	if (tem('--sem-launchd')) return;

	mkdirSync(dirname(PLIST), { recursive: true });
	mkdirSync(dirname(LOG), { recursive: true });
	writeFileSync(
		PLIST,
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key><string>${ROTULO}</string>
	<key>ProgramArguments</key>
	<array>
		<string>${xml(process.execPath)}</string>
		<string>${xml(join(AQUI, 'ponte.mjs'))}</string>
	</array>
	<key>WorkingDirectory</key><string>${xml(PROJETO)}</string>
	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key><string>${xml(PATH)}</string>
		<key>LANG</key><string>pt_BR.UTF-8</string>
	</dict>
	<key>RunAtLoad</key><true/>
	<key>KeepAlive</key><true/>
	<key>ThrottleInterval</key><integer>15</integer>
	<key>ProcessType</key><string>Interactive</string>
	<key>StandardOutPath</key><string>${xml(LOG)}</string>
	<key>StandardErrorPath</key><string>${xml(LOG)}</string>
</dict>
</plist>
`
	);
	// O bootout volta antes de a ponte velha sair de fato; ligar a nova nesse meio
	// dá "Bootstrap failed: 5" e deixa a ponte desligada (aconteceu em 10/11/2026).
	// Espera ela sair e tenta de novo, se precisar.
	launchctl('bootout', `${DOMINIO}/${ROTULO}`);
	const dorme = (ms) => new Promise((res) => setTimeout(res, ms));
	for (let i = 0; i < 60 && launchctl('print', `${DOMINIO}/${ROTULO}`).status === 0; i++) await dorme(250);
	let r;
	for (let i = 0; i < 6; i++) {
		r = launchctl('bootstrap', DOMINIO, PLIST);
		if (r.status === 0) break;
		await dorme(2000);
	}
	if (r.status !== 0) throw new Error(`launchctl bootstrap falhou: ${r.stderr || r.stdout}. A ponte está DESLIGADA: rode de novo.`);
	console.log(`Ponte ligada no launchd (${ROTULO}). Log: ${LOG}`);
	await new Promise((res) => setTimeout(res, 4000));
	status();
}

try {
	if (tem('--status')) status();
	else if (tem('--parar')) parar();
	else await instalar();
} catch (e) {
	console.error('Erro:', e.message);
	process.exitCode = 1;
}
