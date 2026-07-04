function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

export function campanhaFromForm(fd: FormData) {
	return {
		cliente_id: str(fd, 'cliente_id'),
		nome: str(fd, 'nome') ?? '',
		descricao: str(fd, 'descricao'),
		data_inicio: str(fd, 'data_inicio'),
		data_fim: str(fd, 'data_fim')
	};
}
