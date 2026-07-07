// ============================================================
// Permissões por módulo (front + guarda de rota)
// ------------------------------------------------------------
// Espelha o modelo do banco (migration 0034). Nível hierárquico por módulo:
// nenhum < ver < editar < excluir. A permissão efetiva é calculada no banco
// (função perm_niveis) e chega ao app como um mapa { modulo: nivel }.
// ============================================================

export const NIVEIS = ['nenhum', 'ver', 'editar', 'excluir'] as const;
export type Nivel = (typeof NIVEIS)[number];

/** Mapa de permissões efetivas do usuário logado. Ausente = 'nenhum'. */
export type Permissoes = Record<string, Nivel>;

export type Modulo = {
	id: string;
	label: string;
	/** Grupo/departamento do menu (para agrupar na tela de administração). */
	grupo: 'administrativo' | 'comercial' | 'marketing' | 'dtools';
	/** Rotas cobertas por este módulo (prefixos). */
	rotas: string[];
};

// Registro canônico de módulos controlados por permissão.
// 'permissoes' (tela de administração) só é liberado a super-admin — não entra
// no seed de cargos (ver 0034); default = nenhum para todos os demais.
export const MODULOS: Modulo[] = [
	{ id: 'administrativo', label: 'Visão Geral (Admin)', grupo: 'administrativo', rotas: ['/administrativo'] },
	{ id: 'permissoes', label: 'Permissões', grupo: 'administrativo', rotas: ['/administrativo/permissoes'] },
	{ id: 'clientes', label: 'Clientes', grupo: 'administrativo', rotas: ['/clientes', '/cadastro'] },
	{ id: 'fornecedores', label: 'Fornecedores', grupo: 'administrativo', rotas: ['/fornecedores'] },
	{ id: 'onboarding', label: 'Onboarding', grupo: 'administrativo', rotas: ['/onboarding'] },
	{ id: 'equipe', label: 'Equipe', grupo: 'administrativo', rotas: ['/equipe'] },
	{ id: 'ferramentas', label: 'Ferramentas & Contas', grupo: 'administrativo', rotas: ['/ferramentas'] },
	{ id: 'base_conhecimento', label: 'Base de Conhecimento', grupo: 'administrativo', rotas: ['/base-conhecimento'] },
	{ id: 'sos', label: 'Central SOS', grupo: 'administrativo', rotas: ['/sos'] },
	{ id: 'crm', label: 'CRM Master', grupo: 'comercial', rotas: ['/crm'] },
	{ id: 'financeiro', label: 'Financeiro', grupo: 'comercial', rotas: ['/financeiro'] },
	{ id: 'calendario', label: 'Calendário', grupo: 'marketing', rotas: ['/calendario'] },
	{ id: 'tarefas', label: 'Tarefas', grupo: 'marketing', rotas: ['/tarefas'] },
	{ id: 'conteudo', label: 'Conteúdo', grupo: 'marketing', rotas: ['/conteudo'] },
	{ id: 'campanhas', label: 'Campanhas', grupo: 'marketing', rotas: ['/campanhas'] },
	{ id: 'processos', label: 'Processos', grupo: 'marketing', rotas: ['/processos'] },
	{ id: 'contratos', label: 'Contratos', grupo: 'administrativo', rotas: ['/contratos'] },
	{ id: 'projetos', label: 'Projetos', grupo: 'marketing', rotas: ['/projetos'] },
	{ id: 'pagsup', label: "Pag's Up", grupo: 'dtools', rotas: ['/dtools/pagsup'] }
];

/** Lista de ids de módulo (para a chamada rpc perm_niveis). */
export const MODULO_IDS = MODULOS.map((m) => m.id);

// Rotas sempre liberadas a qualquer autenticado (pessoais/compartilhadas).
// Login/redefinir-senha/aprovar são públicas e tratadas no hooks à parte.
const ROTAS_LIVRES = [
	'/',
	'/meu-dia',
	'/perfil',
	'/notificacoes',
	'/atalhos',
	'/desempenho',
	'/dtools/organyze'
];

// Pares (rota, modulo) ordenados por especificidade (rota mais longa primeiro),
// para que '/administrativo/permissoes' bata em 'permissoes' e não 'administrativo'.
const PARES_ROTA = MODULOS.flatMap((m) => m.rotas.map((rota) => ({ rota, modulo: m.id }))).sort(
	(a, b) => b.rota.length - a.rota.length
);

function casa(pathname: string, rota: string): boolean {
	if (rota === '/') return pathname === '/';
	return pathname === rota || pathname.startsWith(rota + '/');
}

/**
 * Módulo que governa uma rota. Retorna null para rotas livres (pessoais) —
 * incluindo '/dtools' (índice) que não exige módulo.
 */
export function moduloDaRota(pathname: string): string | null {
	if (ROTAS_LIVRES.some((r) => casa(pathname, r))) return null;
	if (pathname === '/dtools') return null;
	const par = PARES_ROTA.find((p) => casa(pathname, p.rota));
	return par?.modulo ?? null;
}

export function rank(nivel: Nivel | undefined | null): number {
	return nivel ? NIVEIS.indexOf(nivel) : 0;
}

export function nivelDe(perms: Permissoes | undefined | null, modulo: string): Nivel {
	return perms?.[modulo] ?? 'nenhum';
}

export function temNivel(perms: Permissoes | undefined | null, modulo: string, min: Nivel): boolean {
	return rank(nivelDe(perms, modulo)) >= rank(min);
}

export const podeVer = (p: Permissoes | undefined | null, m: string) => temNivel(p, m, 'ver');
export const podeEditar = (p: Permissoes | undefined | null, m: string) => temNivel(p, m, 'editar');
export const podeExcluir = (p: Permissoes | undefined | null, m: string) => temNivel(p, m, 'excluir');

/** Pode acessar (ver) a rota? Rotas livres sempre true. */
export function podeAcessarRota(perms: Permissoes | undefined | null, pathname: string): boolean {
	const modulo = moduloDaRota(pathname);
	if (modulo === null) return true;
	return podeVer(perms, modulo);
}
