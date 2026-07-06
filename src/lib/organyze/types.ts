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
	posicao: number; // ordem manual dentro do dia (desempate)
	prioridade: Prioridade;
	prazo: string | null; // yyyy-mm-dd (prazo de entrega) ou null
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

/** Chave numérica do prazo p/ ordenar por urgência (sem prazo vai por último). */
export const prazoOrdem = (t: Tarefa): number =>
	t.prazo ? Number(t.prazo.replaceAll('-', '')) : Number.POSITIVE_INFINITY;

export type Urgencia = { status: 'atrasada' | 'hoje' | 'futura'; label: string; cor: string };

/** Classifica o prazo em relação a hoje (yyyy-mm-dd). */
export function urgencia(prazo: string | null, hoje: string): Urgencia | null {
	if (!prazo) return null;
	if (prazo < hoje) return { status: 'atrasada', label: 'Atrasada', cor: '#f04438' };
	if (prazo === hoje) return { status: 'hoje', label: 'Hoje', cor: '#f5a524' };
	// Data futura: formata dd/mm.
	const [, m, d] = prazo.split('-');
	return { status: 'futura', label: `${d}/${m}`, cor: '#98a2b3' };
}
