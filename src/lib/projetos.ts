// Projetos próprios — o caderno técnico: onde cada projeto está hospedado, em
// que banco de dados vive, com que acessos se entra. Não é job de cliente: não
// tem cliente dono, tipo de peça, prazo nem valor (ver a migration 0065).
//
// O que sobrou é o essencial de "não me perder": nome, em que pé está, quem
// cuida, as anotações (texto formatado) e o cofre de acessos em projeto_vault.
import { str } from '$lib/form';
import { sanitizarHtml } from '$lib/richtext';

export const PROJETO_STATUS = [
	{ value: 'suspenso', label: 'Suspenso' },
	{ value: 'em_construcao', label: 'Em construção' },
	{ value: 'em_producao', label: 'Em produção' }
] as const;

export function projetoStatusTone(status: string): 'warning' | 'success' | 'neutral' {
	switch (status) {
		case 'em_construcao':
			return 'warning';
		case 'em_producao':
			return 'success';
		// Suspenso é cinza de propósito: parado não é problema nem conquista, e
		// uma cor forte o faria disputar atenção com o que está andando.
		default:
			return 'neutral';
	}
}

/**
 * Classe extra do badge de status. Hoje só o "Em produção" tem: ele ganha um
 * anel verde em degradê com brilho (ver .badge-producao no design-system.css).
 *
 * Existe para os três lugares que desenham o badge — cartão, lista e ficha —
 * não terem de lembrar disso cada um por si.
 */
export function projetoStatusClasse(status: string): string {
	return status === 'em_producao' ? 'badge-producao' : '';
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
		status: str(fd, 'status') ?? 'em_construcao',
		url: str(fd, 'url'),
		repositorio: str(fd, 'repositorio'),
		hospedagem: str(fd, 'hospedagem'),
		banco_dados: str(fd, 'banco_dados')
	};
}

/**
 * Os campos de "onde o projeto está", na ordem em que aparecem na ficha e no
 * formulário. Uma lista só, para os dois não saírem da linha um do outro.
 * `link: true` = o valor costuma ser endereço e vira âncora clicável.
 */
export const PROJETO_ONDE = [
	{ campo: 'url', label: 'No ar em', placeholder: 'meuprojeto.com.br', link: true },
	{ campo: 'repositorio', label: 'Repositório', placeholder: 'github.com/user/repo', link: true },
	{ campo: 'hospedagem', label: 'Hospedagem', placeholder: 'Vercel, VPS, FTP…', link: false },
	{ campo: 'banco_dados', label: 'Banco de dados', placeholder: 'Supabase, SQLite…', link: false }
] as const;
