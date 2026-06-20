// Rótulos dos tipos de job — compartilhado entre servidor e navegador
// (o JobsWatcher usa para montar o texto do toast). NÃO importar nada de server aqui.

export const JOB_LABELS: Record<string, string> = {
	demo: 'Tarefa de teste',
	relatorio_financeiro: 'Relatório financeiro',
	sync_anuncios: 'Sincronização de anúncios',
	envio_email: 'Envio de e-mail'
};

export function jobLabel(tipo: string): string {
	return JOB_LABELS[tipo] ?? tipo;
}
