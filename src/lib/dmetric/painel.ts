// DMetric — as regras do painel, sem I/O (testadas em painel.test.ts).

/** Um item de uma dimensão (país, página, origem…) já somado no período. */
export type ItemDimensao = { valor: string; visitas: number; visualizacoes: number; segundos?: number };

/** O que a função dmetric_painel devolve (migration 0072). */
export type PainelDados = {
	visitas: number;
	visualizacoes: number;
	/** Tempo de tela somado (só aba visível). Médio = segundos ÷ visitas. */
	segundos?: number;
	por_dia: { dia: string; visitas: number; visualizacoes: number }[];
	dimensoes: Partial<Record<Dimensao, ItemDimensao[]>>;
};

export type Dimensao =
	| 'pais'
	| 'cidade'
	| 'pagina'
	| 'origem'
	| 'campanha'
	| 'clique'
	| 'dispositivo'
	| 'navegador'
	| 'sistema';

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
	/** Criado sozinho pela primeira visita (código único). */
	automatico?: boolean;
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

/**
 * Uma cor por faixa, na ordem das FAIXAS: azul cobalto, roxo, verde, laranja e
 * marrom (pedido do Bruno, 10/10/2026 — antes era um azul só, do claro ao
 * escuro). Cinza fica só para "sem visitas".
 *
 * Validadas como paleta (separação para daltonismo e entre vizinhas, com todos
 * os pares em jogo, como num mapa): o roxo é claro e o cobalto fundo porque, na
 * mesma claridade, os dois se confundem para quem não distingue vermelho.
 * Laranja e roxo têm pouco contraste com o branco — por isso o número de cada
 * país também está no ranking, e não só na cor.
 */
export const CORES_FAIXAS = ['#2048c8', '#b57af0', '#139a46', '#ef9a1e', '#9a3f10'] as const;
export const COR_SEM_VISITA = '#e2e6ee';

/** Cor de um número de visitas. */
export function corDeVisitas(n: number): string {
	const f = faixaDe(n);
	return f < 0 ? COR_SEM_VISITA : CORES_FAIXAS[f];
}

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

/**
 * O histórico importado, resumido: total, países (sem repetir o país que
 * aparece em mais de um período) e o rótulo dos períodos — "2025", "2025 e
 * 2026", ou com mês quando o período não é o ano inteiro.
 *
 * Somar usuários de dois relatórios do GA conta duas vezes quem visitou nos
 * dois períodos: o GA só tira repetição dentro de um mesmo relatório.
 */
export function resumirHistorico(linhas: Pick<LinhaHistorico, 'inicio' | 'fim' | 'pais' | 'usuarios'>[]): {
	usuarios: number;
	paises: number;
	rotulo: string;
} {
	const usuarios = linhas.reduce((s, l) => s + l.usuarios, 0);
	const paises = new Set(linhas.filter((l) => l.pais).map((l) => l.pais)).size;
	const periodos = [...new Map(linhas.map((l) => [`${l.inicio}|${l.fim}`, l])).values()].sort((a, b) =>
		a.inicio.localeCompare(b.inicio)
	);
	const mes = (iso: string) => {
		const [a, m] = iso.split('-').map(Number);
		return `${new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}/${a}`;
	};
	const umPeriodo = (p: { inicio: string; fim: string }) => {
		const anoInteiro = p.inicio.endsWith('-01-01') && p.fim.endsWith('-12-31') && p.inicio.slice(0, 4) === p.fim.slice(0, 4);
		return anoInteiro ? p.inicio.slice(0, 4) : `${mes(p.inicio)} a ${mes(p.fim)}`;
	};
	const partes = periodos.map(umPeriodo);
	const rotulo = partes.length <= 1 ? (partes[0] ?? '') : `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`;
	return { usuarios, paises, rotulo };
}

/** 72 → "1 min 12 s"; 3720 → "1 h 2 min". */
export function duracao(segundos: number): string {
	const s = Math.round(segundos);
	if (!(s > 0)) return '0 s';
	if (s < 60) return `${s} s`;
	if (s < 3600) {
		const m = Math.floor(s / 60);
		const r = s % 60;
		return r ? `${m} min ${r} s` : `${m} min`;
	}
	const h = Math.floor(s / 3600);
	const m = Math.round((s % 3600) / 60);
	return m ? `${h} h ${m} min` : `${h} h`;
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

/** O código que vai no <head> do site — o mesmo para todos (o site sai do domínio). */
export function snippet(origem: string): string {
	return `<script defer src="${origem}/dm.js"></script>`;
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
