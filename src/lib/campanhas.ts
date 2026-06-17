export { formatBRL } from './clientes';

export const MATERIAL_TIPO = [
	{ value: 'feed', label: 'Feed' },
	{ value: 'story', label: 'Story' },
	{ value: 'faixa', label: 'Faixa' },
	{ value: 'jornal', label: 'Jornal' }
] as const;

export function materialTipoLabel(tipo: string): string {
	return MATERIAL_TIPO.find((t) => t.value === tipo)?.label ?? tipo;
}

function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

function num(fd: FormData, k: string): number | null {
	const s = str(fd, k);
	return s === null ? null : Number(s.replace(/\./g, '').replace(',', '.'));
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

export function produtoFromForm(fd: FormData) {
	return {
		ref: str(fd, 'ref'),
		nome: str(fd, 'nome') ?? '',
		preco: num(fd, 'preco'),
		preco_promocional: num(fd, 'preco_promocional'),
		limite: (() => {
			const s = str(fd, 'limite');
			return s === null ? null : parseInt(s, 10);
		})()
	};
}

export function materialFromForm(fd: FormData) {
	return {
		tipo: str(fd, 'tipo') ?? 'feed',
		arquivo_url: str(fd, 'arquivo_url')
	};
}
