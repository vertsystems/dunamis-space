// Tema por usuário — a cor primária do sistema (--color-brand / --ds-primary)
// pode ser sobrescrita por login. Aqui ficam a paleta e os utilitários de cor.

export const COR_PADRAO = '#3b6ef6';

// Paleta de presets exibida na tela de perfil (Personalização).
export const CORES_TEMA = [
	{ hex: '#3b6ef6', nome: 'Azul' },
	{ hex: '#6d28d9', nome: 'Roxo' },
	{ hex: '#17b26a', nome: 'Verde' },
	{ hex: '#dc2626', nome: 'Vermelho' },
	{ hex: '#db2777', nome: 'Rosa' },
	{ hex: '#0ea5e9', nome: 'Ciano' },
	{ hex: '#f59e0b', nome: 'Âmbar' },
	{ hex: '#1f2937', nome: 'Grafite' },
	{ hex: '#ea580c', nome: 'Laranja' },
	{ hex: '#4f46e5', nome: 'Índigo' },
	{ hex: '#0d9488', nome: 'Teal' },
	{ hex: '#15803d', nome: 'Verde escuro' }
] as const;

/** Valida/normaliza um hex "#rrggbb"; retorna null se inválido. */
export function normalizaHex(v: string | null | undefined): string | null {
	if (!v) return null;
	const s = v.trim().toLowerCase();
	return /^#[0-9a-f]{6}$/.test(s) ? s : null;
}

/** Escurece um hex por um fator (0–1) — usado para o estado :hover/600 da primária. */
export function escurece(hex: string, amt = 0.12): string {
	const n = hex.replace('#', '');
	const canal = (i: number) => Math.max(0, Math.round(parseInt(n.slice(i, i + 2), 16) * (1 - amt)));
	return '#' + [canal(0), canal(2), canal(4)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Bloco CSS que sobrescreve a primária do sistema para a cor dada (ou '' se inválida). */
export function temaCss(hex: string | null | undefined): string {
	const cor = normalizaHex(hex);
	if (!cor) return '';
	return `:root{--color-brand:${cor};--ds-primary:${cor};--ds-primary-600:${escurece(cor)};}`;
}
