// Pag's Up — compacta o PDF de uma NF ou recibo antes de subir.
//
// O teto é 70 KB por arquivo (o bucket recusa acima disso, ver as migrations
// 0069 e 0071). Uma NF eletrônica costuma chegar entre 30 e 150 KB; um recibo
// fotografado e salvo em PDF, com 1 a 5 MB. A compactação tenta, nesta ordem:
//
// 1. VETOR — o PDF como veio, regravado sem metadados e com os objetos em
//    streams comprimidos. O texto continua texto (dá para copiar a chave de
//    acesso, buscar o CNPJ). Se couber, fica este.
// 2. DIGITALIZADO — cada página vira imagem, com o fundo limpo (o papel fica
//    branco liso, sem sombra nem amarelado) e poucos tons: primeiro quatro tons
//    de cinza a 200 DPI, que deixam a borda das letras lisa; se não couber,
//    menos resolução e, por fim, preto e branco puro (1 bit, como um fax).
//    Com o papel branco liso, uma página de texto em poucos tons cabe em
//    dezenas de KB — é o que deixa um recibo fotografado de 2 MB caber.
//
//    Até 09/10/2026 era só preto e branco a partir de 200 DPI, com teto de
//    50 KB: legível, mas com a letra serrilhada ("corroída").
//
// Se nem a 85 DPI couber (PDF com muitas páginas), o envio é recusado com a
// explicação: abaixo disso o texto miúdo de uma NF deixa de ser legível.
//
// A limpeza do fundo, os tons (quantizar) e a montagem do PDF são funções puras,
// testadas em compactarPdf.test.ts. A leitura e a renderização das páginas usam
// o pdf.js e um <canvas>, então só rodam no navegador.

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { formatarBytes } from './documentos';

export { formatarBytes };

/** Tamanho máximo de um PDF de NF/recibo, em bytes. Igual ao do bucket. */
export const LIMITE_DOC = 70 * 1024;

/**
 * As tentativas da versão digitalizada, da melhor qualidade para a menor que
 * ainda se lê. Primeiro em quatro tons de cinza (borda das letras lisa); se não
 * couber, preto e branco puro, baixando a resolução.
 */
export const ETAPAS: readonly { dpi: number; bpc: Bpc }[] = [
	{ dpi: 200, bpc: 2 },
	{ dpi: 170, bpc: 2 },
	{ dpi: 150, bpc: 2 },
	{ dpi: 200, bpc: 1 },
	{ dpi: 150, bpc: 1 },
	{ dpi: 120, bpc: 1 },
	{ dpi: 100, bpc: 1 },
	{ dpi: 85, bpc: 1 }
];

/**
 * Teto de pixels por página. Uma página A4 a 200 DPI tem ~3,9 milhões; o teto
 * só pega PDFs com páginas gigantes (uma foto colada no tamanho original), que
 * de outro modo pediriam centenas de MB de memória para renderizar.
 */
const MAX_PIXELS = 8_000_000;

/** Acima disto nem tenta: não há resolução legível que caiba no limite. */
const MAX_PAGINAS = 12;

/** Um PDF maior que isto quase certamente não é uma NF (e travaria a aba). */
const MAX_ENTRADA = 25 * 1024 * 1024;

/**
 * Erro com mensagem pronta para mostrar a quem enviou. Reconhecido pelo nome,
 * não por instanceof: este módulo é importado sob demanda, e quem trata o erro
 * não precisa carregá-lo só para comparar a classe.
 */
export class ErroDocumento extends Error {
	constructor(mensagem: string) {
		super(mensagem);
		this.name = 'ErroDocumento';
	}
}

export type ResultadoCompactacao = {
	bytes: Uint8Array;
	/** Tamanho do arquivo como chegou. */
	original: number;
	/** vetor = texto preservado; digitalizado = páginas viraram imagem. */
	modo: 'vetor' | 'digitalizado';
	/** Resolução e tons usados, quando digitalizado. */
	dpi?: number;
	bpc?: Bpc;
};

