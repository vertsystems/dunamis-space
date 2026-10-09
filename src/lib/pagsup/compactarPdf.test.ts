import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
	binarizar,
	compactarPdf,
	ehPdf,
	montarPdfDeImagens,
	normalizarFundo,
	otimizarVetor,
	quantizar
} from './compactarPdf';

/** Imagem RGBA cinza-uniforme de w×h. */
function imagem(w: number, h: number, cinza = 255): Uint8ClampedArray {
	const px = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < px.length; i += 4) px.set([cinza, cinza, cinza, 255], i);
	return px;
}
function pintar(px: Uint8ClampedArray, w: number, x0: number, y0: number, x1: number, y1: number, cinza: number) {
	for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.set([cinza, cinza, cinza, 255], (y * w + x) * 4);
}
/** O pixel (x, y) saiu preto? (bit 0 = preto no DeviceGray de 1 bit) */
function preto(bits: Uint8Array, w: number, x: number, y: number) {
	return (bits[y * Math.ceil(w / 8) + (x >> 3)] & (0x80 >> (x & 7))) === 0;
}

async function pdfComTexto(paginas = 1): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	const fonte = await doc.embedFont(StandardFonts.Helvetica);
	for (let i = 0; i < paginas; i++) {
		doc.addPage([595, 842]).drawText(`Recibo ${i + 1} - R$ 300,00`, { x: 50, y: 780, size: 14, font: fonte });
	}
	return doc.save();
}

describe('ehPdf', () => {
	it('reconhece pelo cabeçalho, não pela extensão', () => {
		expect(ehPdf(new TextEncoder().encode('%PDF-1.7\n...'))).toBe(true);
		expect(ehPdf(new TextEncoder().encode('lixo antes %PDF-1.4'))).toBe(true);
		expect(ehPdf(new TextEncoder().encode('\x89PNG...'))).toBe(false);
	});
});

describe('binarizar', () => {
	it('papel branco continua branco (todos os bits 1)', () => {
		const bits = binarizar(imagem(20, 10), 20, 10);
		expect(bits.length).toBe(3 * 10); // 20 px → 3 bytes por linha
		expect([...bits].every((b) => b === 0xff)).toBe(true);
	});

	it('tinta escura vira preto e o papel em volta fica branco', () => {
		const w = 64, h = 64;
		const px = imagem(w, h);
		pintar(px, w, 20, 30, 44, 34, 30); // um traço
		const bits = binarizar(px, w, h);
		expect(preto(bits, w, 30, 31)).toBe(true);
		expect(preto(bits, w, 5, 5)).toBe(false);
		expect(preto(bits, w, 30, 40)).toBe(false);
	});

	it('na sombra, a caneta aparece e o papel escurecido não vira mancha', () => {
		// Metade direita com sombra (papel 110) e caneta fraca (85) dentro dela —
		// acima do PRETO_ABSOLUTO, então só a comparação com o papel ao redor a
		// enxerga. Um limiar fixo em 128 pintaria a metade inteira de preto.
		const w = 640, h = 320;
		const px = imagem(w, h, 235);
		pintar(px, w, 320, 0, 640, 320, 110);
		pintar(px, w, 400, 150, 500, 153, 85);
		const bits = binarizar(px, w, h);
		expect(preto(bits, w, 450, 151)).toBe(true); // caneta na sombra
		expect(preto(bits, w, 600, 50)).toBe(false); // papel na sombra
		expect(preto(bits, w, 100, 50)).toBe(false); // papel claro
	});

	it('área preta grande continua preta (logo, tarja)', () => {
		const w = 100, h = 100;
		const px = imagem(w, h);
		pintar(px, w, 10, 10, 90, 90, 0);
		expect(preto(binarizar(px, w, h), w, 50, 50)).toBe(true);
	});

	it('transparente conta como papel', () => {
		const px = new Uint8ClampedArray(8 * 2 * 4); // tudo 0: preto e transparente
		expect([...binarizar(px, 8, 2)].every((b) => b === 0xff)).toBe(true);
	});
});

