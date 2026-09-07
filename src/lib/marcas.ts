// Reconhece a marca escrita num campo livre e devolve o logo dela.
//
// Os campos de "onde está" do projeto são texto solto de propósito — "Vercel |
// Vert Systems", "Supabase", "github.com/vertsystems/x" — porque nenhuma lista
// fechada daria conta do que aparece na vida real. O logo entra por cima disso:
// o sistema procura no texto o nome de uma marca que conhece e, achando,
// desenha o ícone. Não achando, a linha continua igual, só sem logo.
//
// A lista vem de `marcas.generated.json` e os desenhos de `static/marcas/*.svg`
// — ambos gerados por scripts/gen-marcas.mjs a partir do acervo simple-icons.
import marcasGeradas from './marcas.generated.json';

export interface Marca {
	slug: string;
	titulo: string;
	/** Cor oficial da marca — para pintar algo ao lado do logo, se precisar. */
	hex: string;
}

export const MARCAS = marcasGeradas as Marca[];

/** O arquivo do logo. Estático em `static/marcas/`, servido e cacheado direto. */
export function urlDoLogo(marca: Marca): string {
	return `/marcas/${marca.slug}.svg`;
}

/**
 * Como as pessoas escrevem, versus o slug do acervo. Sem isto, "Postgres" e
 * "AWS" não seriam reconhecidos — e é assim que se escreve, não "PostgreSQL"
 * nem "Amazon Web Services".
 */
const APELIDOS: Record<string, string[]> = {
	amazonwebservices: ['aws', 'amazon'],
	postgresql: ['postgres', 'pg'],
	nodedotjs: ['node', 'nodejs'],
	nextdotjs: ['next.js', 'nextjs'],
	vuedotjs: ['vue', 'vuejs'],
	rubyonrails: ['rails'],
	googlecloud: ['gcp', 'google cloud'],
	microsoftazure: ['azure'],
	digitalocean: ['digital ocean'],
	mercadopago: ['mercado pago'],
	googleanalytics: ['ga4', 'analytics'],
	googletagmanager: ['gtm'],
	tailwindcss: ['tailwind'],
	dotnet: ['.net'],
	woocommerce: ['woo'],
	nuvemshop: ['nuvem shop', 'tiendanube']
};

/** Sem acento, minúsculo — para "Notion" achar "notion" e "NOTION". */
function normalizar(texto: string): string {
	return texto
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

/**
 * Todos os termos que apontam para uma marca, do mais longo para o mais curto.
 *
 * A ordem importa: "google cloud" tem de ser testado antes de "google", senão
 * um campo escrito "Google Cloud" ganharia o logo errado. Pelo mesmo motivo o
 * casamento exige limite de palavra — "go" não pode casar dentro de "google".
 */
const TERMOS: { termo: string; marca: Marca }[] = MARCAS.flatMap((marca) => [
	{ termo: normalizar(marca.titulo), marca },
	...(APELIDOS[marca.slug] ?? []).map((a) => ({ termo: normalizar(a), marca }))
]).sort((a, b) => b.termo.length - a.termo.length);

/** Escapa o que for regex dentro do termo (".net", "next.js"). */
function escapar(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A marca citada num texto, ou null. Só a primeira que casar — um campo diz
 * onde a coisa está, não faz inventário.
 */
export function marcaDe(texto: string | null | undefined): Marca | null {
	if (!texto) return null;
	const alvo = normalizar(texto);
	for (const { termo, marca } of TERMOS) {
		// \b não funciona com "." e "/" nas bordas ("github.com", ".net"), então o
		// limite é explícito: começo/fim, ou qualquer coisa que não seja letra.
		const re = new RegExp(`(^|[^a-z0-9])${escapar(termo)}([^a-z0-9]|$)`, 'i');
		if (re.test(alvo)) return marca;
	}
	return null;
}
