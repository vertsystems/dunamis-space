// Roda a suíte de testes numa cópia local do projeto.
//
// Por que existe: este repositório mora dentro do Google Drive, e o vitest NÃO
// consegue subir seus processos de trabalho a partir de um volume do Drive —
// falha com "[vitest-pool]: Failed to start forks worker → Timeout waiting for
// worker to respond" e fica pendurado a 0% de CPU até alguém matar. Com
// --pool=threads dá o mesmo. Medido em 08/09/2026: mais de uma hora sem
// imprimir uma linha.
//
// Não é lentidão do Drive (com a pasta offline, `npm run check` leva 12 s) e
// não é o caminho ter espaços ou "@" — um caminho local com a mesma forma passa
// em 104 ms. É o spawn de worker no volume do Drive mesmo.
//
// O que este script faz: espelha `src/`, `static/` e `scripts/` numa pasta
// local, empresta o `node_modules` que já vive lá (ver dependencias.mjs) e roda
// o vitest de dentro do espelho. Quem digita `npm test` não vê diferença.
//
// Fora do Drive ele sai da frente e chama o vitest direto.

import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

import { garantirDependencias, modulosLocais, noDrive, pastaLocal, raiz } from './dependencias.mjs';

const argumentos = process.argv.slice(2);
const modoWatch = argumentos.some((a) => a === '--watch' || a === '-w');
const argsDoVitest = argumentos.filter((a) => a !== '--watch' && a !== '-w');

// Pastas espelhadas por inteiro. `static/` entra porque os geradores
// (gen-avatares, gen-login) leem de lá.
const PASTAS = ['src', 'static', 'scripts'];
const ARQUIVOS = ['package.json', 'tsconfig.json', 'vite.config.ts'];

function executar(comando, args, opcoes = {}) {
	const r = spawnSync(comando, args, { stdio: 'inherit', ...opcoes });
	if (r.error) throw r.error;
	return r.status ?? 1;
}

/** Copia o projeto para o espelho. `--delete` apaga no destino o que sumiu na origem. */
function espelhar(destino) {
	for (const pasta of PASTAS) {
		const origem = join(raiz, pasta);
		if (!existsSync(origem)) continue;
		mkdirSync(join(destino, pasta), { recursive: true });
		// As barras finais importam: mandam o CONTEÚDO da pasta, não a pasta.
		const r = spawnSync('rsync', ['-a', '--delete', `${origem}/`, `${join(destino, pasta)}/`]);
		if (r.status !== 0) throw new Error(`Falhou ao copiar ${pasta}/ para o espelho.`);
	}
	for (const arquivo of ARQUIVOS) {
		const origem = join(raiz, arquivo);
		if (existsSync(origem)) copyFileSync(origem, join(destino, arquivo));
	}
}

/** O espelho não instala nada: usa o mesmo node_modules local do projeto. */
function emprestarModulos(destino) {
	const alvo = join(destino, 'node_modules');
	const info = lstatSync(alvo, { throwIfNoEntry: false });
	if (info?.isSymbolicLink()) return;
	if (info) rmSync(alvo, { recursive: true, force: true });
	symlinkSync(modulosLocais, alvo);
}

// ---------- 1. Fora do Drive: nada disso é necessário ----------
if (!noDrive()) {
	process.exit(executar('npx', ['vitest', ...(modoWatch ? [] : ['run']), ...argsDoVitest]));
}

// ---------- 2. Prepara o espelho ----------
garantirDependencias();

const destino = join(pastaLocal, 'testes');
mkdirSync(destino, { recursive: true });

console.log(`Rodando os testes numa cópia local (o Drive trava o vitest).\n  ${destino}\n`);
espelhar(destino);
emprestarModulos(destino);

// ---------- 3. Roda o vitest de dentro do espelho ----------
const vitest = join(modulosLocais, '.bin', 'vitest');

if (!modoWatch) {
	process.exit(executar(vitest, ['run', ...argsDoVitest], { cwd: destino }));
}

// Modo watch: o vitest observa o ESPELHO, então mantemos uma cópia a cada 2 s
// para que editar um arquivo no Drive reexecute os testes como de costume.
const sincronia = setInterval(() => {
	try {
		espelhar(destino);
	} catch {
		// Uma cópia que falhou não derruba o watch — a próxima tenta de novo.
	}
}, 2000);

const filho = spawn(vitest, argsDoVitest, { cwd: destino, stdio: 'inherit' });
filho.on('exit', (codigo) => {
	clearInterval(sincronia);
	process.exit(codigo ?? 0);
});