/** O arquivo começa como PDF? (A extensão e o tipo do navegador mentem.) */
export function ehPdf(bytes: Uint8Array): boolean {
	// A especificação aceita lixo antes do cabeçalho; os leitores procuram nos
	// primeiros 1024 bytes, então aqui também.
	const ini = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
	return ini.includes('%PDF-');
}

// ---- Limpeza e tons ------------------------------------------------------

/** Abaixo disto é tinta sempre — logotipo, tarja, carimbo cheio. */
const PRETO_ABSOLUTO = 80;
/**
 * Brilho em relação ao papel (255 = papel) a partir do qual o pixel é papel, e
 * abaixo do qual é tinta pura. Entre os dois fica a borda da letra, que nos
 * tons de cinza vira cinza (é o que deixa o traço liso em vez de serrilhado).
 */
const PAPEL = 220;
const TINTA = 100;
/** No preto e branco puro, o corte entre tinta e papel. */
const CORTE_1BIT = 200;

/** Luminância de cada pixel (0 = preto, 255 = branco). Transparente conta como papel. */
function luminancia(rgba: Uint8ClampedArray | Uint8Array, n: number): Uint8Array {
	const lum = new Uint8Array(n);
	for (let i = 0, j = 0; i < n; i++, j += 4) {
		const a = rgba[j + 3];
		const y = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
		lum[i] = a === 255 ? y : 255 - (((255 - y) * a) >> 8);
	}
	return lum;
}

/**
 * Tira a iluminação da página: divide cada pixel pelo brilho do PAPEL ao redor,
 * de modo que o papel vira 255 em qualquer canto — na sombra da mão, no
 * amarelado do scanner — e a tinta fica escura na mesma proporção.
 *
 * O brilho do papel é o trecho mais claro de cada bloco (~1/24 do lado maior),
 * espalhado para os blocos vizinhos e interpolado entre eles. "Trecho", e não
 * pixel: mede-se a média de quadradinhos de 4×4, porque numa foto o pixel mais
 * claro é ruído, e um papel medido alto demais faz o papel de verdade parecer
 * sujo (pontinhos que incham o arquivo).
 *
 * Comparar com o papel, e não com a média da vizinhança, é o que não afina o
 * texto onde ele é denso: num parágrafo cheio a média escurece, e a borda das
 * letras sumia.
 */
export function normalizarFundo(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Uint8Array {
	const n = w * h;
	const lum = luminancia(rgba, n);

	const bloco = Math.max(8, Math.round(Math.max(w, h) / 24));
	const bw = Math.ceil(w / bloco);
	const bh = Math.ceil(h / bloco);

	// Média de cada quadradinho de 4×4…
	const Q = 4;
	const qw = Math.ceil(w / Q);
	const qh = Math.ceil(h / Q);
	const somaQ = new Uint32Array(qw * qh);
	const qtdQ = new Uint16Array(qw * qh);
	for (let y = 0; y < h; y++) {
		const qy = ((y / Q) | 0) * qw;
		for (let x = 0; x < w; x++) {
			const k = qy + ((x / Q) | 0);
			somaQ[k] += lum[y * w + x];
			qtdQ[k]++;
		}
	}
	// …e o quadradinho mais claro de cada bloco.
	const maxBloco = new Uint8Array(bw * bh);
	for (let qy = 0; qy < qh; qy++) {
		const by = (((qy * Q) / bloco) | 0) * bw;
		for (let qx = 0; qx < qw; qx++) {
			const k = qy * qw + qx;
			const media = (somaQ[k] / qtdQ[k]) | 0;
			const b = by + (((qx * Q) / bloco) | 0);
			if (media > maxBloco[b]) maxBloco[b] = media;
		}
	}
	// Um bloco todo coberto de tinta (logo, tarja) não tem papel para medir:
	// herda o papel mais claro dos vizinhos.
	const papel = new Float32Array(bw * bh);
	for (let by = 0; by < bh; by++) {
		for (let bx = 0; bx < bw; bx++) {
			let m = 0;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const yy = by + dy, xx = bx + dx;
					if (yy >= 0 && yy < bh && xx >= 0 && xx < bw) m = Math.max(m, maxBloco[yy * bw + xx]);
				}
			}
			// Papel escuro demais é sinal de página toda escura: não "clareia" o nada.
			papel[by * bw + bx] = Math.max(m, 96);
		}
	}

	const out = new Uint8Array(n);
	for (let y = 0; y < h; y++) {
		// Interpolação bilinear entre os centros dos blocos.
		const fy = Math.min(Math.max((y + 0.5) / bloco - 0.5, 0), bh - 1);
		const y0 = fy | 0, y1 = Math.min(y0 + 1, bh - 1), ty = fy - y0;
		for (let x = 0; x < w; x++) {
			const fx = Math.min(Math.max((x + 0.5) / bloco - 0.5, 0), bw - 1);
			const x0 = fx | 0, x1 = Math.min(x0 + 1, bw - 1), tx = fx - x0;
			const p =
				(papel[y0 * bw + x0] * (1 - tx) + papel[y0 * bw + x1] * tx) * (1 - ty) +
				(papel[y1 * bw + x0] * (1 - tx) + papel[y1 * bw + x1] * tx) * ty;
			const v = lum[y * w + x];
			out[y * w + x] = v < PRETO_ABSOLUTO ? 0 : Math.min(255, Math.round((v * 255) / p));
		}
	}
	return out;
}

