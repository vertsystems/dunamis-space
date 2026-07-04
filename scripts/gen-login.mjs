// Gera a lista de fotos do login a partir dos arquivos em `static/login-fotos/`.
// Roda no build (prebuild) e no dev (predev). Solte imagens na pasta e elas
// entram na rotação aleatória do painel direito do login. URLs estáveis
// (/login-fotos/<arquivo>), servidas direto de static/.

import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pasta = join(raiz, 'static', 'login-fotos');
const saida = join(raiz, 'src', 'lib', 'login-fotos.generated.json');

const EXT = /\.(png|jpe?g|webp|avif|svg)$/i;

let arquivos = [];
try {
	if (existsSync(pasta)) {
		arquivos = readdirSync(pasta).filter((f) => EXT.test(f));
	}
} catch {
	arquivos = [];
}

arquivos.sort((a, b) => a.localeCompare(b, 'pt-BR'));
const urls = arquivos.map((f) => `/login-fotos/${encodeURIComponent(f)}`);

writeFileSync(saida, JSON.stringify(urls, null, 2) + '\n');
console.log(`gen-login: ${urls.length} foto(s) em static/login-fotos/.`);
