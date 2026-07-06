// Organyze — tipos do domínio.
// App de lista de tarefas do dia. Uma tela inicial de seleção de perfil (fotos dos
// colaboradores) define de quem são as tarefas exibidas; é um quadro de equipe
// compartilhado (sem senha por perfil).

export type Prioridade = 'alta' | 'media' | 'baixa';

export interface Colaborador {
	id: string;
	nome: string;
	avatarUrl: string | null;
	funcao: string | null;
}

export interface Tarefa {
	id: string;
	colaboradorId: string;
	titulo: string;
	concluida: boolean;
	data: string; // yyyy-mm-dd (dia da tarefa)
	posicao: number; // ordem dentro do dia
	prioridade: Prioridade;
	etiquetas: string[];
}

export const PRIORIDADES: { valor: Prioridade; label: string; cor: string }[] = [
	{ valor: 'alta', label: 'Alta', cor: '#f04438' },
	{ valor: 'media', label: 'Média', cor: '#f5a524' },
	{ valor: 'baixa', label: 'Baixa', cor: '#98a2b3' }
];

export const proximaPrioridade = (p: Prioridade): Prioridade =>
	p === 'alta' ? 'media' : p === 'media' ? 'baixa' : 'alta';

export const corPrioridade = (p: Prioridade): string =>
	PRIORIDADES.find((x) => x.valor === p)?.cor ?? '#98a2b3';
