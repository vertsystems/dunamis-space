function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

export function tagsToText(tags: string[] | null | undefined): string {
	return (tags ?? []).join(', ');
}

export function kbFromForm(fd: FormData) {
	const tagsRaw = str(fd, 'tags');
	const tags = tagsRaw
		? tagsRaw
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
		: [];
	return {
		titulo: str(fd, 'titulo') ?? '',
		categoria: str(fd, 'categoria'),
		conteudo: str(fd, 'conteudo'),
		tags,
		cliente_id: str(fd, 'cliente_id')
	};
}
