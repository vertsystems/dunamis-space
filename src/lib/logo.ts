// Foto (logo) do cliente: validação e envio ao Storage.
//
// Regras do cliente: WEBP e no máximo 200x200. A validação daqui é para dar
// mensagem decente ao usuário — quem manda de verdade é o bucket, que só aceita
// image/webp e 256 KB (migration 0044).
import type { SupabaseClient } from '@supabase/supabase-js';

export const LOGO_BUCKET = 'clientes';
export const LOGO_MAX_PX = 200;
/** Igual ao file_size_limit do bucket (0044) — erro claro antes do upload. */
export const LOGO_MAX_BYTES = 262_144;

/** Lado maior da imagem, ou null se o arquivo não for decodificável. */
async function dimensoes(file: File): Promise<{ w: number; h: number } | null> {
	try {
		const bmp = await createImageBitmap(file);
		const dim = { w: bmp.width, h: bmp.height };
		bmp.close();
		return dim;
	} catch {
		return null;
	}
}

/** Mensagem de erro, ou null se o arquivo serve. */
export async function validarLogo(file: File): Promise<string | null> {
	// O type do File vem do SO; a extensão cobre o caso dele vir vazio.
	const ehWebp = file.type === 'image/webp' || /\.webp$/i.test(file.name);
	if (!ehWebp) return 'A foto precisa estar em WEBP. Converta a imagem e tente de novo.';
	if (file.size > LOGO_MAX_BYTES) return 'Arquivo muito grande (máximo 256 KB).';

	const dim = await dimensoes(file);
	if (!dim) return 'Não foi possível ler a imagem. Ela pode estar corrompida.';
	if (dim.w > LOGO_MAX_PX || dim.h > LOGO_MAX_PX) {
		return `A foto pode ter no máximo ${LOGO_MAX_PX}x${LOGO_MAX_PX}px (a sua tem ${dim.w}x${dim.h}).`;
	}
	return null;
}

/**
 * Sobe o arquivo e devolve a URL pública. Cada envio gera um nome novo, então a
 * troca de foto aparece na hora — com nome fixo, o CDN continuaria servindo a
 * imagem antiga por um bom tempo.
 */
export async function enviarLogo(
	supabase: SupabaseClient,
	file: File
): Promise<{ url: string } | { erro: string }> {
	const nome = `${crypto.randomUUID()}.webp`;
	const { error } = await supabase.storage
		.from(LOGO_BUCKET)
		.upload(nome, file, { contentType: 'image/webp', upsert: false });

	if (error) {
		// Sem o bucket, o Storage responde "Bucket not found" — vale dizer o que fazer.
		const msg = /bucket not found/i.test(error.message)
			? 'O armazenamento de fotos ainda não foi criado. Aplique a migration 0044_cliente_logo.sql no Supabase.'
			: error.message;
		return { erro: msg };
	}

	const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(nome);
	return { url: data.publicUrl };
}
