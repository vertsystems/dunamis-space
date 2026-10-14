// DMetric — as regras do painel, sem I/O (testadas em painel.test.ts).

/** Um item de uma dimensão (país, página, origem…) já somado no período. */
export type ItemDimensao = {
	valor: string;
	visitas: number;
	visualizacoes: number;
	segundos?: number;
	/** Só em 'pagina': de qual site é ("/" de dois sites são páginas diferentes). */
	site_id?: string | null;
};

/** O que a função dmetric_painel devolve (migration 0072). */
export type PainelDados = {
	visitas: number;
	visualizacoes: number;
	/** Tempo de tela somado (só aba visível). Médio = segundos ÷ visitas. */
	segundos?: number;
	por_dia: { dia: string; visitas: number; visualizacoes: number }[];
	/** Dia da semana (0 = domingo) × hora (0–23), para os horários de pico. Não vem nos períodos de horas. */
	por_hora?: { dow: number; hora: number; visitas: number; visualizacoes: number }[];
	/** Só nos períodos de horas: a linha do tempo em degraus (5 min ou 1 h), já completa. */
	serie?: { momento: string; visitas: number; visualizacoes: number }[];
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
	/** Primeiro trecho do endereço (dnms.fun/lojasmari → "lojasmari"); vazio = a raiz. */
	caminho?: string;
	/** Título (document.title) da página principal do site. */
	titulo?: string | null;
	/** Renomeado à mão: o título não substitui o nome. */
	nome_manual?: boolean;
	/** Na raiz: todas as páginas do domínio contam nela. */
	juntar_paginas?: boolean;
	ultima_visita: string | null;
	created_at: string;
};

// ---- Período ---------------------------------------------------------------