/** Bits por pixel da imagem no PDF: 1 = preto e branco; 2 = quatro tons de cinza. */
export type Bpc = 1 | 2;

/**
 * Empacota a imagem já normalizada no formato que o PDF lê direto (DeviceGray:
 * 0 = preto, o maior valor = branco; cada linha completa um byte).
 *
 * Com 2 bits são quatro tons — preto, dois cinzas e branco. Os cinzas ficam
 * na borda das letras e é o que tira o aspecto "corroído" do preto e branco
 * puro, por pouco peso: o papel continua branco liso e comprime quase a nada.
 */
export function quantizar(norm: Uint8Array, w: number, h: number, bpc: Bpc): Uint8Array {
	const niveis = (1 << bpc) - 1;
	const porByte = 8 / bpc;
	const bytesPorLinha = Math.ceil(w / porByte);
	// Começa tudo branco (todos os bits 1): o resto da última linha fica papel.
	const out = new Uint8Array(bytesPorLinha * h).fill(0xff);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const v = norm[y * w + x];
			let nivel: number;
			if (bpc === 1) nivel = v < CORTE_1BIT ? 0 : 1;
			else if (v >= PAPEL) nivel = niveis;
			else if (v <= TINTA) nivel = 0;
			else nivel = Math.round(((v - TINTA) / (PAPEL - TINTA)) * niveis);
			if (nivel === niveis) continue;
			const i = y * bytesPorLinha + ((x / porByte) | 0);
			const desloc = 8 - bpc * ((x % porByte) + 1);
			out[i] = (out[i] & ~(niveis << desloc)) | (nivel << desloc);
		}
	}
	return out;
}

