// Organyze — tipos do domínio.
// App de lista de tarefas do dia. Uma tela inicial de seleção de perfil (fotos dos
// colaboradores) define de quem são as tarefas exibidas; é um quadro de equipe
// compartilhado (sem senha por perfil).

export type Prioridade = 'alta' | 'media' | 'baixa';

// Status = colunas/seções do quadro (arrastar entre elas muda o status).
export type Status = 'em_execucao' | 'nao_iniciado' | 'concluida';

// Lado da tarefa: Empresa x Vida Pessoal (colunas do quadro no modo Dia).
export type Categoria = 'empresa' | 'pessoal';
export const CATEGORIAS: Categoria[] = ['empresa', 'pessoal'];
export const CATEGORIA_LABEL: Record<Categoria, string> = {
	empresa: 'Empresa',
	pessoal: 'Vida Pessoal'
};
// Cor de destaque por lado (borda/etiqueta em Semana e Mês).
export const CATEGORIA_COR: Record<Categoria, string> = {
	empresa: '#5b8def',
	pessoal: '#12b886'
};

export interface Colaborador {
	id: string;
	nome: string;
	avatarUrl: string | null;
	funcao: string | null;
}

export interface Subtarefa {
	id: string;
	titulo: string;
	feita: boolean;
}

export interface Tarefa {
	id: string;
	colaboradorId: string;
	titulo: string;
	status: Status;
	categoria: Categoria; // lado: empresa | pessoal
	data: string; // yyyy-mm-dd (dia da tarefa)
	posicao: number; // ordem manual dentro do status (desempate)
	prioridade: Prioridade;
	prazo: string | null; // yyyy-mm-dd (prazo de entrega) ou null
	descricao: string; // HTML enxuto (editor leve)
	subtarefas: Subtarefa[];
	responsaveis: string[]; // colaboradores com quem a tarefa é compartilhada (além do dono)
	deletedAt?: string | null; // preenchido só nas tarefas vindas da Lixeira (soft delete)
}

// Ordem de exibição das seções (topo → base).
export const STATUS_ORDEM: Status[] = ['nao_iniciado', 'em_execucao', 'concluida'];

export const STATUS_LABEL: Record<Status, string> = {
	em_execucao: 'Em execução',
	nao_iniciado: 'Não iniciado',
	concluida: 'Concluídas'
};

// Metas do Mês (por colaborador).
export interface Meta {
	id: string;
	colaboradorId: string;
	mes: string; // yyyy-mm
	titulo: string;
	alvo: number;
	atual: number;
	unidade: string;
	posicao: number;
}

// Habit Tracker (por colaborador, por mês).
export type DiaStatus = 'feito' | 'falhou';

export interface Habito {
	id: string;
	colaboradorId: string;
	mes: string; // yyyy-mm
	nome: string;
	dias: Record<string, DiaStatus>; // { "1": "feito", "5": "falhou" }
	posicao: number;
}

/** Nº de dias do mês (yyyy-mm). */
export const diasNoMes = (mes: string): number => {
	const [y, m] = mes.split('-').map(Number);
	return new Date(y, m, 0).getDate();
};

/** Próximo estado ao clicar num dia: vazio → feito → falhou → vazio. */
export const proximoDia = (atual: DiaStatus | undefined): DiaStatus | undefined =>
	atual === undefined ? 'feito' : atual === 'feito' ? 'falhou' : undefined;

/** Percentual de progresso (0–100). */
export const metaPct = (m: Meta): number =>
	m.alvo > 0 ? Math.min(100, Math.round((m.atual / m.alvo) * 100)) : 0;

/** Meta concluída quando atinge (ou passa) o alvo. */
export const metaConcluida = (m: Meta): boolean => m.alvo > 0 && m.atual >= m.alvo;

export const PRIORIDADES: { valor: Prioridade; label: string; cor: string }[] = [
	{ valor: 'baixa', label: 'Baixa', cor: '#98a2b3' },
	{ valor: 'media', label: 'Média', cor: '#facc15' },
	{ valor: 'alta', label: 'Alta', cor: '#f04438' }
];

export const proximaPrioridade = (p: Prioridade): Prioridade =>
	p === 'alta' ? 'media' : p === 'media' ? 'baixa' : 'alta';

export const corPrioridade = (p: Prioridade): string =>
	PRIORIDADES.find((x) => x.valor === p)?.cor ?? '#98a2b3';

/** Chave numérica do prazo p/ ordenar por urgência (sem prazo vai por último). */
export const prazoOrdem = (t: Tarefa): number =>
	t.prazo ? Number(t.prazo.replaceAll('-', '')) : Number.POSITIVE_INFINITY;

export type Urgencia = { status: 'atrasada' | 'hoje' | 'futura'; label: string; cor: string };

/** Classifica o prazo em relação a hoje (yyyy-mm-dd). */
export function urgencia(prazo: string | null, hoje: string): Urgencia | null {
	if (!prazo) return null;
	if (prazo < hoje) return { status: 'atrasada', label: 'Atrasada', cor: '#f04438' };
	if (prazo === hoje) return { status: 'hoje', label: 'Hoje', cor: '#f5a524' };
	const [, m, d] = prazo.split('-');
	return { status: 'futura', label: `${d}/${m}`, cor: '#98a2b3' };
}
