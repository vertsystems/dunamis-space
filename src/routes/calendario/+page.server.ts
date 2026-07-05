import { um } from '$lib/db';
import { celulasMes, chaveDia, parseMes, mesAnterior, mesSeguinte } from '$lib/calendario';
import type { PageServerLoad } from './$types';

type View = 'mes' | 'semana' | 'lista';
const VIEWS: View[] = ['mes', 'semana', 'lista'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
	const viewParam = url.searchParams.get('view');
	const view: View = VIEWS.includes(viewParam as View) ? (viewParam as View) : 'mes';
	const raw = url.searchParams.get('cliente') || '';
	const clienteFiltro = UUID_RE.test(raw) ? raw : '';

	// Janela [início, fim] (dias locais, fim inclusivo) conforme a visão.
	let janelaIni: Date;
	let janelaFim: Date;
	let ano: number;
	let mes: number;
	let semanaInicio = '';

	if (view === 'semana') {
		const ref = parseData(url.searchParams.get('semana')) ?? hojeSP();
		const dom = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay());
		janelaIni = dom;
		janelaFim = new Date(dom.getFullYear(), dom.getMonth(), dom.getDate() + 6);
		semanaInicio = chaveDia(dom);
		ano = dom.getFullYear();
		mes = dom.getMonth();
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
		.select('id, titulo, tipo, status, data_publicacao, cliente:clientes(nome)')
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

	const [
		{ data: clientes, error: errCli },
		{ data: projetos },
		{ data: colaboradores },
		{ data: conteudosRaw, error: errCon },
		{ data: tarefasRaw, error: errTar },
		{ data: campanhasRaw, error: errCamp }
	] = await Promise.all([
		supabase.from('clientes').select('id, nome').order('nome'),
		supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
		supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome'),
		qConteudos,
		qTarefas,
		qCampanhas
	]);

	// Dia/hora pré-formatados no fuso de SP (evita divergência SSR × cliente).
	const conteudos = (conteudosRaw ?? []).map((c) => ({
		id: c.id as string,
		titulo: c.titulo as string | null,
		tipo: c.tipo as string,
		status: c.status as string,
		dia: fmtDia.format(new Date(c.data_publicacao as string)),
		hora: fmtHora.format(new Date(c.data_publicacao as string)),
		cliente_nome: um<{ nome: string }>(c.cliente)?.nome ?? null
	}));

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

	return {
		view,
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
		loadError: (errCli ?? errCon ?? errTar ?? errCamp)?.message ?? null
	};
};