describe('normalizarFundo', () => {
	it('o papel vira branco em qualquer iluminação, e a tinta continua escura', () => {
		const w = 640, h = 320;
		const px = imagem(w, h, 235);
		pintar(px, w, 320, 0, 640, 320, 120); // sombra
		pintar(px, w, 100, 150, 200, 154, 40); // tinta no claro
		const norm = normalizarFundo(px, w, h);
		expect(norm[50 * w + 600]).toBe(255); // papel na sombra
		expect(norm[50 * w + 100]).toBe(255); // papel no claro
		expect(norm[152 * w + 150]).toBe(0); // tinta
	});

	it('ruído de foto não vira sujeira: o papel é medido pela média, não pelo pixel mais claro', () => {
		const w = 400, h = 200;
		const px = imagem(w, h, 200);
		let semente = 7;
		const sorteio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647 - 0.5) * 30;
		for (let i = 0; i < px.length; i += 4) {
			const v = 200 + sorteio();
			px.set([v, v, v, 255], i);
		}
		const bits = quantizar(normalizarFundo(px, w, h), w, h, 2);
		expect([...bits].every((b) => b === 0xff)).toBe(true);
	});
});

describe('quantizar', () => {
	it('4 tons: 2 bits por pixel, papel branco, tinta preta e a borda em cinza', () => {
		// 5 pixels: papel, borda clara, borda escura, tinta, papel
		const norm = Uint8Array.from([255, 190, 140, 0, 255]);
		const bits = quantizar(norm, 5, 1, 2);
		expect(bits.length).toBe(2); // 5 px × 2 bits → 2 bytes
		const nivel = (x: number) => (bits[x >> 2] >> (6 - 2 * (x & 3))) & 3;
		expect([0, 1, 2, 3, 4].map(nivel)).toEqual([3, 2, 1, 0, 3]);
		expect(bits[1] & 0x3f).toBe(0x3f); // o resto da linha é papel
	});

	it('1 bit: o mesmo corte que binarizar', () => {
		const norm = Uint8Array.from([255, 210, 190, 0, 255, 255, 255, 255, 0]);
		const bits = quantizar(norm, 9, 1, 1);
		expect(bits[0]).toBe(0b11001111);
		expect(bits[1]).toBe(0b01111111);
	});
});

describe('montarPdfDeImagens', () => {
	it('uma página por imagem, no tamanho original em pontos', async () => {
		const w = 40, h = 20;
		const bits = binarizar(imagem(w, h), w, h);
		const pdf = await montarPdfDeImagens([
			{ larguraPt: 595, alturaPt: 842, w, h, bits },
			{ larguraPt: 842, alturaPt: 595, w, h, bits }
		]);
		const doc = await PDFDocument.load(pdf);
		expect(doc.getPageCount()).toBe(2);
		expect(doc.getPage(1).getSize()).toEqual({ width: 842, height: 595 });
	});

	it('grava os bits por pixel de cada página (4 tons = 2)', async () => {
		const w = 8, h = 4;
		const bits = quantizar(new Uint8Array(w * h).fill(255), w, h, 2);
		const pdf = await montarPdfDeImagens([{ larguraPt: 100, alturaPt: 50, w, h, bits, bpc: 2 }]);
		// O dicionário de uma imagem fica em texto no arquivo (stream não vai
		// para dentro de object stream), então dá para ler direto.
		expect(new TextDecoder('latin1').decode(pdf)).toContain('/BitsPerComponent 2');
	});
});

describe('otimizarVetor', () => {
	it('regrava um PDF válido mantendo as páginas', async () => {
		const out = await otimizarVetor(await pdfComTexto(3));
		expect(out).not.toBeNull();
		expect((await PDFDocument.load(out!)).getPageCount()).toBe(3);
	});
	it('devolve null quando não consegue abrir', async () => {
		expect(await otimizarVetor(new TextEncoder().encode('%PDF-1.4 quebrado'))).toBeNull();
	});
});

describe('compactarPdf', () => {
	it('recusa o que não é PDF, com mensagem para quem enviou', async () => {
		await expect(compactarPdf(new TextEncoder().encode('oi'))).rejects.toMatchObject({
			name: 'ErroDocumento',
			message: expect.stringContaining('PDF')
		});
	});

	it('PDF de texto pequeno fica em vetor — o texto continua texto', async () => {
		const entrada = await pdfComTexto();
		const r = await compactarPdf(entrada);
		expect(r.modo).toBe('vetor');
		expect(r.bytes.length).toBeLessThanOrEqual(70 * 1024);
		expect(r.original).toBe(entrada.length);
	});
});
