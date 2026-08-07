/**
 * Carregamento da tela do CRM.
 *
 * Era o `load` de 200 linhas do `+page.server.ts` — quase tudo tradução de
 * linha do PostgREST para o objeto tipado que a tela consome. Aqui isso fica
 * separado das actions, e cada mapeamento pode ser lido (e mexido) sozinho.
 */
import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { um } from '$lib/db';
import { mesRefSP } from '$lib/datas';
import type { Atividade, Contato, Meta, Negocio, Pipeline, Stage } from '$lib/crm';

type Supa = App.Locals['supabase'];
// Linha crua do PostgREST: o client não tem o schema como generic, então cada
// campo chega sem tipo e é o mapeamento abaixo que dá forma a ele.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

const COLS_NEGOCIOS =
	'id, titulo, valor, status, stage_id, pipeline_id, ordem, previsao_fechamento, motivo_perda, observacoes, ganho_em, perdido_em, created_at, contato_id, responsavel_id, contato:crm_contatos(id, nome, empresa), responsavel:colaboradores(id, nome)';

const COLS_CONTATOS =
	'id, nome, empresa, cargo, email, telefone, whatsapp, instagram, site, origem, segmento, tags, observacoes, cliente_id, created_at, responsavel_id, responsavel:colaboradores(id, nome), negocios:crm_negocios(id, valor, status)';

const COLS_ATIVIDADES =
	'id, tipo, titulo, descricao, data_hora, concluida, concluida_em, created_at, negocio_id, contato_id, responsavel_id, negocio:crm_negocios(id, titulo), contato:crm_contatos(id, nome), responsavel:colaboradores(id, nome)';

/** Erro de tabela/coluna inexistente → migration do CRM ainda não aplicada. */
const CRM_PENDENTE_RX = /crm_|does not exist|schema cache|relation/i;

/** Próxima atividade pendente de cada negócio (a menor data_hora ainda aberta). */
function proximaAtividadePorNegocio(atividades: Linha[]): Map<string, string> {
	const mapa = new Map<string, string>();
	for (const a of atividades) {
		if (a.concluida || !a.data_hora || !a.negocio_id) continue;
		const atual = mapa.get(a.negocio_id as string);
		if (!atual || (a.data_hora as string) < atual) {
			mapa.set(a.negocio_id as string, a.data_hora as string);
		}
	}
	return mapa;
}

function mapStages(linhas: Linha[]): Stage[] {
	return linhas.map((s) => ({
		id: s.id as string,
		pipeline_id: s.pipeline_id as string,
		nome: s.nome as string,
		ordem: s.ordem as number,
		cor: s.cor as string,
		probabilidade: s.probabilidade as number
	}));
}

function mapNegocios(linhas: Linha[], proxima: Map<string, string>): Negocio[] {
	return linhas.map((n) => {
		const contato = um<{ id: string; nome: string; empresa: string | null }>(n.contato);
		const resp = um<{ id: string; nome: string }>(n.responsavel);
		return {
			id: n.id as string,
			titulo: n.titulo as string,
			valor: Number(n.valor ?? 0),
			status: n.status as Negocio['status'],
			stage_id: (n.stage_id as string | null) ?? null,
			pipeline_id: n.pipeline_id as string,
			ordem: Number(n.ordem ?? 0),
			previsao_fechamento: (n.previsao_fechamento as string | null) ?? null,
			motivo_perda: (n.motivo_perda as string | null) ?? null,
			observacoes: (n.observacoes as string | null) ?? null,
			ganho_em: (n.ganho_em as string | null) ?? null,
			perdido_em: (n.perdido_em as string | null) ?? null,
			created_at: n.created_at as string,
			contato_id: (n.contato_id as string | null) ?? null,
			contato_nome: contato?.nome ?? null,
			contato_empresa: contato?.empresa ?? null,
			responsavel_id: (n.responsavel_id as string | null) ?? null,
			responsavel_nome: resp?.nome ?? null,
			prox_atividade: proxima.get(n.id as string) ?? null
		};
	});
}

function mapContatos(linhas: Linha[]): Contato[] {
	return linhas.map((c) => {
		const resp = um<{ id: string; nome: string }>(c.responsavel);
		const negs = (c.negocios ?? []) as { id: string; valor: number; status: string }[];
		return {
			id: c.id as string,
			nome: c.nome as string,
			empresa: (c.empresa as string | null) ?? null,
			cargo: (c.cargo as string | null) ?? null,
			email: (c.email as string | null) ?? null,
			telefone: (c.telefone as string | null) ?? null,
			whatsapp: (c.whatsapp as string | null) ?? null,
			instagram: (c.instagram as string | null) ?? null,
			site: (c.site as string | null) ?? null,
			origem: (c.origem as string | null) ?? null,
			segmento: (c.segmento as string | null) ?? null,
			tags: (c.tags as string[] | null) ?? [],
			observacoes: (c.observacoes as string | null) ?? null,
			cliente_id: (c.cliente_id as string | null) ?? null,
			created_at: c.created_at as string,
			responsavel_id: (c.responsavel_id as string | null) ?? null,
			responsavel_nome: resp?.nome ?? null,
			negocios_qtd: negs.length,
			valor_total: negs.reduce((s, x) => s + Number(x.valor ?? 0), 0)
		};
	});
}

