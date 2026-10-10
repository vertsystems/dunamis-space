// DMetric — as regras do painel, sem I/O (testadas em painel.test.ts).

/** Um item de uma dimensão (país, página, origem…) já somado no período. */
export type ItemDimensao = { valor: string; visitas: number; visualizacoes: number };

/** O que a função dmetric_painel devolve (migration 0072). */
export type PainelDados = {
	visitas: number;
	visualizacoes: number;
	por_dia: { dia: string; visitas: number; visualizacoes: number }[];
	dimensoes: Partial<Record<Dimensao, ItemDimensao[]>>;
};

export type Dimensao = 'pais' | 'cidade' | 'pagina' | 'origem' | 'dispositivo' | 'navegador' | 'sistema';

/** Uma linha do histórico importado do Google Analytics. */
export type LinhaHistorico = {
	propriedade: string;
	inicio: string;
	fim: string;
	pais: string | null;
	pais_nome: string;
	usuarios: number;
};

export type DMetricSite = {
	id: string;
	nome: string;
	dominio: string | null;
	chave: string;
	ativo: boolean;
	ultima_visita: string | null;
	created_at: string;
};

// ---- Período ---------------------------------------------------------------

export const PERIODOS = [
	{ id: '7d', rotulo: 'Últimos 7 dias' },
	{ id: '30d', rotulo: 'Últimos 30 dias' },
	{ id: '12m', rotulo: 'Últimos 12 meses' },
	{ id: 'tudo', rotulo: 'Desde o começo' }
] as const;
export type Periodo = (typeof PERIODOS)[number]['id'];

/**
 * Sem período na URL, o painel abre em "Desde o começo": é o único que
 * mostra o histórico do Google Analytics, e um painel novo, ainda sem o
 * script instalado, abriria vazio em qualquer outro.
 */
export function lerPeriodo(v: string | null): Periodo {
	return PERIODOS.some((p) => p.id === v) ? (v as Periodo) : 'tudo';
}

/** Intervalo (AAAA-MM-DD, inclusivo) de um período terminando em `hoje`. */
export function intervalo(periodo: Periodo, hoje: string): { de: string; ate: string } {
	if (periodo === 'tudo') return { de: '2000-01-01', ate: hoje };
	const d = new Date(`${hoje}T12:00:00Z`);
	if (periodo === '7d') d.setUTCDate(d.getUTCDate() - 6);
	else if (periodo === '30d') d.setUTCDate(d.getUTCDate() - 29);
	else d.setUTCFullYear(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate() + 1);
	return { de: d.toISOString().slice(0, 10), ate: hoje };
}

/** Todos os dias do intervalo, para a linha do tempo não pular os dias sem visita. */
export function diasEntre(de: string, ate: string): string[] {
	const dias: string[] = [];
	const d = new Date(`${de}T12:00:00Z`);
	const fim = new Date(`${ate}T12:00:00Z`).getTime();
	while (d.getTime() <= fim && dias.length < 800) {
		dias.push(d.toISOString().slice(0, 10));
		d.setUTCDate(d.getUTCDate() + 1);
	}
	return dias;
}

// ---- Países ----------------------------------------------------------------

/**
 * Visitas por país (sigla ISO de 2 letras): as do script e, quando entram, as
 * do histórico do Google Analytics. No histórico, "visitas" é o "Usuários
 * ativos" do GA — o relatório importado não traz sessões por país.
 * Sem país ("(not set)" do GA, ou visita sem geolocalização) fica fora do mapa.
 */
export function visitasPorPais(
	vivo: ItemDimensao[] | undefined,
	historico: Pick<LinhaHistorico, 'pais' | 'usuarios'>[]
): Map<string, number> {
	const m = new Map<string, number>();
	const somar = (iso: string | null | undefined, n: number) => {
		const k = (iso ?? '').toUpperCase();
		if (!/^[A-Z]{2}$/.test(k) || !(n > 0)) return;
		m.set(k, (m.get(k) ?? 0) + n);
	};
	for (const i of vivo ?? []) somar(i.valor, i.visitas);
	for (const h of historico) somar(h.pais, h.usuarios);
	return m;
}

