// Gera o mapa-múndi do DMetric: src/lib/dmetric/mapa.generated.json
//
// O mapa é desenhado UMA vez aqui e vai pronto para o app, sem biblioteca de
// mapa no navegador. Projetar no cliente pediria d3-geo + topojson + o arquivo
// de fronteiras (~250 KB) a cada abertura do painel.
//
// O desenho é de PONTINHOS: uma grade regular sobre a projeção, e cada ponto
// que cai em terra fica com o país dele (`grade`). O painel pinta os pontos de
// cada país pela quantidade de visitas. Os traços dos países (`paises`) não
// aparecem — servem de área invisível para o mouse achar o país entre os
// pontos. `centros` é onde vai o marcador de cada país: o meio do maior pedaço
// dele (o meio do país inteiro da França cairia no Atlântico, por causa da
// Guiana).
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
import { geoArea, geoBounds, geoCentroid, geoContains, geoEqualEarth, geoPath } from 'd3-geo';
import paises from 'i18n-iso-countries';

const require = createRequire(import.meta.url);
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = join(raiz, 'src', 'lib', 'dmetric', 'mapa.generated.json');

const LARGURA = 960;
const ALTURA = 470;
/** Folga nas bordas: o mundo inteiro cabe no quadro, nada encosta na borda. */
const MARGEM = 10;
/** Distância entre os pontinhos, em px do mapa. */
const PASSO = 4.5;
/** Antártida: ocupa um quinto da altura e ninguém visita site de lá. */
const FORA = new Set(['010']);

const ler = (arq) => JSON.parse(readFileSync(require.resolve(`world-atlas/${arq}`), 'utf8'));
const mundo110 = feature(ler('countries-110m.json'), 'countries');
const mundo50 = feature(ler('countries-50m.json'), 'countries');

const sigla = (id) => (id ? paises.numericToAlpha2(id) ?? null : null);

const dentro = { type: 'FeatureCollection', features: mundo110.features.filter((f) => !FORA.has(f.id)) };
const projecao = geoEqualEarth().fitExtent(
	[
		[MARGEM, MARGEM],
		[LARGURA - MARGEM, ALTURA - MARGEM]
	],
	dentro
);
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

// ---- Grade de pontinhos ----
// Cada célula da grade cujo centro cai num país vira um ponto desse país.
// Caixa de cada país primeiro: testar o polígono só de quem pode conter o ponto.
const candidatos = dentro.features.map((f) => ({ f, iso: sigla(f.id) ?? '_', caixa: geoBounds(f) }));
const colunas = Math.floor(LARGURA / PASSO);
const linhas = Math.floor(ALTURA / PASSO);
const celulas = {};
for (let j = 0; j < linhas; j++) {
	for (let i = 0; i < colunas; i++) {
		const lonlat = projecao.invert([i * PASSO + PASSO / 2, j * PASSO + PASSO / 2]);
		if (!lonlat || !Number.isFinite(lonlat[0])) continue;
		const [lon, lat] = lonlat;
		const achou = candidatos.find(({ f, caixa: [[x0, y0], [x1, y1]] }) => {
			const dentroLat = lat >= y0 && lat <= y1;
			// Caixa que atravessa a linha de data (x0 > x1): Rússia, Fiji…
			const dentroLon = x0 <= x1 ? lon >= x0 && lon <= x1 : lon >= x0 || lon <= x1;
			return dentroLat && dentroLon && geoContains(f, lonlat);
		});
		if (achou) (celulas[achou.iso] ??= []).push(j * colunas + i);
	}
}
// Índices em ordem, guardados como diferenças em base 36: "0,1,1,1,a…" ocupa
// uma fração dos números inteiros.
const grade = {};
let totalPontos = 0;
for (const [iso, idx] of Object.entries(celulas)) {
	idx.sort((a, b) => a - b);
	totalPontos += idx.length;
	grade[iso] = idx.map((v, k) => (k ? v - idx[k - 1] : v).toString(36)).join(',');
}

// ---- Onde vai o marcador de cada país ----
const centros = {};
for (const f of dentro.features) {
	const iso = sigla(f.id);
	if (!iso) continue;
	const partes =
		f.geometry.type === 'MultiPolygon'
			? f.geometry.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }))
			: [f.geometry];
	const maior = partes.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
	const xy = projecao(geoCentroid(maior));
	if (xy && Number.isFinite(xy[0])) centros[iso] = [Math.round(xy[0] * 10) / 10, Math.round(xy[1] * 10) / 10];
}

tracos.sort((a, b) => (a.iso ?? '').localeCompare(b.iso ?? ''));
pontos.sort((a, b) => a.iso.localeCompare(b.iso));

mkdirSync(dirname(saida), { recursive: true });
const json = JSON.stringify({
	largura: LARGURA,
	altura: ALTURA,
	passo: PASSO,
	colunas,
	paises: tracos,
	pontos,
	grade,
	centros
});
writeFileSync(saida, json + '\n');
console.log(
	`mapa.generated.json — ${tracos.length} países com traço, ${pontos.length} como ponto, ${totalPontos} pontinhos, ${Math.round(json.length / 1024)} KB`
);
