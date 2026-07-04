// Gera a lista de avatares a partir dos arquivos em `static/avatares/`.
// Roda no build (prebuild) e no dev (predev) — solte um PNG na pasta e ele
// aparece na galeria do perfil, sem tocar em código. URLs são estáveis
// (/avatares/<arquivo>), servidas direto da pasta static/.

import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pasta = join(raiz, 'static', 'avatares');
const saida = join(raiz, 'src', 'lib', 'avatares.generated.json');

const EXT = /\.(png|jpe?g|webp|svg)$/i;

let arquivos = [];
try {
	if (existsSync(pasta)) {
		arquivos = readdirSync(pasta).filter((f) => EXT.test(f));
	}
} catch {
	arquivos = [];
}

arquivos.sort((a, b) => a.localeCompare(b, 'pt-BR'));

const avatares = arquivos.map((f) => {
	const base = f.replace(EXT, '');
	const nome = base.charAt(0).toUpperCase() + base.slice(1).replace(/[-_]+/g, ' ');
	return { key: f, nome, url: `/avatares/${encodeURIComponent(f)}` };
});

writeFileSync(saida, JSON.stringify(avatares, null, 2) + '\n');
console.log(`gen-avatares: ${avatares.length} avatar(es) em static/avatares/.`);
