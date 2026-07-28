import { um } from '$lib/db';
import { celulasMes, chaveDia, parseMes, mesAnterior, mesSeguinte } from '$lib/calendario';
import { nomesDeCampanha } from '$lib/server/conteudo';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 'backlog' e 'aprovacoes' vieram das telas de /conteudo, que foram absorvidas
// aqui: o Calendário Editorial é o único lugar de trabalho de conteúdo agora.
type View = 'mes' | 'semana' | 'lista' | 'backlog' | 'aprovacoes';
const VIEWS: View[] = ['mes', 'semana', 'lista', 'backlog', 'aprovacoes'];
/** Visões que não são grade de datas — não precisam das queries de janela. */
const PAINEIS: View[] = ['backlog', 'aprovacoes'];

const TZ = 'America/Sao_Paulo';
const fmtDia = new Intl.DateTimeFormat('en-CA', {
	timeZone: TZ,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});
const fmtHora = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

function parseData(s: string | null): Date | null {
	if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
	const [a, m, d] = s.split('-').map(Number);
	return new Date(a, m - 1, d);
}

/** "Hoje" no fuso de negócio (SP) — o runtime pode ser UTC (Vercel). */
function hojeSP(): Date {
	const p = fmtDia.formatToParts(new Date());
	const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
	return new Date(g('year'), g('month') - 1, g('day'));
}

/**
 * Carrega os dados do calendário de conteúdos (conteúdos + tarefas + campanhas)
 * para o período pedido em `url` (?view/?mes/?semana). Usado na página
 * /calendario e embutido no perfil do cliente. `opts.clienteFixo` fixa o
 * calendário a um cliente (esconde o filtro na UI).
 */
