// Painel de Saúde — traduz o que o banco devolve (nome de tabela, contagem,
// data da última linha) para o que o Bruno reconhece na tela: o nome do módulo
// e uma resposta direta — está vivo, parou, ou nunca foi usado.
//
// A função `saude_resumo()` (migration 0063) devolve TODAS as tabelas. O mapa
// abaixo decide quais viram linha na tela e com que nome; o que não está aqui é
// tabela de configuração ou de apoio, contada à parte no rodapé.

export interface TabelaSaude {
	tabela: string;
	linhas: number;
	ultimo: string | null;
	bytes: number;
}

export interface ResumoSaude {
	gerado_em: string;
	banco_bytes: number;
	dados_bytes: number;
	arquivos_qtd: number;
	arquivos_bytes: number;
	usuarios: number;
	tabelas: TabelaSaude[];
}

export type Grupo = 'Marketing' | 'Comercial' | 'Administrativo' | 'Equipe' | "Pag's Up";

/** Uma linha do painel: uma ou mais tabelas somadas sob um nome de gente. */
type Modulo = { label: string; grupo: Grupo; tabelas: string[] };

export const MODULOS_SAUDE: Modulo[] = [
	// Marketing
	{ label: 'Conteúdo (calendário)', grupo: 'Marketing', tabelas: ['conteudos'] },
	{ label: 'Aprovações de post', grupo: 'Marketing', tabelas: ['aprovacoes'] },
	{ label: 'Comentários em posts', grupo: 'Marketing', tabelas: ['comentarios'] },
	{ label: 'Processos', grupo: 'Marketing', tabelas: ['processos'] },
	// Comercial
	{ label: 'Negócios (funil)', grupo: 'Comercial', tabelas: ['crm_negocios'] },
	{ label: 'Contatos', grupo: 'Comercial', tabelas: ['crm_contatos'] },
	{ label: 'Atividades do funil', grupo: 'Comercial', tabelas: ['crm_atividades'] },
	{ label: 'Metas', grupo: 'Comercial', tabelas: ['crm_metas'] },
	{ label: 'Interações com cliente', grupo: 'Comercial', tabelas: ['cliente_interacoes'] },
	// Administrativo
	{ label: 'Clientes', grupo: 'Administrativo', tabelas: ['clientes'] },
	{ label: 'Cofre dos clientes', grupo: 'Administrativo', tabelas: ['cliente_vault'] },
	{ label: 'Projetos', grupo: 'Administrativo', tabelas: ['projetos'] },
	{ label: 'Fornecedores', grupo: 'Administrativo', tabelas: ['adm_fornecedores'] },
	{ label: 'Ferramentas & contas', grupo: 'Administrativo', tabelas: ['adm_ferramentas', 'adm_acessos'] },
	{ label: 'Contratos e planos', grupo: 'Administrativo', tabelas: ['contratos', 'planos'] },
	{ label: 'Financeiro', grupo: 'Administrativo', tabelas: ['transacoes'] },
	{ label: 'Onboarding', grupo: 'Administrativo', tabelas: ['adm_onboarding_itens'] },
	{ label: 'Base de conhecimento', grupo: 'Administrativo', tabelas: ['kb_artigos'] },
	{ label: 'Central SOS', grupo: 'Administrativo', tabelas: ['sos_chamados'] },
	{ label: 'Notificações', grupo: 'Administrativo', tabelas: ['notificacoes'] },
	// Equipe
	{ label: 'Pessoas', grupo: 'Equipe', tabelas: ['colaboradores'] },
	{ label: 'Ponto', grupo: 'Equipe', tabelas: ['ponto_registros', 'ponto_ajustes'] },
	{ label: 'Rotina', grupo: 'Equipe', tabelas: ['rotina_itens', 'rotina_conclusoes'] },
	{ label: 'Organyze (tarefas pessoais)', grupo: 'Equipe', tabelas: ['organyze_tarefas', 'organyze_metas', 'organyze_habitos'] },
	// Pag's Up
	{ label: 'Pagamentos', grupo: "Pag's Up", tabelas: ['pagsup_pagamentos'] },
	{ label: 'Prestadores', grupo: "Pag's Up", tabelas: ['pagsup_prestadores'] },
	{ label: 'Cronograma', grupo: "Pag's Up", tabelas: ['pagsup_cronograma'] },
	{ label: 'Negociações', grupo: "Pag's Up", tabelas: ['pagsup_negociacoes', 'pagsup_negociacoes_agendadas'] }
];

export const GRUPOS: Grupo[] = ['Marketing', 'Comercial', 'Administrativo', 'Equipe', "Pag's Up"];

export type Situacao = 'ativo' | 'parado' | 'vazio';

export interface LinhaSaude {
	label: string;
	grupo: Grupo;
	linhas: number;
	ultimo: string | null;
	/** Dias desde a última entrada (null quando nunca houve, ou sem data). */
	dias: number | null;
	situacao: Situacao;
}

/** Um módulo está "ativo" se recebeu algo nos últimos 30 dias. */
const DIAS_ATIVO = 30;

export function diasDesde(iso: string | null, agora = new Date()): number | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return Math.floor((agora.getTime() - d.getTime()) / 86400000);
}

/** Junta as tabelas de cada módulo numa linha só do painel. */
export function montarLinhas(resumo: ResumoSaude, agora = new Date()): LinhaSaude[] {
	const porTabela = new Map(resumo.tabelas.map((t) => [t.tabela, t]));
	return MODULOS_SAUDE.map((m) => {
		const partes = m.tabelas.map((t) => porTabela.get(t)).filter((t): t is TabelaSaude => !!t);
		const linhas = partes.reduce((s, p) => s + Number(p.linhas ?? 0), 0);
		// A data que vale é a mais recente entre as tabelas do módulo.
		const ultimo = partes
			.map((p) => p.ultimo)
			.filter((d): d is string => !!d)
			.sort()
			.pop() ?? null;
		const dias = diasDesde(ultimo, agora);
		const situacao: Situacao =
			linhas === 0 ? 'vazio' : dias === null || dias <= DIAS_ATIVO ? 'ativo' : 'parado';
		return { label: m.label, grupo: m.grupo, linhas, ultimo, dias, situacao };
	});
}

/** Tabelas que não viram linha na tela (configuração, apoio, permissões). */
export function tabelasDeApoio(resumo: ResumoSaude): number {
	const mapeadas = new Set(MODULOS_SAUDE.flatMap((m) => m.tabelas));
	return resumo.tabelas.filter((t) => !mapeadas.has(t.tabela)).length;
}

const ORDEM: Record<Situacao, number> = { ativo: 0, parado: 1, vazio: 2 };

/** Ativos primeiro, parados depois, vazios por último; dentro, os maiores. */
export function ordenar(linhas: LinhaSaude[]): LinhaSaude[] {
	return [...linhas].sort(
		(a, b) => ORDEM[a.situacao] - ORDEM[b.situacao] || b.linhas - a.linhas || a.label.localeCompare(b.label)
	);
}

export function formatarBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** "hoje", "ontem", "há 12 dias" — como se fala, não como o banco guarda. */
export function quandoFoi(dias: number | null): string {
	if (dias === null) return '—';
	if (dias <= 0) return 'hoje';
	if (dias === 1) return 'ontem';
	if (dias < 30) return `há ${dias} dias`;
	if (dias < 60) return 'há 1 mês';
	if (dias < 365) return `há ${Math.floor(dias / 30)} meses`;
	return 'há mais de um ano';
}
