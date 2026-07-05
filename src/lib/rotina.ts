// Mapa de Rotina — dias da semana e utilidades de data.

export type Dia = { idx: number; nome: string; curto: string };

/** Domingo(0) … Sábado(6) — mesma ordem da planilha original. */
export const DIAS: Dia[] = [
	{ idx: 0, nome: 'Domingo', curto: 'Dom' },
	{ idx: 1, nome: 'Segunda', curto: 'Seg' },
	{ idx: 2, nome: 'Terça', curto: 'Ter' },
	{ idx: 3, nome: 'Quarta', curto: 'Qua' },
	{ idx: 4, nome: 'Quinta', curto: 'Qui' },
	{ idx: 5, nome: 'Sexta', curto: 'Sex' },
	{ idx: 6, nome: 'Sábado', curto: 'Sáb' }
];

/** Data (YYYY-MM-DD) e dia da semana (0-6) de hoje no fuso de São Paulo. */
export function hojeSP(): { data: string; dia: number } {
	const agora = new Date();
	const data = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Sao_Paulo',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(agora); // YYYY-MM-DD
	// Meio-dia UTC do mesmo dia-calendário → getUTCDay estável, sem borda de fuso.
	const dia = new Date(`${data}T12:00:00Z`).getUTCDay();
	return { data, dia };
}

export type RotinaItem = { id: string; cargo: string; dia_semana: number; titulo: string; ordem: number };

/** Agrupa itens por dia (0-6), já ordenados por `ordem`. */
export function porDia(itens: RotinaItem[]): Record<number, RotinaItem[]> {
	const mapa: Record<number, RotinaItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
	for (const it of itens) (mapa[it.dia_semana] ??= []).push(it);
	for (const k of Object.keys(mapa)) mapa[+k].sort((a, b) => a.ordem - b.ordem);
	return mapa;
}
