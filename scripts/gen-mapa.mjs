// Gera o mapa-múndi do DMetric: src/lib/dmetric/mapa.generated.json
//
// O mapa é desenhado UMA vez aqui e vai pronto para o app — os traços SVG de
// cada país já projetados, sem biblioteca de mapa no navegador. Projetar no
// cliente pediria d3-geo + topojson + o arquivo de fronteiras (~250 KB) a cada
// abertura do painel; o resultado projetado e arredondado fica com ~100 KB, e
// só desce na tela do DMetric.
//
// Fontes (devDependencies, nunca vão para o bundle):
//   world-atlas          fronteiras do Natural Earth (110m e, para os pontos, 50m)
//   i18n-iso-countries   código numérico (ISO 3166) → sigla de 2 letras
//
// Os países pequenos demais para a escala 110m (Singapura, Hong Kong, Malta…)
// não têm traço; entram como PONTOS, no centro do desenho deles na 50m, para
// uma visita de lá não sumir do mapa.
//
//   npm run mapa
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { geoEqualEarth, geoPath, geoCentroid } from 'd3-geo';
import paises from 'i18n-iso-countries';

const require = createRequire(import.meta.url);
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = join(raiz, 'src', 'lib', 'dmetric', 'mapa.generated.json');

const LARGURA = 960;
const ALTURA = 470;
/** Antártida: ocupa um quinto da altura e ninguém visita site de lá. */
const FORA = new Set(['010']);

const ler = (arq) => JSON.parse(readFileSync(require.resolve(`world-atlas/${arq}`), 'utf8'));
const mundo110 = feature(ler('countries-110m.json'), 'countries');
const mundo50 = feature(ler('countries-50m.json'), 'countries');

const sigla = (id) => (id ? paises.numericToAlpha2(id) ?? null : null);

const dentro = { type: 'FeatureCollection', features: mundo110.features.filter((f) => !FORA.has(f.id)) };
const projecao = geoEqualEarth().fitSize([LARGURA, ALTURA], dentro);
// digits(1): décimo de pixel num mapa de 960 px é invisível e corta o arquivo
// pela metade em relação à precisão padrão.
const caminho = geoPath(projecao).digits(1);

const tracos = [];
const comTraco = new Set();
for (const f of dentro.features) {
	const d = caminho(f);
	if (!d) continue;
	const iso = sigla(f.id);
	if (iso) comTraco.add(iso);
	// Sem sigla (Kosovo, Chipre do Norte, Somalilândia): desenha, mas o painel
	// não tem como somar visita para ele — a geolocalização devolve a sigla.
	tracos.push({ iso, d });
}

const pontos = [];
for (const f of mundo50.features) {
	const iso = sigla(f.id);
	if (!iso || comTraco.has(iso) || FORA.has(f.id)) continue;
	const xy = projecao(geoCentroid(f));
	if (!xy || !Number.isFinite(xy[0])) continue;
	pontos.push({ iso, x: Math.round(xy[0] * 10) / 10, y: Math.round(xy[1] * 10) / 10 });
}

tracos.sort((a, b) => (a.iso ?? '').localeCompare(b.iso ?? ''));
pontos.sort((a, b) => a.iso.localeCompare(b.iso));

mkdirSync(dirname(saida), { recursive: true });
const json = JSON.stringify({ largura: LARGURA, altura: ALTURA, paises: tracos, pontos });
writeFileSync(saida, json + '\n');
console.log(
	`mapa.generated.json — ${tracos.length} países com traço, ${pontos.length} como ponto, ${Math.round(json.length / 1024)} KB`
);
