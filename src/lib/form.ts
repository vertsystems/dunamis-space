// Leitura de campos de FormData nas actions.
//
// Por que existe: `str()` estava copiado literalmente em 14 arquivos (11 módulos
// de $lib + 3 rotas) e `num()` em 4. São 4 linhas cada, mas qualquer mudança de
// regra (normalizar espaço duplo, aceitar vírgula decimal, tratar 'null' vindo
// de um <select>) exigia caçar todas as cópias.

/** String limpa; vazio vira null (para a coluna aceitar NULL em vez de ''). */
export function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

/** String obrigatória; devolve '' quando ausente (para validar com `if (!x)`). */
export function txt(fd: FormData, k: string): string {
	return str(fd, k) ?? '';
}

/** Número decimal; aceita vírgula como separador. Inválido/vazio vira null. */
export function num(fd: FormData, k: string): number | null {
	const s = str(fd, k);
	if (s === null) return null;
	const n = Number(s.replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

/**
 * Número digitado à brasileira, com separador de milhar: "1.234,56" → 1234.56.
 * Só use onde o campo é texto livre; `<input type="number">` já manda canônico
 * e passar por aqui estragaria valores em notação científica.
 */
export function numBR(fd: FormData, k: string): number | null {
	const s = str(fd, k);
	if (s === null) return null;
	const n = Number(s.replace(/\./g, '').replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

/** Inteiro; inválido/vazio vira null. */
export function int(fd: FormData, k: string): number | null {
	const n = num(fd, k);
	return n === null ? null : Math.trunc(n);
}

/**
 * Checkbox. Um checkbox desmarcado simplesmente NÃO é enviado, então a ausência
 * do campo significa false — nunca "não informado".
 */
export function bool(fd: FormData, k: string): boolean {
	const v = fd.get(k);
	return v === 'on' || v === 'true' || v === '1';
}

/** Lista separada por vírgula/ponto-e-vírgula: "a, b ; c" -> ['a','b','c']. */
export function lista(fd: FormData, k: string): string[] {
	const s = str(fd, k);
	if (!s) return [];
	return s
		.split(/[,;]/)
		.map((x) => x.trim())
		.filter(Boolean);
}
