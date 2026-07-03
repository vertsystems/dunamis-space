// Limiares dos alertas inteligentes do dashboard.
export const DIAS_CONTRATO_VENCENDO = 30; // contrato ativo terminando nos próximos N dias
export const DIAS_SEM_INTERACAO = 30; // cliente ativo sem registro de interação há N dias

/**
 * Parseia data como HORÁRIO LOCAL. Strings date-only ('YYYY-MM-DD') seriam
 * interpretadas como UTC por `new Date(...)` — o que causa off-by-one no fuso do
 * Brasil (e divergência SSR/hidratação). O sufixo 'T00:00:00' força local; ISO
 * completo (timestamptz) passa direto.
 */
function paraData(d: string): Date {
	return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T00:00:00') : new Date(d);
}

/** Nº de dias entre hoje e uma data (YYYY-MM-DD ou ISO). Negativo = no passado. */
export function diasAte(data: string | null): number | null {
	if (!data) return null;
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);
	const alvo = paraData(data);
	alvo.setHours(0, 0, 0, 0);
	return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

export function formatDateBR(data: string | null): string {
	return data ? paraData(data).toLocaleDateString('pt-BR', { dateStyle: 'short' }) : '—';
}

/** Texto humano para o prazo de um contrato a partir de dias restantes. */
export function prazoContratoLabel(dias: number | null): string {
	if (dias === null) return '';
	if (dias < 0) return `vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`;
	if (dias === 0) return 'vence hoje';
	return `vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}
