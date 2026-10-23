// DMetric — o portal do cliente (o link /relatorio/<token>, 0094) e a mensagem
// do relatório mensal pelo WhatsApp. Sem I/O (testado em portal.test.ts).
import { nomeDoSite, numero, porcentagem, rotuloMes, somarDias, type DMetricSite, type PainelDados } from './painel';
import { textoVariacao, variacao } from './recorte';
import type { Conversao } from './resultados';

// ---- O link ---------------------------------------------------------------------

/** Os períodos de um link: "livre" deixa o cliente escolher; os outros travam. */
export const PERIODOS_PORTAL = [
	{ id: 'livre', rotulo: 'O cliente escolhe' },
	{ id: 'mes_passado', rotulo: 'Sempre o mês passado' },
	{ id: 'este_mes', rotulo: 'Sempre este mês' },
	{ id: '30d', rotulo: 'Sempre os últimos 30 dias' },
	{ id: '7d', rotulo: 'Sempre os últimos 7 dias' }
] as const;
export type PeriodoPortal = (typeof PERIODOS_PORTAL)[number]['id'];
export const lerPeriodoPortal = (v: unknown): PeriodoPortal =>
	PERIODOS_PORTAL.some((p) => p.id === v) ? (v as PeriodoPortal) : 'livre';

/** Um link do cliente, como o app lê (o hash da senha nunca vem). */
export type Portal = {
	id: string;
	site_id: string;
	token: string;
	contato: string | null;
	com_senha: boolean;
	periodo: PeriodoPortal;
	ativo: boolean;
	whatsapp: string | null;
	relatorio_mensal: boolean;
	acessos: number;
	ultimo_acesso: string | null;
	criado_em: string;
};

/** O segredo do endereço: 24 caracteres sorteados (letras, números, "-" e "_"). */
export function novoToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * O endereço que vai para o cliente: sempre o domínio da Dunamis. O cron roda
 * no endereço interno da Vercel (*.vercel.app), que pede login da Vercel — um
 * link de lá não abre para o cliente (visto no primeiro teste, 23/10/2026).
 * Rodando na máquina, o endereço local.
 */
export const ORIGEM_DO_PORTAL = 'https://dspace.verts.me';
export const origemDoPortal = (url: URL) => (/^(localhost|127\.0\.0\.1)$/.test(url.hostname) ? url.origin : ORIGEM_DO_PORTAL);

/** O endereço do link. Com mês (o do relatório), ele abre naquele mês — se o link não travar o período. */
export function linkDoPortal(origem: string, token: string, mes?: string | null): string {
	return `${origem}/relatorio/${token}${mes ? `?mes=${mes}` : ''}`;
}

/**
 * O período que o cliente pediu na URL: ?mes=AAAA-MM (um mês inteiro) ou
 * ?p=7d|30d|12m|este_mes|mes_passado. Vira o par de dias que vai para o banco
 * (que confere de novo, e ignora quando o link trava o período).
 */
export function periodoPedido(busca: URLSearchParams, hoje: string): { de: string; ate: string; id: string } | null {
	const mes = busca.get('mes');
	if (mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) && mes <= hoje.slice(0, 7)) {
		const [a, m] = mes.split('-').map(Number);
		const ultimo = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
		return { de: `${mes}-01`, ate: ultimo < hoje ? ultimo : hoje, id: `mes:${mes}` };
	}
	const p = busca.get('p');
	const inicioMes = `${hoje.slice(0, 7)}-01`;
	if (p === '7d') return { de: somarDias(hoje, -6), ate: hoje, id: p };
	if (p === '30d') return { de: somarDias(hoje, -29), ate: hoje, id: p };
	if (p === '12m') return { de: somarDias(hoje, -364), ate: hoje, id: p };
	if (p === 'este_mes') return { de: inicioMes, ate: hoje, id: p };
	if (p === 'mes_passado') return { de: `${somarDias(inicioMes, -1).slice(0, 7)}-01`, ate: somarDias(inicioMes, -1), id: p };
	return null;
}

/** Os botões de período do portal livre. */
export const ESCOLHAS_DO_PORTAL = [
	{ p: '7d', rotulo: '7 dias' },
	{ p: '30d', rotulo: '30 dias' },
	{ p: 'este_mes', rotulo: 'Este mês' },
	{ p: 'mes_passado', rotulo: 'Mês passado' },
	{ p: '12m', rotulo: '12 meses' }
] as const;

// ---- O que a página pública recebe (dmetric_portal_dados) ------------------------------

export type ResumoPeriodo = { visitas: number; visualizacoes: number; segundos: number; cliques: number };