function mapAtividades(linhas: Linha[]): Atividade[] {
	return linhas.map((a) => {
		const neg = um<{ id: string; titulo: string }>(a.negocio);
		const cont = um<{ id: string; nome: string }>(a.contato);
		const resp = um<{ id: string; nome: string }>(a.responsavel);
		return {
			id: a.id as string,
			tipo: a.tipo as Atividade['tipo'],
			titulo: (a.titulo as string | null) ?? null,
			descricao: (a.descricao as string | null) ?? null,
			data_hora: (a.data_hora as string | null) ?? null,
			concluida: !!a.concluida,
			concluida_em: (a.concluida_em as string | null) ?? null,
			created_at: a.created_at as string,
			negocio_id: (a.negocio_id as string | null) ?? null,
			negocio_titulo: neg?.titulo ?? null,
			contato_id: (a.contato_id as string | null) ?? null,
			contato_nome: cont?.nome ?? null,
			responsavel_id: (a.responsavel_id as string | null) ?? null,
			responsavel_nome: resp?.nome ?? null
		};
	});
}

/** Tudo o que a tela do CRM precisa, já no formato que ela consome. */
export async function carregarCrm(supabase: Supa, url: URL) {
	// Mês corrente no fuso do negócio (Brasil), não no do servidor (Vercel = UTC):
	// na virada do mês os dois discordam. Mesma fonte usada pela action de metas.
	const mesRef = mesRefSP();

	const vazio = {
		pipelines: [] as Pipeline[],
		stages: [] as Stage[],
		pipelineAtivoId: null as string | null,
		negocios: [] as Negocio[],
		contatos: [] as Contato[],
		atividades: [] as Atividade[],
		colaboradores: [] as { id: string; nome: string }[],
		clientes: [] as { id: string; nome: string }[],
		metas: [] as Meta[],
		metasPendente: false,
		mesRef
	};

	// Funis primeiro — serve também para detectar migration não aplicada.
	const { data: pipelinesRaw, error: pErr } = await supabase
		.from('crm_pipelines')
		.select('id, nome, ordem')
		.eq('ativo', true)
		.order('ordem', { ascending: true });

	if (pErr) {
		return {
			...vazio,
			crmPendente: CRM_PENDENTE_RX.test(pErr.message),
			loadError: pErr.message as string | null
		};
	}

	const pipelines: Pipeline[] = (pipelinesRaw ?? []).map((p) => ({
		id: p.id as string,
		nome: p.nome as string,
		ordem: p.ordem as number
	}));
	const pedido = url.searchParams.get('pipeline');
	const pipelineAtivoId = pipelines.find((p) => p.id === pedido)?.id ?? pipelines[0]?.id ?? null;

	const [stagesRes, negociosRes, contatosRes, atividadesRes, colabRes, clientesRes] =
		await Promise.all([
			supabase
				.from('crm_stages')
				.select('id, pipeline_id, nome, ordem, cor, probabilidade')
				.order('ordem', { ascending: true }),
			supabase
				.from('crm_negocios')
				.select(COLS_NEGOCIOS)
				.order('ordem', { ascending: true })
				.order('created_at', { ascending: false }),
			supabase.from('crm_contatos').select(COLS_CONTATOS).order('created_at', { ascending: false }),
			supabase
				.from('crm_atividades')
				.select(COLS_ATIVIDADES)
				.order('data_hora', { ascending: true, nullsFirst: false }),
			colaboradoresAtivos(supabase),
			clientesLite(supabase)
		]);

	const linhasAtividades = (atividadesRes.data ?? []) as Linha[];

	// Metas do mês corrente (tabela nova — degrada se a migration 0007 não foi aplicada).
	const { data: metasRaw, error: metasErr } = await supabase
		.from('crm_metas')
		.select('colaborador_id, valor_meta')
		.eq('ano', mesRef.ano)
		.eq('mes', mesRef.mes);
	// Tabela ausente (migration 0007 não aplicada): PostgREST 'PGRST205' ou mensagem
	// de schema-cache/inexistência. Só isso é "pendente"; outros erros são reais e sobem.
	const metasPendente =
		!!metasErr &&
		(metasErr.code === 'PGRST205' ||
			/schema cache|does not exist|could not find the table/i.test(metasErr.message ?? ''));

	return {
		crmPendente: false,
		loadError: (metasErr && !metasPendente ? metasErr.message : null) as string | null,
		pipelines,
		stages: mapStages((stagesRes.data ?? []) as Linha[]),
		pipelineAtivoId,
		negocios: mapNegocios(
			(negociosRes.data ?? []) as Linha[],
			proximaAtividadePorNegocio(linhasAtividades)
		),
		contatos: mapContatos((contatosRes.data ?? []) as Linha[]),
		atividades: mapAtividades(linhasAtividades),
		colaboradores: (colabRes.data ?? []) as { id: string; nome: string }[],
		clientes: (clientesRes.data ?? []) as { id: string; nome: string }[],
		metas: (metasErr
			? []
			: (metasRaw ?? []).map((m) => ({
					colaborador_id: m.colaborador_id as string,
					valor_meta: Number(m.valor_meta ?? 0)
				}))) as Meta[],
		metasPendente,
		mesRef
	};
}
