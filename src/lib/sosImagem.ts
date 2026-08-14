// Print do chamado SOS: converte para WEBP e encolhe antes de subir.
//
// A conversão acontece no navegador, não no servidor. Motivo: assim o que
// trafega é o arquivo já reduzido (uma foto de celular de 4 MB vira ~60 KB), e
// não existe rota de upload para proteger — o envio vai direto ao Storage, como
// já acontece com a foto do cliente ($lib/logo.ts).
import type { SupabaseClient } from '@supabase/supabase-js';

export const SOS_BUCKET = 'sos';

/** Caixa em que o print tem de caber. Mantém a proporção: é limite, não recorte. */
export const SOS_MAX_W = 640;
export const SOS_MAX_H = 480;

/** Igual ao file_size_limit do bucket (0058). */
export const SOS_MAX_BYTES = 524_288;

/** O que o usuário pode escolher no seletor de arquivo. */
export const SOS_ACEITA = 'image/jpeg,image/png,image/webp';

const TIPOS_ACEITOS = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

/**
 * Tamanho final respeitando a proporção do original.
 *
 * Imagem menor que a caixa não é ampliada — esticar um print de 300px só
 * borraria o texto, que é justamente o que se quer ler no chamado.
 */
export function caberNaCaixa(
	w: number,
	h: number,
	maxW = SOS_MAX_W,
	maxH = SOS_MAX_H
): { w: number; h: number } {
	if (w <= 0 || h <= 0) return { w: 0, h: 0 };
	const escala = Math.min(maxW / w, maxH / h, 1);
	return { w: Math.max(1, Math.round(w * escala)), h: Math.max(1, Math.round(h * escala)) };
}

/** Mensagem de erro, ou null se o arquivo serve como entrada. */
export function validarEntrada(file: File): string | null {
	const tipoOk = TIPOS_ACEITOS.has(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
	if (!tipoOk) return 'Envie uma imagem JPG, PNG ou WEBP.';
	// Teto só para não travar o navegador ao decodificar um arquivo absurdo; o
	// tamanho que importa é o de DEPOIS da conversão.
	if (file.size > 25 * 1024 * 1024) return 'Imagem muito grande (máximo 25 MB).';
	return null;
}

/**
 * Converte para WEBP dentro de 640x480. Devolve o arquivo pronto para subir.
 *
 * A qualidade 0.82 é o ponto em que print de tela ainda fica legível sem pesar;
 * abaixo disso o texto pequeno começa a esfarelar.
 */
export async function paraWebp(file: File, qualidade = 0.82): Promise<File> {
	const bmp = await createImageBitmap(file);
	try {
		const { w, h } = caberNaCaixa(bmp.width, bmp.height);
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Não foi possível preparar a imagem.');
		// Reduzir sem suavização deixa o texto do print serrilhado.
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(bmp, 0, 0, w, h);

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/webp', qualidade)
		);
		if (!blob) throw new Error('Não foi possível converter a imagem.');
		return new File([blob], 'sos.webp', { type: 'image/webp' });
	} finally {
		bmp.close();
	}
}

/**
 * Prepara e sobe o print, devolvendo a URL pública.
 *
 * Nome novo a cada envio: chamados diferentes não podem se sobrescrever, e o
 * CDN não tem como servir a imagem errada.
 */
export async function enviarImagemSos(
	supabase: SupabaseClient,
	file: File
): Promise<{ url: string } | { erro: string }> {
	const problema = validarEntrada(file);
	if (problema) return { erro: problema };

	let webp: File;
	try {
		webp = await paraWebp(file);
	} catch {
		return { erro: 'Não foi possível ler a imagem. Ela pode estar corrompida.' };
	}
	if (webp.size > SOS_MAX_BYTES) {
		return { erro: 'A imagem ficou grande demais mesmo depois de reduzida. Tente outro print.' };
	}

	const nome = `${crypto.randomUUID()}.webp`;
	const { error } = await supabase.storage.from(SOS_BUCKET).upload(nome, webp, {
		contentType: 'image/webp',
		upsert: false
	});
	if (error) {
		const msg = /bucket not found/i.test(error.message)
			? 'O armazenamento de imagens do SOS ainda não foi criado. Aplique a migration 0058_sos_imagem.sql.'
			: 'Não foi possível enviar a imagem. Tente novamente.';
		return { erro: msg };
	}

	const { data } = supabase.storage.from(SOS_BUCKET).getPublicUrl(nome);
	return { url: data.publicUrl };
}