/** Preto e branco puro (1 bit), com o fundo já limpo. */
export function binarizar(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Uint8Array {
	return quantizar(normalizarFundo(rgba, w, h), w, h, 1);
}

// ---- Montagem do PDF -----------------------------------------------------

export type PaginaBinaria = {
	/** Tamanho da página em pontos (1/72"), o mesmo do PDF original. */
	larguraPt: number;
	alturaPt: number;
	/** Tamanho da imagem em pixels. */
	w: number;
	h: number;
	/** Saída de quantizar() (ou binarizar(), para 1 bit). */
	bits: Uint8Array;
	/** Bits por pixel de `bits`. Sem valor, 1. */
	bpc?: Bpc;
};

/** Monta um PDF com uma imagem em tons de cinza por página, cobrindo a página inteira. */
export async function montarPdfDeImagens(paginas: PaginaBinaria[]): Promise<Uint8Array> {
	const [{ PDFDocument, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject }, { zlibSync }] =
		await Promise.all([import('pdf-lib'), import('fflate')]);

	const doc = await PDFDocument.create({ updateMetadata: false });
	for (const p of paginas) {
		// Comprime aqui, no nível máximo, em vez de deixar para o pdf-lib (que
		// usa o nível padrão): com poucos tons a diferença passa de 10%.
		const stream = doc.context.stream(zlibSync(p.bits, { level: 9 }), {
			Type: 'XObject',
			Subtype: 'Image',
			Width: p.w,
			Height: p.h,
			ColorSpace: 'DeviceGray',
			BitsPerComponent: p.bpc ?? 1,
			Filter: 'FlateDecode'
		});
		const ref = doc.context.register(stream);
		const page = doc.addPage([p.larguraPt, p.alturaPt]);
		const nome = page.node.newXObject('Im', ref);
		page.pushOperators(
			pushGraphicsState(),
			concatTransformationMatrix(p.larguraPt, 0, 0, p.alturaPt, 0, 0),
			drawObject(nome),
			popGraphicsState()
		);
	}
	return doc.save({ useObjectStreams: true });
}

/**
 * Regrava o PDF sem perder o texto: copia só as páginas para um documento novo
 * (o que deixa para trás metadados, miniaturas, marcadores e objetos órfãos) e
 * salva com os objetos comprimidos. Devolve null se o pdf-lib não conseguir
 * abrir — PDF protegido por senha, por exemplo; aí só resta digitalizar.
 */
export async function otimizarVetor(bytes: Uint8Array): Promise<Uint8Array | null> {
	try {
		const { PDFDocument } = await import('pdf-lib');
		const origem = await PDFDocument.load(bytes, { updateMetadata: false });
		const novo = await PDFDocument.create({ updateMetadata: false });
		const paginas = await novo.copyPages(origem, origem.getPageIndices());
		for (const p of paginas) novo.addPage(p);
		return await novo.save({ useObjectStreams: true, updateFieldAppearances: false });
	} catch {
		return null;
	}
}

// ---- Renderização (navegador) -------------------------------------------

/** Cria a superfície onde o pdf.js desenha a página. */
export type CriarCanvas = (w: number, h: number) => {
	canvas: unknown;
	ctx: CanvasRenderingContext2D;
	liberar?: () => void;
};

const canvasDoNavegador: CriarCanvas = (w, h) => {
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) throw new ErroDocumento('O navegador não deixou desenhar o PDF. Tente em outro navegador.');
	// Zerar o tamanho devolve a memória na hora, sem esperar o coletor.
	return { canvas, ctx, liberar: () => ((canvas.width = 0), (canvas.height = 0)) };
};

async function abrirNoNavegador(bytes: Uint8Array): Promise<PDFDocumentProxy> {
	const [pdfjs, worker] = await Promise.all([
		import('pdfjs-dist'),
		import('pdfjs-dist/build/pdf.worker.min.mjs?url')
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
	// slice(): o pdf.js transfere o buffer para o worker e o deixa inutilizável.
	return pdfjs.getDocument({ data: bytes.slice() }).promise;
}

/** Uma página renderizada e com o fundo limpo, pronta para virar imagem. */
type PaginaLimpa = { larguraPt: number; alturaPt: number; w: number; h: number; norm: Uint8Array };

async function renderizar(
	pdf: PDFDocumentProxy,
	dpi: number,
	criarCanvas: CriarCanvas
): Promise<PaginaLimpa[]> {
	const paginas: PaginaLimpa[] = [];
	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const base = page.getViewport({ scale: 1 }); // já considera a rotação
		const escala = Math.min(dpi / 72, Math.sqrt(MAX_PIXELS / (base.width * base.height)));
		const vp = page.getViewport({ scale: escala });
		const w = Math.max(1, Math.round(vp.width));
		const h = Math.max(1, Math.round(vp.height));

		const { canvas, ctx, liberar } = criarCanvas(w, h);
		try {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, w, h);
			await page.render({ canvas: canvas as HTMLCanvasElement, canvasContext: ctx, viewport: vp }).promise;
			const { data } = ctx.getImageData(0, 0, w, h);
			paginas.push({ larguraPt: base.width, alturaPt: base.height, w, h, norm: normalizarFundo(data, w, h) });
		} finally {
			liberar?.();
			page.cleanup();
		}
	}
	return paginas;
}