export type PortalDados = {
	prova: string | null;
	periodo: PeriodoPortal;
	travado: boolean;
	de: string;
	ate: string;
	primeiro_dia: string | null;
	site: Pick<DMetricSite, 'id' | 'nome' | 'nome_manual' | 'titulo' | 'dominio' | 'caminho'>;
	painel: PainelDados;
	por_dia: { dia: string; visitas: number; visualizacoes: number }[];
	lugares: { paises: { pais: string; visitas: number; visualizacoes: number }[]; cidades: { cidade: string; pais: string | null; visitas: number; visualizacoes: number }[] };
	titulos: { caminho: string; titulo: string }[];
	metas: string[];
	conversao: Conversao;
	anterior: ResumoPeriodo;
	anterior_de: string;
};

// ---- A mensagem do mês --------------------------------------------------------------------

/** O que o banco entrega por link para o relatório do mês (dmetric_relatorios_dados). */
export type DadosDoRelatorio = {
	portal_id: string;
	token: string;
	contato: string | null;
	whatsapp: string;
	periodo: PeriodoPortal;
	site: Pick<DMetricSite, 'id' | 'nome' | 'nome_manual' | 'titulo' | 'dominio' | 'caminho'>;
	primeiro_dia: string | null;
	numeros: ResumoPeriodo;
	anterior: ResumoPeriodo;
	origens: { valor: string; visitas: number }[];
	conversao: Conversao;
};

/** "2026-10" → "outubro" (o mês por extenso, sem o ano). */
export const nomeDoMes = (mes: string) => rotuloMes(mes.slice(0, 7)).replace(/ de \d{4}$/, '');

/**
 * A mensagem do mês para o WhatsApp do cliente: o resumo em poucas linhas e o
 * link do relatório completo. Só entra o que tem número de verdade — a variação,
 * quando o mês anterior foi contado inteiro; os resultados, quando houve; o
 * botão campeão, nas páginas do PageLinks. Quem revisa pode mudar antes de enviar.
 */
export function mensagemDoRelatorio(
	d: DadosDoRelatorio,
	mes: string,
	link: string,
	botaoCampeao: { nome: string; cliques: number } | null = null
): string {
	const n = d.numeros;
	const mesAnterior = `${somarDias(`${mes.slice(0, 7)}-01`, -1).slice(0, 7)}`;
	// O mês anterior conta se o DMetric já contava antes dele começar.
	const comparavel = !!d.primeiro_dia && d.primeiro_dia < `${mesAnterior}-01` && d.anterior.visitas > 0;
	const v = comparavel ? variacao(n.visitas, d.anterior.visitas) : null;
	const ehPagina = (d.site.dominio ?? '').toLowerCase() === 'dnms.fun';
	const linhas: string[] = [];
	linhas.push(d.contato?.trim() ? `Olá, ${d.contato.trim()}!` : 'Olá!');
	linhas.push(`Aqui está o resumo de ${nomeDoMes(mes)} ${ehPagina ? 'da sua página' : 'do seu site'} ${nomeDoSite(d.site)}:`);
	linhas.push('');
	linhas.push(
		`• ${numero(n.visitas)} ${n.visitas === 1 ? 'visita' : 'visitas'}` +
			(v !== null ? ` (${textoVariacao(v)} em relação a ${nomeDoMes(mesAnterior)})` : '')
	);
	if (n.visualizacoes > n.visitas) linhas.push(`• ${numero(n.visualizacoes)} páginas vistas`);
	const c = d.conversao;
	if (c.visitas > 0 && c.converteram > 0)
		linhas.push(
			`• ${numero(c.converteram)} ${c.converteram === 1 ? 'visita virou' : 'visitas viraram'} contato (${c.metas
				.slice(0, 3)
				.map((m) => m.valor)
				.join(', ')}): ${porcentagem(c.converteram / c.visitas)} das visitas`
		);
	else if (n.cliques > 0) linhas.push(`• ${numero(n.cliques)} ${n.cliques === 1 ? 'clique' : 'cliques'} em WhatsApp, links e botões`);
	const total = d.origens.reduce((t, o) => t + o.visitas, 0);
	const lider = d.origens[0];
	if (lider && n.visitas > 0)
		linhas.push(`• Quem mais trouxe gente: ${lider.valor} (${porcentagem(lider.visitas / Math.max(n.visitas, total))} das visitas)`);
	if (botaoCampeao && botaoCampeao.cliques > 0)
		linhas.push(`• Botão mais clicado: ${botaoCampeao.nome} (${numero(botaoCampeao.cliques)} ${botaoCampeao.cliques === 1 ? 'clique' : 'cliques'})`);
	linhas.push('');
	linhas.push(`Veja o relatório completo: ${link}`);
	linhas.push('');
	linhas.push('Dunamis Company');
	return linhas.join('\n');
}

/** O link wa.me com a mensagem pronta (o WhatsApp abre a conversa com o texto escrito). */
export function linkDaMensagem(whatsapp: string, mensagem: string): string {
	return `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}`;
}
