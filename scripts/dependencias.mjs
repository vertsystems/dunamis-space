// Mantém a pasta `node_modules` FORA do Google Drive.
//
// Por que existe: este repositório mora dentro do Google Drive, e as
// dependências são ~30 mil arquivos que não são código nosso — o Git já os
// ignora, mas o Drive não, e ele sincronizava tudo. A solução é guardá-las em
// disco local e deixar no projeto apenas um atalho (symlink).
//
// O porém: `npm install` APAGA o atalho e recria uma pasta de verdade no lugar
// (comprovado em 08/09/2026). Por isso a instalação não acontece aqui dentro:
// este script monta uma cópia mínima do package.json numa pasta local, roda o
// `npm ci` LÁ, e só então aponta o atalho para o resultado. O npm nunca chega
// perto do atalho, então ele não tem como desfazê-lo.
//
// Uso:  npm run deps        (reinstala quando o package.json mudar)
// O `npm test` chama isto sozinho quando falta alguma coisa.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	copyFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	readlinkSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const raiz = dirname(dirname(fileURLToPath(import.meta.url)));

/** Onde as coisas locais deste projeto ficam. Nada aqui vai para o Drive. */
export const pastaLocal = join(homedir(), 'Documents', 'repo claude', 'dspace');
export const modulosLocais = join(pastaLocal, 'node_modules');

/** O projeto está dentro de um volume do Google Drive? */
export function noDrive(caminho = raiz) {
	return caminho.includes('/CloudStorage/') || caminho.includes('/Google Drive');
}

function hashDoLock() {
	const lock = join(raiz, 'package-lock.json');
	return existsSync(lock) ? createHash('sha256').update(readFileSync(lock)).digest('hex') : '';
}

/**
 * Instala as dependências na pasta local. A cópia do package.json vai SEM a
 * seção "scripts": o `prepare` do projeto roda os geradores e o `svelte-kit
 * sync`, que precisam de `src/` e `static/` — e aqui só queremos os pacotes.
 */
function instalar() {
	mkdirSync(pastaLocal, { recursive: true });

	const pkg = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
	delete pkg.scripts;
	writeFileSync(join(pastaLocal, 'package.json'), JSON.stringify(pkg, null, '\t') + '\n');
	copyFileSync(join(raiz, 'package-lock.json'), join(pastaLocal, 'package-lock.json'));
	if (existsSync(join(raiz, '.npmrc'))) copyFileSync(join(raiz, '.npmrc'), join(pastaLocal, '.npmrc'));

	console.log(`Instalando as dependências em ${pastaLocal}\n`);
	const r = spawnSync('npm', ['ci'], { cwd: pastaLocal, stdio: 'inherit' });
	if ((r.status ?? 1) !== 0) {
		console.error('\nA instalação falhou. As dependências não foram trocadas.');
		process.exit(r.status ?? 1);
	}
	writeFileSync(join(pastaLocal, '.hash-do-lock'), hashDoLock());
}

/** Troca o `node_modules` do projeto por um atalho para a pasta local. */
function apontarAtalho() {
	const alvo = join(raiz, 'node_modules');
	if (existsSync(alvo) || lstatSync(alvo, { throwIfNoEntry: false })) {
		const info = lstatSync(alvo);
		if (info.isSymbolicLink()) {
			if (readlinkSync(alvo) === modulosLocais) return; // já está certo
			rmSync(alvo);
		} else {
			// Pasta de verdade no Drive: some daqui, o conteúdo já está na local.
			console.log('Removendo a pasta node_modules de dentro do Drive…');
			rmSync(alvo, { recursive: true, force: true });
		}
	}
	symlinkSync(modulosLocais, alvo);
	console.log(`node_modules agora é um atalho para ${modulosLocais}`);
}

/**
 * Garante que as dependências locais existem e que o atalho aponta para elas.
 * Reinstala só quando o package-lock mudou.
 */
export function garantirDependencias({ forcar = false } = {}) {
	if (!noDrive()) return; // fora do Drive não há nada a resolver

	const marca = join(pastaLocal, '.hash-do-lock');
	const instalado = existsSync(modulosLocais) && existsSync(join(modulosLocais, '.package-lock.json'));
	const atualizado = existsSync(marca) && readFileSync(marca, 'utf8').trim() === hashDoLock();

	if (forcar || !instalado || !atualizado) instalar();
	apontarAtalho();
}

// Rodado direto (`npm run deps`): reinstala sempre.
if (process.argv[1] && process.argv[1].endsWith('dependencias.mjs')) {
	if (!noDrive()) {
		console.log('O projeto não está no Google Drive — rode `npm install` normalmente.');
		process.exit(0);
	}
	garantirDependencias({ forcar: true });
	console.log('\nPronto.');
}
