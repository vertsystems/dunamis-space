// Helpers do módulo Administrativo (migration 0006).
import { bool, num, numBR, str } from '$lib/form';

/** Checklist padrão aplicada a cada cliente ao iniciar o onboarding. */
export const ONBOARDING_PADRAO: string[] = [
	'Coletar acessos das redes e ferramentas',
	'Assinatura do contrato',
	'Briefing / reunião de kickoff',
	'Definir cronograma de conteúdo',
	'Criar pastas e materiais base',
	'Apresentar o time responsável',
	'Configurar gestão de tráfego (se aplicável)'
];

/** Tipos aceitos em `adm_fornecedores.tipo`. */
export const FORNECEDOR_TIPOS = ['freelancer', 'fornecedor', 'parceiro'];

/** Campos do formulário de fornecedor/freelancer/parceiro. */
export function fornecedorFromForm(fd: FormData) {
	const tipoRaw = str(fd, 'tipo');
	const av = num(fd, 'avaliacao');
	return {
		nome: str(fd, 'nome') ?? '',
		tipo: tipoRaw && FORNECEDOR_TIPOS.includes(tipoRaw) ? tipoRaw : 'freelancer',
		especialidade: str(fd, 'especialidade'),
		email: str(fd, 'email'),
		telefone: str(fd, 'telefone'),
		custo_referencia: numBR(fd, 'custo_referencia'),
		// Estrelas: fora de 1..5 é lixo, e null é "sem avaliação".
		avaliacao: av !== null && av >= 1 && av <= 5 ? Math.trunc(av) : null,
		ativo: bool(fd, 'ativo'),
		observacoes: str(fd, 'observacoes'),
		site: str(fd, 'site'),
		instagram: str(fd, 'instagram')
	};
}

/** Campos do formulário de uma ferramenta contratada pela agência. */
export function ferramentaFromForm(fd: FormData) {
	return {
		nome: str(fd, 'nome') ?? '',
		categoria: str(fd, 'categoria'),
		url: str(fd, 'url'),
		custo_mensal: numBR(fd, 'custo_mensal') ?? 0,
		ciclo: str(fd, 'ciclo') ?? 'mensal',
		proxima_renovacao: str(fd, 'proxima_renovacao'),
		responsavel_id: str(fd, 'responsavel_id'),
		ativo: bool(fd, 'ativo'),
		observacoes: str(fd, 'observacoes')
	};
}

/** Campos do formulário de um acesso da agência (não confundir com o cofre do cliente). */
export function acessoFromForm(fd: FormData) {
	return {
		plataforma: str(fd, 'plataforma') ?? '',
		login: str(fd, 'login'),
		url: str(fd, 'url'),
		local_senha: str(fd, 'local_senha'),
		responsavel_id: str(fd, 'responsavel_id'),
		observacoes: str(fd, 'observacoes')
	};
}