export async function carregarCalendario(
	supabase: App.Locals['supabase'],
	url: URL,
	opts?: { clienteFixo?: string }
) {
	const viewParam = url.searchParams.get('view');
	const view: View = VIEWS.includes(viewParam as View) ? (viewParam as View) : 'mes';
	const raw = url.searchParams.get('cliente') || '';
	const clienteFiltro = opts?.clienteFixo ?? (UUID_RE.test(raw) ? raw : '');
	const ehPainel = PAINEIS.includes(view);
	// Status do filtro da aba Aprovações (?aprov=pendente|todas|...).
	const aprovStatus = url.searchParams.get('aprov') ?? 'pendente';

	// Janela [início, fim] (dias locais, fim inclusivo) conforme a visão.
	let janelaIni: Date;
	let janelaFim: Date;
	let ano: number;
	let mes: number;
	let semanaInicio = '';

	if (view === 'semana') {
		const semParam = parseData(url.searchParams.get('semana'));
		let inicio: Date;
		if (semParam) {
			inicio = semParam;
		} else {
			const h = hojeSP();
			inicio = new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1);
		}
		janelaIni = inicio;
		janelaFim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
		semanaInicio = chaveDia(inicio);
		ano = inicio.getFullYear();
		mes = inicio.getMonth();
	} else {
		const h = hojeSP();
		const base = parseMes(url.searchParams.get('mes')) ?? { ano: h.getFullYear(), mes: h.getMonth() };
		ano = base.ano;
		mes = base.mes;
		if (view === 'lista') {
			janelaIni = new Date(ano, mes, 1);
			janelaFim = new Date(ano, mes + 1, 0);
		} else {
			const cels = celulasMes(ano, mes);
			janelaIni = cels[0];
			janelaFim = cels[cels.length - 1];
		}
	}

	const DIA = 86_400_000;
	const gteISO = new Date(
		Date.UTC(janelaIni.getFullYear(), janelaIni.getMonth(), janelaIni.getDate()) - DIA
	).toISOString();
	const ltISO = new Date(
		Date.UTC(janelaFim.getFullYear(), janelaFim.getMonth(), janelaFim.getDate() + 1) + DIA
	).toISOString();
	const dataIni = chaveDia(janelaIni);
	const dataFim = chaveDia(janelaFim);

	let qConteudos = supabase
		.from('conteudos')
		.select(
			'id, titulo, tipo, tipos, status, data_publicacao, legenda, arte_url, redes, publicado_manual, cliente_id, projeto_id, responsavel_id, campanha, cliente:clientes(nome)'
		)
		.not('data_publicacao', 'is', null)
		.gte('data_publicacao', gteISO)
		.lt('data_publicacao', ltISO)
		.order('data_publicacao', { ascending: true });
	if (clienteFiltro) qConteudos = qConteudos.eq('cliente_id', clienteFiltro);

	const qTarefas = supabase
		.from('tarefas')
		.select('id, titulo, status, prazo, projeto:projetos(nome, cliente_id, cliente:clientes(nome))')
		.not('prazo', 'is', null)
		.gte('prazo', dataIni)
		.lte('prazo', dataFim)
		.order('prazo', { ascending: true });

	let qCampanhas = supabase
		.from('campanhas')
		.select('id, nome, data_inicio, data_fim, cliente:clientes(nome)')
		.not('data_inicio', 'is', null)
		.not('data_fim', 'is', null)
		.lte('data_inicio', dataFim)
		.gte('data_fim', dataIni)
		.order('data_inicio', { ascending: true });
	if (clienteFiltro) qCampanhas = qCampanhas.eq('cliente_id', clienteFiltro);

	// Backlog: conteúdos ainda sem data — a fila de programação.
	let qSemData = supabase
		.from('conteudos')
		.select('id, titulo, tipo, tipos, status, cliente_id, projeto_id, responsavel_id, legenda, arte_url, redes, campanha, cliente:clientes(nome)')
		.is('data_publicacao', null)
		.order('created_at', { ascending: false })
		.limit(100);
	if (clienteFiltro) qSemData = qSemData.eq('cliente_id', clienteFiltro);

	let qAprov = supabase
		.from('aprovacoes')
		.select('id, status, data_envio, data_resposta, comentario_cliente, token_publico, conteudo:conteudos(id, titulo, tipo, cliente:clientes(nome))')
		.order('data_envio', { ascending: false })
		.limit(200);
	if (aprovStatus && aprovStatus !== 'todas') qAprov = qAprov.eq('status', aprovStatus);

	const vazio = Promise.resolve({ data: [] as any[], error: null });
	const [
		{ data: clientes, error: errCli },
		{ data: projetos },
		{ data: colaboradores },
		{ data: conteudosRaw, error: errCon },
		{ data: tarefasRaw, error: errTar },
		{ data: campanhasRaw, error: errCamp },
		{ data: semDataRaw, error: errSem },
		{ data: aprovRaw, error: errAprov }
	] = await Promise.all([
		supabase.from('clientes').select('id, nome').order('nome'),
		supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
		supabase.from('colaboradores').select('id, nome, avatar_url, funcao, funcoes').eq('ativo', true).order('nome'),
		// As três queries de janela não fazem sentido nas abas de painel.
		ehPainel ? vazio : qConteudos,
		ehPainel ? vazio : qTarefas,
		ehPainel ? vazio : qCampanhas,
		view === 'backlog' ? qSemData : vazio,
		view === 'aprovacoes' ? qAprov : vazio
	]);

	// Dia/hora pré-formatados no fuso de SP (evita divergência SSR × cliente).
	const conteudos = (conteudosRaw ?? []).map((c) => ({
		id: c.id as string,
		titulo: c.titulo as string | null,
		tipo: c.tipo as string,
		tipos: (c.tipos as string[] | null) ?? [],
		status: c.status as string,
		dia: fmtDia.format(new Date(c.data_publicacao as string)),
		hora: fmtHora.format(new Date(c.data_publicacao as string)),
		cliente_nome: um<{ nome: string }>(c.cliente)?.nome ?? null,
		data_publicacao: c.data_publicacao as string,
		legenda: (c.legenda as string | null) ?? null,
		arte_url: (c.arte_url as string | null) ?? null,
		redes: (c.redes as string[] | null) ?? [],
		publicado_manual: !!c.publicado_manual,
		cliente_id: (c.cliente_id as string | null) ?? null,
		projeto_id: (c.projeto_id as string | null) ?? null,
		responsavel_id: (c.responsavel_id as string | null) ?? null,
		campanha: (c.campanha as string | null) ?? null
	}));

	// Nomes de campanha já usados (todas, não só do mês) p/ autocomplete no form.
	const campanhasNomes = await nomesDeCampanha(supabase);

	let tarefas = (tarefasRaw ?? []).map((t) => {
		const projeto = um<{
			nome: string;
			cliente_id: string;
			cliente: { nome: string } | { nome: string }[] | null;
		}>(t.projeto);
		return {
			id: t.id as string,
			titulo: t.titulo as string,
			status: t.status as string,
			prazo: t.prazo as string,
			cliente_id: projeto?.cliente_id ?? null,
			cliente_nome: um<{ nome: string }>(projeto?.cliente)?.nome ?? null
		};
	});
	if (clienteFiltro) tarefas = tarefas.filter((t) => t.cliente_id === clienteFiltro);

	const campanhas = (campanhasRaw ?? []).map((c) => ({
		id: c.id as string,
		nome: c.nome as string,
		data_inicio: c.data_inicio as string,
		data_fim: c.data_fim as string,
		cliente_nome: um<{ nome: string }>(c.cliente)?.nome ?? null
	}));

	const semData = (semDataRaw ?? []).map((c) => ({
		id: c.id as string,
		titulo: (c.titulo as string | null) ?? null,
		tipo: c.tipo as string,
		tipos: (c.tipos as string[] | null) ?? [],
		status: c.status as string,
		cliente_id: (c.cliente_id as string | null) ?? null,
		projeto_id: (c.projeto_id as string | null) ?? null,
		responsavel_id: (c.responsavel_id as string | null) ?? null,
		legenda: (c.legenda as string | null) ?? null,
		arte_url: (c.arte_url as string | null) ?? null,
		redes: (c.redes as string[] | null) ?? [],
		campanha: (c.campanha as string | null) ?? null,
		cliente_nome: um<{ nome: string }>(c.cliente)?.nome ?? null
	}));

	type CliRel = { nome: string } | { nome: string }[] | null;
	const aprovacoes = (aprovRaw ?? []).map((a) => {
		const c = um<{ id: string; titulo: string | null; tipo: string; cliente: CliRel }>(a.conteudo);
		return {
			id: a.id as string,
			status: a.status as string,
			data_envio: (a.data_envio as string | null) ?? null,
			data_resposta: (a.data_resposta as string | null) ?? null,
			comentario_cliente: (a.comentario_cliente as string | null) ?? null,
			token_publico: a.token_publico as string,
			conteudo_id: c?.id ?? null,
			conteudo_titulo: c?.titulo ?? null,
			conteudo_tipo: c?.tipo ?? null,
			cliente_nome: um<{ nome: string }>(c?.cliente)?.nome ?? null
		};
	});

	return {
		view,
		aprovStatus,
		semData,
		aprovacoes,
		ano,
		mes,
		semanaInicio,
		hojeKey: chaveDia(hojeSP()),
		prev: mesAnterior(ano, mes),
		next: mesSeguinte(ano, mes),
		clienteFiltro,
		clientes: clientes ?? [],
		projetos: projetos ?? [],
		colaboradores: colaboradores ?? [],
		conteudos,
		tarefas,
		campanhas,
		campanhasNomes,
		loadError: (errCli ?? errCon ?? errTar ?? errCamp ?? errSem ?? errAprov)?.message ?? null
	};
}
