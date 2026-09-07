// Gera os logos das marcas a partir do acervo `simple-icons`. Escreve dois
// produtos:
//
//   static/marcas/<slug>.svg     — um arquivo por logo, já na cor da marca
//   src/lib/marcas.generated.json — a lista (slug, título, cor), SEM os paths
//
// Por que separado: o desenho de um logo custa de 0,5 a 5 KB, e mandar os 100
// no bundle seria ~110 KB carregados por uma tela que mostra três. Como
// arquivo estático, o navegador baixa só os que aparecem — e os guarda em
// cache. O JSON que vai ao cliente fica com uns 5 KB e serve só para
// RECONHECER a marca escrita no campo.
//
// Por que não importar `simple-icons` direto no app: o pacote inteiro passa de
// 3 MB (são milhares de logos).
//
// Para ensinar uma marca nova ao sistema: acrescente o slug em MARCAS e rode
// `npm run marcas`. O slug é o mesmo de simpleicons.org (ex.: "nextdotjs").
// Se o slug não existir no acervo, o script avisa e segue — nunca quebra o
// build por causa de um logo.
//
// ATENÇÃO: algumas marcas NÃO estão no acervo, removidas de lá a pedido dos
// donos das marcas — AWS, Adobe, Slack, LinkedIn, OpenAI e Heroku, entre
// outras. Não há como incluí-las por aqui; o campo simplesmente fica sem logo.
//
//   npm run marcas
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as si from 'simple-icons';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = join(raiz, 'src', 'lib', 'marcas.generated.json');
const pastaSvg = join(raiz, 'static', 'marcas');

/**
 * As marcas que aparecem nos campos de "onde está" (hospedagem, banco,
 * repositório) e nas anotações. Agrupadas só para facilitar a leitura — o
 * arquivo gerado é uma lista plana.
 */
const MARCAS = [
	// Hospedagem e deploy
	'vercel', 'netlify', 'cloudflare', 'railway', 'render', 'digitalocean',
	'googlecloud', 'firebase', 'hostinger', 'godaddy', 'namecheap',
	'cpanel', 'plesk', 'nginx', 'docker', 'kubernetes', 'ubuntu', 'linux',
	// Banco de dados
	'supabase', 'postgresql', 'mysql', 'mariadb', 'sqlite', 'mongodb', 'redis',
	'planetscale', 'neon', 'turso', 'upstash', 'prisma', 'clickhouse',
	// Repositório
	'github', 'gitlab', 'bitbucket', 'gitea', 'codeberg', 'git',
	// Frameworks e linguagens
	'svelte', 'react', 'nextdotjs', 'nuxt', 'vuedotjs', 'astro', 'angular', 'nodedotjs',
	'deno', 'bun', 'typescript', 'javascript', 'python', 'django', 'php', 'laravel',
	'rubyonrails', 'go', 'rust', 'dotnet', 'tailwindcss', 'vite', 'expo', 'flutter',
	// Sites, lojas e CMS
	'wordpress', 'shopify', 'woocommerce', 'wix', 'squarespace', 'webflow', 'framer',
	'contentful', 'strapi', 'sanity',
	// Pagamentos
	'stripe', 'paypal', 'mercadopago', 'pagseguro', 'pix',
	// Ferramentas do dia a dia
	'figma', 'notion', 'trello', 'asana', 'clickup', 'googledrive', 'dropbox',
	'sentry', 'posthog', 'googleanalytics', 'googletagmanager',
	'cloudinary', 'anthropic', 'n8n', 'zapier', 'make',
	// Redes e comunicação
	'whatsapp', 'instagram', 'facebook', 'meta', 'youtube', 'tiktok', 
	'telegram', 'discord', 'gmail', 'googlesheets'
];

/** `siNomeDaMarca` é como o pacote exporta cada ícone. */
function exportKey(slug) {
	return 'si' + slug.charAt(0).toUpperCase() + slug.slice(1);
}

const marcas = [];
const faltando = [];

// A pasta é recriada do zero: slug removido de MARCAS não pode deixar SVG órfão.
rmSync(pastaSvg, { recursive: true, force: true });
mkdirSync(pastaSvg, { recursive: true });

let bytesSvg = 0;
for (const slug of [...new Set(MARCAS)]) {
	const icone = si[exportKey(slug)];
	if (!icone) {
		faltando.push(slug);
		continue;
	}
	const hex = '#' + icone.hex;
	// viewBox 24×24 é o padrão do acervo; a cor entra no arquivo porque ele será
	// usado como <img>, que não herda currentColor.
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${hex}" role="img">` +
		`<title>${icone.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>` +
		`<path d="${icone.path}"/></svg>`;
	writeFileSync(join(pastaSvg, `${slug}.svg`), svg);
	bytesSvg += svg.length;

	marcas.push({ slug, titulo: icone.title, hex });
}

marcas.sort((a, b) => a.slug.localeCompare(b.slug));

writeFileSync(saida, JSON.stringify(marcas, null, '\t') + '\n');

const kbJson = Math.round((JSON.stringify(marcas).length / 1024) * 10) / 10;
const kbSvg = Math.round(bytesSvg / 1024);
console.log(
	`${marcas.length} marcas — static/marcas/*.svg (~${kbSvg} KB no total, servidos sob demanda) ` +
		`e src/lib/marcas.generated.json (~${kbJson} KB, este vai no bundle).`
);
if (faltando.length) {
	console.warn(`Slugs não encontrados no acervo (ignorados): ${faltando.join(', ')}`);
}
