// Pag's Up — compacta o PDF de uma NF ou recibo antes de subir.
//
// O teto é 50 KB por arquivo (o bucket recusa acima disso, ver a migration
// 0069). Uma NF eletrônica costuma chegar entre 30 e 150 KB; um recibo
// fotografado e salvo em PDF, com 1 a 5 MB. A compactação tenta, nesta ordem:
//
// 1. VETOR — o PDF como veio, regravado sem metadados e com os objetos em
//    streams comprimidos. O texto continua texto (dá para copiar a chave de
//    acesso, buscar o CNPJ). Se couber, fica este.
// 2. DIGITALIZADO — cada página vira uma imagem em preto e branco puro (1 bit
//    por pixel, como um fax ou um scanner de documento), começando em 200 DPI
//    e baixando até caber. Em preto e branco uma página de texto ocupa uma
//    fração do que ocuparia em tons de cinza, e continua legível — é o que
//    deixa um recibo fotografado caber em 50 KB.
//
// Se nem a 85 DPI couber (PDF com muitas páginas), o envio é recusado com a
// explicação: abaixo disso o texto miúdo de uma NF deixa de ser legível.
//
// A decisão do preto e branco (binarizar) e a montagem do PDF são funções puras,
// testadas em compactarPdf.test.ts. A leitura e a renderização das páginas usam
// o pdf.js e um <canvas>, então só rodam no navegador.

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { formatarBytes } from './documentos';

export { formatarBytes };

/** Tamanho máximo de um PDF de NF/recibo, em bytes. Igual ao do bucket. */
export const LIMITE_DOC = 50 * 1024;

/** Resoluções tentadas na versão digitalizada, da melhor para a menor legível. */
export const DPIS = [200, 150, 120, 100, 85] as const;

/**
 * Teto de pixels por página. Uma página A4 a 200 DPI tem ~3,9 milhões; o teto
 * só pega PDFs com páginas gigantes (uma foto colada no tamanho original), que
 * de outro modo pediriam centenas de MB de memória para renderizar.
 */
const MAX_PIXELS = 8_000_000;

/** Acima disto nem tenta: não há resolução legível que caiba em 50 KB. */
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
	/** vetor = texto preservado; digitalizado = páginas em preto e branco. */
	modo: 'vetor' | 'digitalizado';
	/** Resolução usada, quando digitalizado. */
	dpi?: number;
};

/** O arquivo começa como PDF? (A extensão e o tipo do navegador mentem.) */
export function ehPdf(bytes: Uint8Array): boolean {
	// A especificação aceita lixo antes do cabeçalho; os leitores procuram nos
	// primeiros 1024 bytes, então aqui também.
	const ini = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
	return ini.includes('%PDF-');
}

// ---- Preto e branco ------------------------------------------------------

/** Abaixo disto é preto sempre — logotipo, tarja, carimbo cheio. */
const PRETO_ABSOLUTO = 80;
/** Quanto mais escuro que a vizinhança um pixel precisa ser para virar tinta. */
const SENSIBILIDADE = 0.15;

/**
 * Converte uma imagem RGBA em 1 bit por pixel, no formato que o PDF lê direto
 * (DeviceGray, 1 bit: 0 = preto, 1 = branco; cada linha completa um byte).
 *
 * O limiar é LOCAL (Bradley–Roth): o pixel vira preto quando é mais escuro que
 * a média da vizinhança. Um limiar único para a página toda falha justamente
 * no recibo fotografado — a sombra da mão ou o canto mal iluminado viram uma
 * mancha preta, e o papel claro engole a caneta fraca. Comparando com a
 * vizinhança, a tinta se destaca em qualquer iluminação.
 *
 * O limiar local sozinho esvaziaria áreas escuras grandes (no meio de um
 * retângulo preto, o pixel é igual à média → branco), por isso o PRETO_ABSOLUTO.
 */
