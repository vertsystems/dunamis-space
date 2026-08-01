// Helpers de calendário mensal, compartilhados entre o módulo Conteúdo e as
// campanhas. Toda a aritmética de data usa horário LOCAL (o grid é montado no
// cliente); a conversão de/para UTC de instantes fica a cargo de quem consome.

// A semana começa na SEGUNDA e termina no domingo (padrão da agência).
export const SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

/** Índice da coluna (0=segunda … 6=domingo) de uma data. */
export function colunaSemana(d: Date): number {
	return (d.getDay() + 6) % 7;
}

/** Segunda-feira da semana a que a data pertence. */
export function inicioDaSemana(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate() - colunaSemana(d));
}

export const MESES = [
	'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
	'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
] as const;

/** Formato aceito nos parâmetros de mês (?mes= / ?cal=): "AAAA-MM". */
export const MES_RE = /^\d{4}-\d{2}$/;

/** Chave "AAAA-MM-DD" (dia local) — ordenável lexicograficamente = cronológica. */
export function chaveDia(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "AAAA-MM" a partir de ano + mês (0-11). */
export function fmtMes(ano: number, mes: number): string {
	return `${ano}-${String(mes + 1).padStart(2, '0')}`;
}

/** Interpreta "AAAA-MM" → { ano, mes (0-11) } ou null se inválido/fora de faixa. */
export function parseMes(s: string | null | undefined): { ano: number; mes: number } | null {
	if (!s || !MES_RE.test(s)) return null;
	const mes = Number(s.slice(5, 7));
	if (mes < 1 || mes > 12) return null;
	return { ano: Number(s.slice(0, 4)), mes: mes - 1 };
}

export function mesAnterior(ano: number, mes: number): string {
	return mes === 0 ? fmtMes(ano - 1, 11) : fmtMes(ano, mes - 1);
}

export function mesSeguinte(ano: number, mes: number): string {
	return mes === 11 ? fmtMes(ano + 1, 0) : fmtMes(ano, mes + 1);
}

/**
 * Grid de células (semanas completas, Seg→Dom) que cobre o mês informado,
 * incluindo os dias "vazando" do mês anterior/seguinte para fechar as semanas.
 */
export function celulasMes(ano: number, mes: number): Date[] {
	const primeiro = new Date(ano, mes, 1);
	const inicioSemana = colunaSemana(primeiro);
	const diasNoMes = new Date(ano, mes + 1, 0).getDate();
	const total = Math.ceil((inicioSemana + diasNoMes) / 7) * 7;
	const inicio = new Date(ano, mes, 1 - inicioSemana);
	return Array.from({ length: total }, (_, i) => {
		const d = new Date(inicio);
		d.setDate(inicio.getDate() + i);
		return d;
	});
}
