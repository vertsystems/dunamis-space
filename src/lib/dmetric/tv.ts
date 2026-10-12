// DMetric — modo TV: o que a tela cheia mostra e as contas dela. Só regras,
// sem I/O: os dados saem de $lib/server/dmetricTv.ts e o teste cobre (tv.test.ts).
import type { AgoraDados, ItemDimensao } from './painel';

/** Um acesso da lista recente (dmetric_ultimos, 0081). */
export type UltimoAcesso = {
	em: string;
	site_id: string;
	caminho: string;
	cidade: string | null;
	pais: string | null;
	origem: string | null;
	dispositivo: string | null;
};

export type TvDados = {
	/** Quando o servidor montou os dados (ISO). */
	em: string;
	/** De hoje, desde a meia-noite de Brasília. */
	hoje: {
		visitas: number;
		visualizacoes: number;
		segundos: number;
		serie: { momento: string; visitas: number; visualizacoes: number }[];
		paises: ItemDimensao[];
		paginas: ItemDimensao[];
	};
	/** Ontem, da meia-noite até esta mesma hora. */
	ontem: { visitas: number; visualizacoes: number };
	agora: AgoraDados;
	ultimos: UltimoAcesso[];
};

/** Quanto hoje andou em relação a ontem até a mesma hora (0,12 = +12%); null sem base. */
export function variacao(hoje: number, ontem: number): number | null {
	if (!ontem) return null;
	return (hoje - ontem) / ontem;
}

export type MelhorPagina = { site_id: string; caminho: string; numero: number; agora: boolean };

/**
 * A página do momento: a que tem mais gente agora; sem ninguém agora, a mais
 * visitada de hoje.
 */
export function melhorPagina(d: Pick<TvDados, 'agora' | 'hoje'>): MelhorPagina | null {
	const viva = d.agora.paginas[0];
	if (viva) return { site_id: viva.site_id, caminho: viva.caminho, numero: viva.pessoas, agora: true };
	const hoje = [...d.hoje.paginas].sort((a, b) => b.visitas - a.visitas || b.visualizacoes - a.visualizacoes)[0];
	if (hoje?.site_id) return { site_id: hoje.site_id, caminho: hoje.valor, numero: hoje.visitas, agora: false };
	return null;
}

const HORA_BR = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' });
export const horaEmBrasilia = (d: Date) => Number(HORA_BR.format(d));

/** As 24 horas de hoje (Brasília), com as visitas de cada uma; as que ainda não chegaram, marcadas. */
export function horasDeHoje(
	serie: TvDados['hoje']['serie'],
	agora = new Date()
): { hora: number; visitas: number; futura: boolean }[] {
	const porHora = new Map<number, number>();
	for (const p of serie) {
		const h = horaEmBrasilia(new Date(p.momento));
		porHora.set(h, (porHora.get(h) ?? 0) + p.visitas);
	}
	const atual = horaEmBrasilia(agora);
	return Array.from({ length: 24 }, (_, hora) => ({ hora, visitas: porHora.get(hora) ?? 0, futura: hora > atual }));
}

/** "agora", "há 40 s", "há 3 min", "há 2 h" — para o feed, que atualiza a cada poucos segundos. */
export function haQuantoCurto(iso: string, agora = new Date()): string {
	const s = Math.max(0, Math.round((agora.getTime() - new Date(iso).getTime()) / 1000));
	if (s < 10) return 'agora';
	if (s < 60) return `há ${s} s`;
	const min = Math.floor(s / 60);
	if (min < 60) return `há ${min} min`;
	return `há ${Math.floor(min / 60)} h`;
}