export function binarizar(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Uint8Array {
	const n = w * h;
	const lum = new Uint8Array(n);
	for (let i = 0, j = 0; i < n; i++, j += 4) {
		// Transparente conta como papel: o canvas é pintado de branco antes, mas
		// uma imagem com alfa no PDF não pode virar um borrão preto.
		const a = rgba[j + 3];
		const y = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
		lum[i] = a === 255 ? y : 255 - (((255 - y) * a) >> 8);
	}

	// Imagem integral: soma de qualquer retângulo em 4 leituras. Uint32 basta
	// porque MAX_PIXELS × 255 fica abaixo de 2³².
	const W = w + 1;
	const integral = new Uint32Array(W * (h + 1));
	for (let y = 0; y < h; y++) {
		let linha = 0;
		for (let x = 0; x < w; x++) {
			linha += lum[y * w + x];
			integral[(y + 1) * W + x + 1] = integral[y * W + x + 1] + linha;
		}
	}

	// Janela de ~1/16 do lado maior: grande o bastante para conter letra e
	// papel, pequena o bastante para acompanhar a variação de luz.
	const r = Math.max(4, Math.round(Math.max(w, h) / 32));
	const bytesPorLinha = Math.ceil(w / 8);
	const out = new Uint8Array(bytesPorLinha * h).fill(0xff);

	for (let y = 0; y < h; y++) {
		const y0 = Math.max(0, y - r);
		const y1 = Math.min(h, y + r + 1);
		for (let x = 0; x < w; x++) {
			const v = lum[y * w + x];
			let preto = v < PRETO_ABSOLUTO;
			if (!preto) {
				const x0 = Math.max(0, x - r);
				const x1 = Math.min(w, x + r + 1);
				const soma =
					integral[y1 * W + x1] - integral[y0 * W + x1] - integral[y1 * W + x0] + integral[y0 * W + x0];
				const qtd = (x1 - x0) * (y1 - y0);
				preto = v * qtd < soma * (1 - SENSIBILIDADE);
			}
			if (preto) out[y * bytesPorLinha + (x >> 3)] &= ~(0x80 >> (x & 7));
		}
	}
	return out;
}

// ---- Montagem do PDF -----------------------------------------------------

export type PaginaBinaria = {
	/** Tamanho da página em pontos (1/72"), o mesmo do PDF original. */
	larguraPt: number;
	alturaPt: number;
	/** Tamanho da imagem em pixels. */
	w: number;
	h: number;
	/** Saída de binarizar(). */
	bits: Uint8Array;
};

/** Monta um PDF com uma imagem 1-bit por página, cobrindo a página inteira. */
export async function montarPdfDeImagens(paginas: PaginaBinaria[]): Promise<Uint8Array> {
	const [{ PDFDocument, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject }, { zlibSync }] =
		await Promise.all([import('pdf-lib'), import('fflate')]);

	const doc = await PDFDocument.create({ updateMetadata: false });
	for (const p of paginas) {
		// Comprime aqui, no nível máximo, em vez de deixar para o pdf-lib (que
		// usa o nível padrão): em preto e branco a diferença passa de 10%.
		const stream = doc.context.stream(zlibSync(p.bits, { level: 9 }), {
			Type: 'XObject',
			Subtype: 'Image',
			Width: p.w,
			Height: p.h,
			ColorSpace: 'DeviceGray',
			BitsPerComponent: 1,
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

async function digitalizar(
	pdf: PDFDocumentProxy,
	dpi: number,
	criarCanvas: CriarCanvas
): Promise<Uint8Array> {
	const paginas: PaginaBinaria[] = [];
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
			paginas.push({ larguraPt: base.width, alturaPt: base.height, w, h, bits: binarizar(data, w, h) });
		} finally {
			liberar?.();
			page.cleanup();
		}
	}
	return montarPdfDeImagens(paginas);
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

	// 2. Digitalizado em preto e branco, da maior resolução que couber.
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
		let menor = Infinity;
		for (const dpi of DPIS) {
			const bytes = await digitalizar(pdf, dpi, opcoes.criarCanvas ?? canvasDoNavegador);
			if (bytes.length <= limite) return { bytes, original, modo: 'digitalizado', dpi };
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
