// Formatação para exibição — data, hora e dinheiro.
//
// Por que existe: havia 9 formatadores de data espalhados pelo projeto (6 cópias
// de `fmtData` em páginas, mais `formatData`/`formatDataHora` em crm.ts e
// `formatDateBR` em alertas.ts) e eles JÁ tinham divergido: uns devolviam '—'
// no caso vazio, outros devolviam null ou string vazia, e um fazia split manual
// em vez de toLocaleDateString. Consertar o parse de uma data exigia 9 edições
// sem garantia de ter achado todas.
//
// Para CÁLCULO de data com fuso (hoje, mês atual), use $lib/datas.

/** Placeholder padrão para valor ausente em toda a UI. */
export const VAZIO = '—';

/**
 * Data em dd/mm/aaaa. Aceita 'YYYY-MM-DD' e ISO completo.
 *
 * Datas puras ('2026-07-25') são interpretadas como MEIO-DIA UTC de propósito:
 * `new Date('2026-07-25')` é meia-noite UTC, que no Brasil (UTC-3) cai no dia
 * 24 e fazia a tela mostrar um dia a menos.
 */
export function fmtData(v: string | null | undefined, vazio: string = VAZIO): string {
	if (!v) return vazio;
	const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00Z`) : new Date(v);
	if (Number.isNaN(d.getTime())) return vazio;
	return d.toLocaleDateString('pt-BR');
}

/** Data e hora em dd/mm/aaaa hh:mm. */
export function fmtDataHora(v: string | null | undefined, vazio: string = VAZIO): string {
	if (!v) return vazio;
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return vazio;
	return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
		hour: '2-digit',
		minute: '2-digit'
	})}`;
}

/** Valor em reais (R$ 1.234,56). */
export function fmtBRL(v: number | string | null | undefined, vazio: string = VAZIO): string {
	if (v === null || v === undefined || v === '') return vazio;
	const n = typeof v === 'number' ? v : Number(v);
	if (!Number.isFinite(n)) return vazio;
	return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