/** Os países em ordem de visitas, com a fatia de cada um no total. */
export function ranking(m: Map<string, number>): { iso: string; visitas: number; fatia: number }[] {
	const total = [...m.values()].reduce((s, n) => s + n, 0) || 1;
	return [...m.entries()]
		.map(([iso, visitas]) => ({ iso, visitas, fatia: visitas / total }))
		.sort((a, b) => b.visitas - a.visitas || a.iso.localeCompare(b.iso));
}

/**
 * Faixas de cor do mapa, em potências de 10. Uma escala linear não serviria: o
 * Brasil tem 96% das visitas e todo o resto sairia da mesma cor clara — e o
 * ponto do mapa é justamente ver ATÉ ONDE chegamos.
 */
export const FAIXAS = [
	{ min: 1, rotulo: '1–9' },
	{ min: 10, rotulo: '10–99' },
	{ min: 100, rotulo: '100–999' },
	{ min: 1_000, rotulo: '1 mil–9,9 mil' },
	{ min: 10_000, rotulo: '10 mil ou mais' }
] as const;

/** Índice da faixa (0–4) de um número de visitas; -1 = nenhuma visita. */
export function faixaDe(n: number): number {
	if (!(n >= 1)) return -1;
	for (let i = FAIXAS.length - 1; i >= 0; i--) if (n >= FAIXAS[i].min) return i;
	return 0;
}

let nomes: Intl.DisplayNames | null = null;

/** Nome do país em português ("BR" → "Brasil"). */
export function nomePais(iso: string): string {
	try {
		nomes ??= new Intl.DisplayNames(['pt-BR'], { type: 'region' });
		return nomes.of(iso.toUpperCase()) ?? iso;
	} catch {
		return iso;
	}
}

/** Bandeira em emoji ("BR" → 🇧🇷). No Windows aparece como as duas letras. */
export function bandeira(iso: string): string {
	const k = iso.toUpperCase();
	if (!/^[A-Z]{2}$/.test(k)) return '';
	return String.fromCodePoint(...[...k].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** 109087 → "109.087". */
export function numero(n: number): string {
	return new Intl.NumberFormat('pt-BR').format(n);
}

/** 0,9661 → "96,6%"; abaixo de 0,1%, "<0,1%". */
export function porcentagem(f: number): string {
	if (f > 0 && f < 0.001) return '<0,1%';
	return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(f);
}

// ---- Sites -----------------------------------------------------------------

/**
 * Domínio como o banco compara: sem protocolo, www, porta ou caminho.
 * "https://www.LojasMari.com.br/ofertas" → "lojasmari.com.br".
 */
export function limparDominio(v: string): string {
	return v
		.trim()
		.toLowerCase()
		.replace(/^[a-z]+:\/\//, '')
		.replace(/^www\./, '')
		.split(/[/?#:]/)[0]
		.replace(/\.$/, '');
}

/** O snippet que vai no <head> do site. */
export function snippet(origem: string, chave: string): string {
	return `<script defer src="${origem}/dm.js" data-site="${chave}"></script>`;
}

/** "agora há pouco", "há 3 h", "há 2 dias" — para o status do site. */
export function haQuanto(iso: string | null, agora = new Date()): string {
	if (!iso) return '';
	const min = Math.round((agora.getTime() - new Date(iso).getTime()) / 60_000);
	if (min < 2) return 'agora há pouco';
	if (min < 60) return `há ${min} min`;
	const h = Math.round(min / 60);
	if (h < 24) return `há ${h} h`;
	const d = Math.round(h / 24);
	return d === 1 ? 'ontem' : `há ${d} dias`;
}
