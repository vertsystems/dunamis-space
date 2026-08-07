// Apresentação do Organyze: o que é só cor, rótulo e formato de data.
//
// Estava tudo dentro do +page.svelte (1.349 linhas), misturado com o markup —
// e a mesma função `iniciais`/`corAvatar` reaparecia na tela de metas. Aqui é
// código puro: dá para testar sem montar componente nenhum.
import { toISODate } from '$lib/organyze/store.svelte';
import { diasNoMes } from '$lib/organyze/types';
import type { Status } from '$lib/organyze/types';

/** Iniciais do nome: primeiro + último ("Ana Maria Silva" → "AS"). */
export function iniciais(nome: string): string {
	const p = nome.trim().split(/\s+/);
	return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

const CORES = ['#3b6ef6', '#17b26a', '#f5a524', '#f04438', '#8b5cf6', '#ec4899', '#0ea5e9'];

/** Cor estável para o avatar sem foto — a mesma pessoa tem sempre a mesma cor. */
export function corAvatar(id: string): string {
	let h = 0;
	for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	return CORES[h % CORES.length];
}

/** Nome e cor de cada seção do quadro. */
export const SECAO_META: Record<Status, { label: string; cor: string }> = {
	em_execucao: { label: 'Em execução', cor: 'var(--color-brand)' },
	nao_iniciado: { label: 'Não iniciado', cor: 'var(--color-grey)' },
	concluida: { label: 'Concluídas', cor: 'var(--color-brand-green)' }
};

/** Botão de situação: tom leve sempre; destaque forte quando selecionado. */
export function situacaoStyle(s: Status, sel: boolean): string {
	const c = SECAO_META[s].cor;
	const mix = (pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
	return sel
		? `border-color:${c}; color:${c}; background:${mix(18)}; box-shadow: inset 0 0 0 1px ${c}`
		: `border-color:${mix(40)}; color:${c}; background:${mix(10)}`;
}

/** Atalhos de prazo oferecidos no modal (dias a partir de hoje). */
export const PRAZO_ATALHOS = [3, 5, 7, 10];

/** A data de daqui a N dias, em ISO. */
export function prazoEmDias(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() + n);
	return toISODate(d);
}

/** Cabeçalho da grade do mês. A semana começa na segunda. */
export const DOW = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** "2026-08-07" → "07/08". */
export function fmtDiaMes(iso: string): string {
	const [, m, d] = iso.split('-');
	return `${d}/${m}`;
}

/** Data local a partir do ISO — `new Date('2026-08-07')` viria em UTC e podia voltar um dia. */
export function parseISO(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}

/** Hoje, no formato que o Organyze usa para comparar dias. */
export function hoje(): string {
	return toISODate(new Date());
}

/** Mês corrente no formato das metas (AAAA-MM). */
export function mesAtual(agora: Date = new Date()): string {
	return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Dias já decorridos do mês — o denominador da aderência aos hábitos.
 * Mês passado conta inteiro; mês futuro conta zero (senão a aderência de um
 * mês que nem começou apareceria como 0% de fracasso).
 */
export function diasDecorridos(mes: string, agora: Date = new Date()): number {
	const atual = mesAtual(agora);
	if (mes < atual) return diasNoMes(mes);
	if (mes === atual) return agora.getDate();
	return 0;
}
