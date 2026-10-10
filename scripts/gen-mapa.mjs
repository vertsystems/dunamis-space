// Gera o mapa-múndi do DMetric: src/lib/dmetric/mapa.generated.json
//
// O mapa é desenhado UMA vez aqui e vai pronto para o app — os traços SVG de
// cada país já projetados, sem biblioteca de mapa no navegador. Projetar no
// cliente pediria d3-geo + topojson + o arquivo de fronteiras (~250 KB) a cada
// abertura do painel. (Houve uma versão em pontinhos, em 10/10/2026; o Bruno
// preferiu os países sólidos, mais leves de ver.)
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
import { geoCentroid, geoNaturalEarth1Raw, geoPath, geoProjection } from 'd3-geo';
import paises from 'i18n-iso-countries';

const require = createRequire(import.meta.url);
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = join(raiz, 'src', 'lib', 'dmetric', 'mapa.generated.json');

const LARGURA = 960;
// 486 e não 470: no quadro do painel o mapa ficava achatado, e o Bruno pediu
// ~15 px a mais de altura (10/10/2026). Ver ALONGAMENTO abaixo.
const ALTURA = 486;
/** Folga nas bordas: o mundo inteiro cabe no quadro, nada encosta na borda. */
const MARGEM = 10;
/** Antártida: ocupa um quinto da altura e ninguém visita site de lá. */
const FORA = new Set(['010']);

const ler = (arq) => JSON.parse(readFileSync(require.resolve(`world-atlas/${arq}`), 'utf8'));
const mundo110 = feature(ler('countries-110m.json'), 'countries');
const mundo50 = feature(ler('countries-50m.json'), 'countries');

const sigla = (id) => (id ? paises.numericToAlpha2(id) ?? null : null);

const dentro = { type: 'FeatureCollection', features: mundo110.features.filter((f) => !FORA.has(f.id)) };
const area = [
	[MARGEM, MARGEM],
	[LARGURA - MARGEM, ALTURA - MARGEM]
];
/**
 * Natural Earth, alongada na vertical só o que falta para o mundo encher o
 * quadro. Sem a Antártida o mundo fica bem mais largo que alto, e sem o
 * alongamento sobrariam faixas vazias em cima e embaixo. A Natural Earth já é
 * menos achatada que a Equal Earth da primeira versão, então o alongamento é
 * pequeno e os países não deformam.
 */
function projecaoAlongada(k) {
	const bruta = (lambda, phi) => {
		const [x, y] = geoNaturalEarth1Raw(lambda, phi);
		return [x, y * k];
	};
	bruta.invert = (x, y) => geoNaturalEarth1Raw.invert(x, y / k);
	return geoProjection(bruta).fitExtent(area, dentro);
}
// Quanto alongar: a altura do quadro dividida pela que o mundo ocupa sem alongar.
const caixa1 = geoPath(projecaoAlongada(1)).bounds(dentro);
const ALONGAMENTO = (ALTURA - 2 * MARGEM) / (caixa1[1][1] - caixa1[0][1]);
const projecao = projecaoAlongada(Math.max(1, ALONGAMENTO));
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
	`mapa.generated.json — ${tracos.length} países com traço, ${pontos.length} como ponto, alongamento ${ALONGAMENTO.toFixed(3)}, ${Math.round(json.length / 1024)} KB`
);
