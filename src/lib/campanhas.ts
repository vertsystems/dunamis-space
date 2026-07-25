import { str } from '$lib/form';
export function campanhaFromForm(fd: FormData) {
	return {
		cliente_id: str(fd, 'cliente_id'),
		nome: str(fd, 'nome') ?? '',
		descricao: str(fd, 'descricao'),
		data_inicio: str(fd, 'data_inicio'),
		data_fim: str(fd, 'data_fim')
	};
}
