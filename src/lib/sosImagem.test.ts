import { describe, expect, it } from 'vitest';
import { SOS_MAX_H, SOS_MAX_W, caberNaCaixa, validarEntrada } from './sosImagem';

/** File de mentira: só o que a validação olha (nome, tipo, tamanho). */
function arquivo(nome: string, tipo: string, bytes = 1000): File {
	return { name: nome, type: tipo, size: bytes } as File;
}

const cabe = ({ w, h }: { w: number; h: number }) => w <= SOS_MAX_W && h <= SOS_MAX_H;
/**
 * Proporção preservada dentro do que o arredondamento permite.
 *
 * A folga não pode ser um percentual fixo: pixel é inteiro, então o erro máximo
 * é meio pixel no menor lado — o que é 0,08% numa imagem 800x600 e 5% numa
 * 10x600, sem nenhuma das duas estar errada. A tolerância acompanha isso.
 */
const mesmaProporcao = (o: { w: number; h: number }, r: { w: number; h: number }) => {
	const original = o.w / o.h;
	const folga = 0.5 / Math.min(r.w, r.h);
	return Math.abs(original - r.w / r.h) / original <= folga;
};

describe('caberNaCaixa', () => {
	it('reduz a foto grande até caber, mantendo a proporção', () => {
		const original = { w: 4032, h: 3024 }; // foto de celular, 4:3
		const r = caberNaCaixa(original.w, original.h);
		// 4:3 é a proporção da própria caixa, então preenche os dois lados.
		expect(r).toEqual({ w: 800, h: 600 });
		expect(cabe(r)).toBe(true);
		expect(mesmaProporcao(original, r)).toBe(true);
	});

	it('imagem larga encosta na largura; alta encosta na altura', () => {
		const larga = caberNaCaixa(1920, 1080); // 16:9
		expect(larga.w).toBe(800);
		expect(larga.h).toBe(450);
		expect(cabe(larga)).toBe(true);

		const alta = caberNaCaixa(1080, 1920); // print de celular em pé
		expect(alta.h).toBe(600);
		expect(alta.w).toBe(338);
		expect(cabe(alta)).toBe(true);
	});

	it('não amplia imagem pequena — esticar só borraria o texto do print', () => {
		expect(caberNaCaixa(300, 200)).toEqual({ w: 300, h: 200 });
		// Exatamente do tamanho da caixa: fica como está.
		expect(caberNaCaixa(SOS_MAX_W, SOS_MAX_H)).toEqual({ w: SOS_MAX_W, h: SOS_MAX_H });
		// O tamanho antigo (640x480) agora é menor que a caixa e não é ampliado.
		expect(caberNaCaixa(640, 480)).toEqual({ w: 640, h: 480 });
	});

	it('qualquer proporção cabe na caixa e continua proporcional', () => {
		const casos = [
			{ w: 5000, h: 100 },
			{ w: 100, h: 5000 },
			{ w: 1366, h: 768 },
			{ w: 2560, h: 1600 },
			{ w: 800, h: 800 }
		];
		for (const o of casos) {
			const r = caberNaCaixa(o.w, o.h);
			expect(cabe(r), `${o.w}x${o.h} → ${r.w}x${r.h}`).toBe(true);
			expect(mesmaProporcao(o, r), `${o.w}x${o.h} → ${r.w}x${r.h}`).toBe(true);
		}
	});

	it('nunca devolve lado zero: arredondar para baixo geraria canvas inválido', () => {
		const r = caberNaCaixa(5000, 3);
		expect(r.h).toBeGreaterThanOrEqual(1);
		expect(r.w).toBeGreaterThanOrEqual(1);
	});

	it('dimensão inválida não quebra', () => {
		expect(caberNaCaixa(0, 0)).toEqual({ w: 0, h: 0 });
	});
});

describe('validarEntrada', () => {
	it('aceita JPG, PNG e WEBP', () => {
		expect(validarEntrada(arquivo('tela.jpg', 'image/jpeg'))).toBeNull();
		expect(validarEntrada(arquivo('tela.png', 'image/png'))).toBeNull();
		expect(validarEntrada(arquivo('tela.webp', 'image/webp'))).toBeNull();
	});

	it('aceita pelo nome quando o sistema não informa o tipo', () => {
		expect(validarEntrada(arquivo('Captura.PNG', ''))).toBeNull();
		expect(validarEntrada(arquivo('foto.jpeg', ''))).toBeNull();
	});

	it('recusa o que não é imagem', () => {
		expect(validarEntrada(arquivo('erro.pdf', 'application/pdf'))).toMatch(/JPG, PNG ou WEBP/);
		expect(validarEntrada(arquivo('video.mp4', 'video/mp4'))).toMatch(/JPG, PNG ou WEBP/);
	});

	it('recusa arquivo absurdo antes de tentar decodificar', () => {
		expect(validarEntrada(arquivo('enorme.png', 'image/png', 30 * 1024 * 1024))).toMatch(
			/muito grande/
		);
	});
});
