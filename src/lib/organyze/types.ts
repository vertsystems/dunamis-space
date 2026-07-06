// Organyze — tipos do domínio.
// App simples de lista de tarefas do dia (por usuário). Cada tarefa pertence a
// um dia (`data`) e pode ser marcada como concluída.

export interface Tarefa {
	id: string;
	titulo: string;
	concluida: boolean;
	data: string; // yyyy-mm-dd (dia da tarefa)
	posicao: number; // ordem dentro do dia
}
