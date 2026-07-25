// Recomprime os WebP de static/ que estavam salvos quase sem perda.
//
// Diagnóstico que motivou o script: os avatares eram 250x250 px pesando ~64 KB
// em média (≈1 byte por pixel — praticamente lossless), somando 1,7 MB numa
// única tela (/perfil, que renderiza a galeria inteira). As fotos de login eram
// 460x580 px a ~359 KB cada. Em q78 o mesmo material cai ~85%.
//
// Roda sob demanda (`npm run imagens`), não no build: é uma operação destrutiva
// sobre os arquivos versionados e não deve acontecer sem alguém pedir.
//
// Uso:
//   node scripts/otimiza-imagens.mjs           # simula, não escreve nada
//   node scripts/otimiza-imagens.mjs --aplicar # regrava os arquivos

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const aplicar = process.argv.includes('--aplicar');

/** Pastas a otimizar e a largura máxima de cada uma. */
const ALVOS = [
	{ pasta: 'static/avatares', larguraMax: 256, qualidade: 78 },
	{ pasta: 'static/login-fotos', larguraMax: 920, qualidade: 78 }
];

const kb = (n) => (n / 1024).toFixed(1).padStart(7);

let totalAntes = 0;
let totalDepois = 0;

for (const { pasta, larguraMax, qualidade } of ALVOS) {
	const dir = join(raiz, pasta);
	let arquivos;
	try {
		arquivos = readdirSync(dir).filter((f) => /\.webp$/i.test(f));
	} catch {
		console.log(`(pulando ${pasta}: pasta não encontrada)`);
		continue;
	}

	console.log(`\n=== ${pasta} — ${arquivos.length} arquivo(s), q${qualidade}, máx ${larguraMax}px ===`);

	for (const nome of arquivos.sort()) {
		const caminho = join(dir, nome);
		const antes = statSync(caminho).size;

		const img = sharp(caminho);
		const meta = await img.metadata();
		const precisaRedimensionar = (meta.width ?? 0) > larguraMax;

		const buf = await sharp(caminho)
			.resize(precisaRedimensionar ? { width: larguraMax, withoutEnlargement: true } : undefined)
			.webp({ quality: qualidade, effort: 6 })
			.toBuffer();

		// Só regrava se de fato ficou menor — nunca piorar um arquivo.
		const ganhou = buf.length < antes;
		const depois = ganhou ? buf.length : antes;
		totalAntes += antes;
		totalDepois += depois;

		const pct = ((1 - depois / antes) * 100).toFixed(0).padStart(3);
		const marca = ganhou ? '' : '  (mantido: recomprimir não ajudou)';
		console.log(`${kb(antes)} KB → ${kb(depois)} KB  ${pct}%  ${nome}${marca}`);

		if (aplicar && ganhou) writeFileSync(caminho, buf);
	}
}

const pctTotal = totalAntes ? ((1 - totalDepois / totalAntes) * 100).toFixed(1) : '0';
console.log(
	`\nTOTAL: ${kb(totalAntes)} KB → ${kb(totalDepois)} KB  (−${pctTotal}%)` +
		(aplicar ? '  [ARQUIVOS REGRAVADOS]' : '  [simulação — use --aplicar para gravar]')
);
