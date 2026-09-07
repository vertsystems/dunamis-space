// Projetos próprios — o caderno técnico: onde cada projeto está hospedado, em
// que banco de dados vive, com que acessos se entra. Não é job de cliente: não
// tem cliente dono, tipo de peça, prazo nem valor (ver a migration 0065).
//
// O que sobrou é o essencial de "não me perder": nome, em que pé está, quem
// cuida, as anotações (texto formatado) e o cofre de acessos em projeto_vault.
import { str } from '$lib/form';
import { sanitizarHtml } from '$lib/richtext';

export const PROJETO_STATUS = [
	{ value: 'em_construcao', label: 'Em construção' },
	{ value: 'em_producao', label: 'Em produção' }
] as const;

export function projetoStatusTone(status: string): 'warning' | 'success' | 'neutral' {
	switch (status) {
		case 'em_construcao':
			return 'warning';
		case 'em_producao':
			return 'success';
		default:
			return 'neutral';
	}
}

export function projetoStatusLabel(status: string): string {
	return PROJETO_STATUS.find((s) => s.value === status)?.label ?? status;
}

export function projetoFromForm(fd: FormData) {
	return {
		responsavel_id: str(fd, 'responsavel_id'),
		nome: str(fd, 'nome') ?? '',
		// A descrição vem do editor de texto formatado: entra HTML, e ele é
		// higienizado na porta de entrada — nada de script/handler chega ao banco.
		descricao: sanitizarHtml(str(fd, 'descricao')),
		status: str(fd, 'status') ?? 'em_construcao'
	};
}