export const PERIODOS = [
	{ id: '1h', rotulo: 'Última hora' },
	{ id: '24h', rotulo: 'Últimas 24 horas' },
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

/**
 * Períodos de horas: não saem dos contadores do dia, e sim da lista de acessos
 * recentes (dmetric_recentes, 48 h, migration 0077). `passo` é o degrau da
 * linha do tempo.
 */
export const RECENTES: Partial<Record<Periodo, { horas: number; passo: string }>> = {
	'1h': { horas: 1, passo: '5 minutes' },
	'24h': { horas: 24, passo: '1 hour' }
};

/** Intervalo (AAAA-MM-DD, inclusivo) de um período terminando em `hoje`. */
export function intervalo(periodo: Periodo, hoje: string): { de: string; ate: string } {
	if (periodo === 'tudo') return { de: '2000-01-01', ate: hoje };
	// Hora e 24 horas: o dia de hoje (e ontem, que as 24 horas atravessam).
	if (RECENTES[periodo]) {
		const ontem = new Date(`${hoje}T12:00:00Z`);
		ontem.setUTCDate(ontem.getUTCDate() - 1);
		return { de: ontem.toISOString().slice(0, 10), ate: hoje };
	}
	const d = new Date(`${hoje}T12:00:00Z`);
	if (periodo === '7d') d.setUTCDate(d.getUTCDate() - 6);
	else if (periodo === '30d') d.setUTCDate(d.getUTCDate() - 29);
	else d.setUTCFullYear(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate() + 1);
	return { de: d.toISOString().slice(0, 10), ate: hoje };
}

/**
 * Um ponto da linha do tempo, já com o rótulo que aparece no eixo e na dica.
 * `semDados`: dia de antes de o script começar a contar (não é "zero visitas").
 */
export type PontoSerie = { rotulo: string; visitas: number; visualizacoes: number; semDados?: boolean };

/** Quantos dias a linha do tempo mostra, no mínimo, em "desde o começo" e "12 meses". */
export const DIAS_MINIMOS_SERIE = 30;

/**
 * A linha do tempo dos períodos de dias: um ponto por dia, inclusive os sem
 * visita. "Desde o começo" começa no primeiro dia com visita, não em 2000 —
 * mas mostra pelo menos 30 dias, para o gráfico ter forma. Os dias de antes do
 * primeiro registro saem marcados `semDados`: o script ainda não contava, e
 * desenhar zero ali diria que ninguém visitou.
 */
export function serieDiaria(
	porDia: { dia: string; visitas: number; visualizacoes: number }[],
	de: string,
	ate: string
): PontoSerie[] {
	const primeiro = porDia[0]?.dia ?? ate;
	const minimo = new Date(`${ate}T12:00:00Z`);
	minimo.setUTCDate(minimo.getUTCDate() - (DIAS_MINIMOS_SERIE - 1));
	const minimoDia = minimo.toISOString().slice(0, 10);
	// Nunca antes do começo do período escolhido (7 dias continuam 7 dias).
	const inicio = [de, primeiro < minimoDia ? primeiro : minimoDia].sort().at(-1)!;
	const mapa = new Map(porDia.map((p) => [p.dia, p]));
	return diasEntre(inicio, ate).map((dia) => {
		const [, m, d] = dia.split('-');
		const p = mapa.get(dia);
		const ponto: PontoSerie = { rotulo: `${d}/${m}`, visitas: p?.visitas ?? 0, visualizacoes: p?.visualizacoes ?? 0 };
		if (dia < primeiro) ponto.semDados = true;
		return ponto;
	});
}

const horaBrasilia = new Intl.DateTimeFormat('pt-BR', {
	timeZone: 'America/Sao_Paulo',
	hour: '2-digit',
	minute: '2-digit'
});

/** A linha do tempo dos períodos de horas, com o horário de Brasília ("14:35"). */
export function serieRecente(serie: { momento: string; visitas: number; visualizacoes: number }[]): PontoSerie[] {
	return serie.map((p) => ({ rotulo: horaBrasilia.format(new Date(p.momento)), visitas: p.visitas, visualizacoes: p.visualizacoes }));
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
 * Uma cor por faixa, na ordem das FAIXAS, em tons pastel: azul, verde,
 * amarelo, marrom e bege (pedido do Bruno, 10/10/2026). Cinza fica só para
 * "sem visitas".
 *
 * Os tons exatos saíram de uma busca com o validador de paleta: entre os
 * pastéis dessas cinco famílias, a combinação em que todos os pares (e o
 * cinza) continuam distintos, para quem enxerga todas as cores e para quem não
 * distingue vermelho/verde. Por isso o verde é um pouco mais fundo e o amarelo
 * bem claro: na mesma claridade, verde, amarelo e bege se confundem. Em tons
 * pastel o contraste com o branco é baixo — o número de cada país também está
 * no ranking e na dica do mouse, nunca só na cor.
 */
export const CORES_FAIXAS = ['#79b0e8', '#69a275', '#fce16c', '#846047', '#ceb196'] as const;
export const COR_SEM_VISITA = '#eef1f5';

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
	/** Os períodos por extenso: "2025 e jan/2026 a out/2026". */
	rotulo: string;
	/** Só os anos, para onde o espaço é curto: "2025–2026". */
	anos: string;
} {
	const usuarios = linhas.reduce((s, l) => s + l.usuarios, 0);
	// País com 0 usuários no período (o GA lista quem só disparou evento) não conta.
	const paises = new Set(linhas.filter((l) => l.pais && l.usuarios > 0).map((l) => l.pais)).size;
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
	const primeiro = periodos[0]?.inicio.slice(0, 4) ?? '';
	const ultimo = periodos.reduce((m, p) => (p.fim > m ? p.fim : m), '').slice(0, 4);
	const anos = primeiro === ultimo ? primeiro : `${primeiro}–${ultimo}`;
	return { usuarios, paises, rotulo, anos };
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

// ---- Horários de pico ---------------------------------------------------------

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;

/**
 * A grade do mapa de horários: 7 dias × 24 horas de visitas, o maior valor (a
 * escala de cor sai dele), o horário de pico e o dia mais movimentado.
 */
export function gradeHorarios(porHora: { dow: number; hora: number; visitas: number }[]): {
	grade: number[][];
	maior: number;
	pico: { dow: number; hora: number; visitas: number } | null;
	melhorDia: { dow: number; visitas: number } | null;
	total: number;
} {
	const grade = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
	for (const p of porHora) {
		if (p.dow >= 0 && p.dow < 7 && p.hora >= 0 && p.hora < 24) grade[p.dow][p.hora] += p.visitas;
	}
	let maior = 0;
	let pico: { dow: number; hora: number; visitas: number } | null = null;
	grade.forEach((linha, dow) =>
		linha.forEach((v, hora) => {
			if (v > maior) {
				maior = v;
				pico = { dow, hora, visitas: v };
			}
		})
	);
	const porDia = grade.map((linha) => linha.reduce((s, v) => s + v, 0));
	const total = porDia.reduce((s, v) => s + v, 0);
	const dia = porDia.reduce((m, v, i) => (v > porDia[m] ? i : m), 0);
	return { grade, maior, pico, melhorDia: total ? { dow: dia, visitas: porDia[dia] } : null, total };
}

/**
 * Faixa de cor (0–5) de uma célula: 0 = nenhuma visita; 1 a 5 em proporção ao
 * maior horário do período (uma escala por período, para o pico ser sempre o
 * mais escuro).
 */
export function faixaHorario(v: number, maior: number): number {
	if (!(v > 0) || !(maior > 0)) return 0;
	return Math.min(5, Math.max(1, Math.ceil((v / maior) * 5)));
}

// ---- Páginas com baixo acesso --------------------------------------------------

/** Abaixo disto, em 30 dias, a página entra no alerta. */
export const LIMITE_BAIXO_ACESSO = 20;

export type PaginaBaixoAcesso = { site: DMetricSite; visitas: number; diasNoAr: number };

/**
 * Páginas (sites do DMetric) ativas com menos de LIMITE_BAIXO_ACESSO visitas
 * nos últimos 30 dias, da que menos recebeu para a que mais. Pausadas ficam
 * fora: pausar é dizer que não interessa.
 */
export function paginasComBaixoAcesso(
	sites: DMetricSite[],
	numeros30d: Pick<NumerosSite, 'site_id' | 'visitas'>[],
	agora = new Date(),
	limite = LIMITE_BAIXO_ACESSO
): PaginaBaixoAcesso[] {
	const por = new Map(numeros30d.map((n) => [n.site_id, n.visitas]));
	return sites
		.filter((s) => s.ativo)
		.map((site) => ({
			site,
			visitas: por.get(site.id) ?? 0,
			diasNoAr: site.created_at
				? Math.max(0, Math.floor((agora.getTime() - new Date(site.created_at).getTime()) / 86_400_000))
				: 30
		}))
		.filter((p) => p.visitas < limite)
		.sort((a, b) => a.visitas - b.visitas || a.site.nome.localeCompare(b.site.nome));
}

// ---- Agora no site --------------------------------------------------------------

/** Quem abriu uma página nos últimos 5 minutos (função dmetric_agora, 0080). */
export type AgoraDados = {
	pessoas: number;
	paises: { pais: string; pessoas: number }[];
	paginas: { site_id: string; caminho: string; pessoas: number }[];
	cidades: { cidade: string; pessoas: number }[];
};

export const AGORA_VAZIO: AgoraDados = { pessoas: 0, paises: [], paginas: [], cidades: [] };

// ---- Sites -----------------------------------------------------------------

/** Os números de um site no período (função dmetric_por_site, migration 0076). */
export type NumerosSite = {
	site_id: string;
	visitas: number;
	visualizacoes: number;
	segundos: number;
	cliques: number;
};

export type LinhaSite = {
	site: DMetricSite;
	visitas: number;
	visualizacoes: number;
	cliques: number;
	/** Páginas vistas por visita; 0 sem visita. */
	paginasPorVisita: number;
	/** Segundos de tela por visita; 0 sem visita. */
	tempoMedio: number;
};

/**
 * A lista de sites do painel, como a tabela do Google Analytics: em ordem de
 * páginas vistas, e o total no topo. Site sem nenhuma visita no período
 * continua na lista (no fim): sumir faria parecer que o código saiu dele.
 */
export function linhasDosSites(
	sites: DMetricSite[],
	numeros: NumerosSite[]
): { linhas: LinhaSite[]; total: Omit<LinhaSite, 'site'> } {
	const por = new Map(numeros.map((n) => [n.site_id, n]));
	const linha = (v: number, pv: number, s: number, c: number) => ({
		visitas: v,
		visualizacoes: pv,
		cliques: c,
		paginasPorVisita: v ? pv / v : 0,
		tempoMedio: v ? s / v : 0
	});
	const linhas = sites
		.map((site) => {
			const n = por.get(site.id);
			return { site, ...linha(n?.visitas ?? 0, n?.visualizacoes ?? 0, Number(n?.segundos ?? 0), n?.cliques ?? 0) };
		})
		.sort((a, b) => b.visualizacoes - a.visualizacoes || b.visitas - a.visitas || a.site.nome.localeCompare(b.site.nome));
	const soma = (k: 'visitas' | 'visualizacoes' | 'cliques') => numeros.reduce((t, n) => t + (n[k] ?? 0), 0);
	const segundos = numeros.reduce((t, n) => t + Number(n.segundos ?? 0), 0);
	return { linhas, total: linha(soma('visitas'), soma('visualizacoes'), segundos, soma('cliques')) };
}

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

/** "dnms.fun/lojasmari" — o domínio e, se houver, a página que faz o site. */
export function enderecoDoSite(s: Pick<DMetricSite, 'dominio' | 'caminho'>): string {
	return (s.dominio ?? '') + (s.caminho ? `/${s.caminho}` : '');
}

/**
 * O nome que aparece: o que alguém deu à mão; senão o título da página
 * ("Lojas Mari® | PageLinks – DCo™"); senão o endereço.
 */
export function nomeDoSite(s: Pick<DMetricSite, 'nome' | 'nome_manual' | 'titulo' | 'dominio' | 'caminho'>): string {
	if (s.nome_manual) return s.nome;
	return s.titulo || enderecoDoSite(s) || s.nome;
}

/**
 * Endereço completo de uma página da lista: o domínio do site e o caminho
 * ("dnms.fun/lojasmari/promo"). A raiz de um domínio fica só o domínio.
 */
export function enderecoDaPagina(site: Pick<DMetricSite, 'dominio'> | undefined, caminho: string): string {
	const c = caminho === '/' ? '' : caminho;
	return site?.dominio ? site.dominio + c : caminho;
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