export type OpcoesCompactacao = {
	limite?: number;
	/** Para rodar fora do navegador (calibração): outro pdf.js e outro canvas. */
	abrirPdf?: (bytes: Uint8Array) => Promise<PDFDocumentProxy>;
	criarCanvas?: CriarCanvas;
	/** Avisa em que etapa está — a digitalização leva alguns segundos. */
	onEtapa?: (etapa: string) => void;
};

/** Deixa o PDF o menor possível, até caber no limite. Ver o topo do arquivo. */
export async function compactarPdf(
	entrada: Uint8Array,
	opcoes: OpcoesCompactacao = {}
): Promise<ResultadoCompactacao> {
	const limite = opcoes.limite ?? LIMITE_DOC;
	const original = entrada.length;

	if (!ehPdf(entrada)) throw new ErroDocumento('O arquivo não é um PDF. Envie a NF ou o recibo em PDF.');
	if (original > MAX_ENTRADA) {
		throw new ErroDocumento(`PDF de ${formatarBytes(original)} é grande demais para uma NF ou recibo.`);
	}

	// 1. Texto preservado: o menor entre o original e o regravado.
	opcoes.onEtapa?.('Compactando…');
	const vetor = await otimizarVetor(entrada);
	const melhorVetor = vetor && vetor.length < original ? vetor : entrada;
	if (melhorVetor.length <= limite) return { bytes: melhorVetor, original, modo: 'vetor' };

	// 2. Digitalizado, da melhor qualidade que couber (ver ETAPAS).
	opcoes.onEtapa?.('Digitalizando…');
	const pdf = await (opcoes.abrirPdf ?? abrirNoNavegador)(entrada).catch(() => {
		throw new ErroDocumento('Não consegui abrir este PDF. Ele está protegido por senha ou corrompido?');
	});
	try {
		if (pdf.numPages > MAX_PAGINAS) {
			throw new ErroDocumento(
				`O PDF tem ${pdf.numPages} páginas e não cabe em ${formatarBytes(limite)}. Envie só a página da NF ou do recibo.`
			);
		}
		// Cada resolução é renderizada uma vez só, e reaproveitada para os tons.
		const renderizadas = new Map<number, PaginaLimpa[]>();
		let menor = Infinity;
		for (const { dpi, bpc } of ETAPAS) {
			let paginas = renderizadas.get(dpi);
			if (!paginas) {
				paginas = await renderizar(pdf, dpi, opcoes.criarCanvas ?? canvasDoNavegador);
				renderizadas.set(dpi, paginas);
			}
			const bytes = await montarPdfDeImagens(
				paginas.map(({ norm, ...p }) => ({ ...p, bpc, bits: quantizar(norm, p.w, p.h, bpc) }))
			);
			if (bytes.length <= limite) return { bytes, original, modo: 'digitalizado', dpi, bpc };
			menor = Math.min(menor, bytes.length);
		}
		throw new ErroDocumento(
			`Mesmo compactado o PDF ficou com ${formatarBytes(menor)} (o limite é ${formatarBytes(limite)}). ` +
				(pdf.numPages > 1 ? 'Envie só a página da NF ou do recibo.' : 'Tente uma digitalização mais limpa.')
		);
	} finally {
		// No pdf.js 6 quem encerra o worker é a tarefa de carga, não o documento.
		void pdf.loadingTask.destroy();
	}
}
