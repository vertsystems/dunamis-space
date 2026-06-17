// Limiares dos alertas inteligentes do dashboard.
export const DIAS_CONTRATO_VENCENDO = 30; // contrato ativo terminando nos próximos N dias
export const DIAS_SEM_INTERACAO = 30; // cliente ativo sem registro de interação há N dias

/** Nº de dias entre hoje e uma data (YYYY-MM-DD ou ISO). Negativo = no passado. */
export function diasAte(data: string | null): number | null {
	if (!data) return null;
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);
	const alvo = new Date(data);
	alvo.setHours(0, 0, 0, 0);
	return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

export function formatDateBR(data: string | null): string {
	return data ? new Date(data).toLocaleDateString('pt-BR', { dateStyle: 'short' }) : '—';
}

/** Texto humano para o prazo de um contrato a partir de dias restantes. */
export function prazoContratoLabel(dias: number | null): string {
	if (dias === null) return '';
	if (dias < 0) return `vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`;
	if (dias === 0) return 'vence hoje';
	return `vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}
