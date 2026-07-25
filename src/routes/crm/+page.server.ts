import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { um } from '$lib/db';
import { fail } from '@sveltejs/kit';
import { exigirPermissao } from '$lib/server/permissao';
import {
	contatoFromForm,
	negocioFromForm,
	atividadeFromForm,
	type Negocio,
	type Contato,
	type Atividade,
	type Stage,
	type Pipeline,
	type Meta
} from '$lib/crm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mesRefSP } from '$lib/datas';
import type { Actions, PageServerLoad } from './$types';

/**
 * Contato rápido no form de negócio: se nenhum contato foi escolhido mas um nome
 * novo foi digitado (`novo_contato_nome`), cria o contato só com o nome e usa o id.
 * Retorna uma mensagem de erro (string) ou null em caso de sucesso.
 */
async function resolverContatoRapido(
	supabase: SupabaseClient,
	fd: FormData,
	v: { contato_id: string | null }
): Promise<string | null> {
	if (v.contato_id) return null;
	const nome = (fd.get('novo_contato_nome') as string | null)?.trim();
	if (!nome) return null;
	const { data, error } = await supabase
		.from('crm_contatos')
		.insert({ nome })
		.select('id')
		.single();
	if (error) return error.message;
	v.contato_id = data?.id ?? null;
	return null;
}

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	// "Mês corrente" no fuso do negócio (Brasil), não no fuso do servidor (Vercel = UTC),
	// para bater com o mês local do cliente na virada do mês. Fonte única propagada ao client.
	const partesBR = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Sao_Paulo',
		year: 'numeric',
		month: 'numeric'
	}).formatToParts(new Date());
	const mesRef = {
		ano: Number(partesBR.find((p) => p.type === 'year')?.value),
		mes: Number(partesBR.find((p) => p.type === 'month')?.value)
	};

	// Funis primeiro — serve também para detectar migration não aplicada.
	const { data: pipelinesRaw, error: pErr } = await supabase
		.from('crm_pipelines')
		.select('id, nome, ordem')
		.eq('ativo', true)
		.order('ordem', { ascending: true });

	if (pErr) {
		const crmPendente = /crm_|does not exist|schema cache|relation/i.test(pErr.message);
		return {
			crmPendente,
			loadError: pErr.message,
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
	}

	const pipelines = (pipelinesRaw ?? []).map((p) => ({
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
			.select(
				'id, titulo, valor, status, stage_id, pipeline_id, ordem, previsao_fechamento, motivo_perda, observacoes, ganho_em, perdido_em, created_at, contato_id, responsavel_id, contato:crm_contatos(id, nome, empresa), responsavel:colaboradores(id, nome)'
			)
			.order('ordem', { ascending: true })
			.order('created_at', { ascending: false }),
		supabase
			.from('crm_contatos')
			.select(
				'id, nome, empresa, cargo, email, telefone, whatsapp, instagram, site, origem, segmento, tags, observacoes, cliente_id, created_at, responsavel_id, responsavel:colaboradores(id, nome), negocios:crm_negocios(id, valor, status)'
			)
			.order('created_at', { ascending: false }),
		supabase
			.from('crm_atividades')
			.select(
				'id, tipo, titulo, descricao, data_hora, concluida, concluida_em, created_at, negocio_id, contato_id, responsavel_id, negocio:crm_negocios(id, titulo), contato:crm_contatos(id, nome), responsavel:colaboradores(id, nome)'
			)
			.order('data_hora', { ascending: true, nullsFirst: false }),
		colaboradoresAtivos(supabase),
		clientesLite(supabase)
	]);

	const stages = (stagesRes.data ?? []).map((s) => ({
		id: s.id as string,
		pipeline_id: s.pipeline_id as string,
		nome: s.nome as string,
		ordem: s.ordem as number,
		cor: s.cor as string,
		probabilidade: s.probabilidade as number
	}));
	// Próxima atividade pendente por negócio (menor data_hora entre pendentes com data).
	const proxPorNegocio = new Map<string, string>();
	for (const a of atividadesRes.data ?? []) {
		if (a.concluida || !a.data_hora || !a.negocio_id) continue;
		const atual = proxPorNegocio.get(a.negocio_id as string);
		if (!atual || (a.data_hora as string) < atual) {
			proxPorNegocio.set(a.negocio_id as string, a.data_hora as string);
		}
	}

	const negocios: Negocio[] = (negociosRes.data ?? []).map((n) => {
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
			prox_atividade: proxPorNegocio.get(n.id as string) ?? null
		};
	});

	const contatos: Contato[] = (contatosRes.data ?? []).map((c) => {
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

	const atividades: Atividade[] = (atividadesRes.data ?? []).map((a) => {
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
	const metasErroReal = metasErr && !metasPendente ? metasErr.message : null;
	const metas: Meta[] = metasErr
		? []
		: (metasRaw ?? []).map((m) => ({
				colaborador_id: m.colaborador_id as string,
				valor_meta: Number(m.valor_meta ?? 0)
			}));

	return {
		crmPendente: false,
		loadError: metasErroReal as string | null,
		pipelines,
		stages,
		pipelineAtivoId,
		negocios,
		contatos,
		atividades,
		colaboradores: (colabRes.data ?? []) as { id: string; nome: string }[],
		clientes: (clientesRes.data ?? []) as { id: string; nome: string }[],
		metas,
		metasPendente,
		mesRef
	};
};

// ------------------------------------------------------------
// Helpers de action
// ------------------------------------------------------------
function idDe(fd: FormData, campo = 'id'): string | null {
	const v = fd.get(campo);
	return typeof v === 'string' && v ? v : null;
}

export const actions: Actions = {
	// ---------------- Negócios ----------------
	negocio_criar: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const v = negocioFromForm(fd);
		if (!v.titulo) return fail(400, { error: 'O título do negócio é obrigatório.' });

		// Contato rápido: se digitou um nome novo (sem escolher existente), cria o
		// contato só com o nome — pode ser completado depois na aba Contatos.
		const contatoErr = await resolverContatoRapido(supabase, fd, v);
		if (contatoErr) return fail(500, { error: contatoErr });

		// Resolve funil/etapa padrão quando não informados.
		let pipeline_id = v.pipeline_id;
		let stage_id = v.stage_id;
		if (!pipeline_id) {
			const { data: p } = await supabase
				.from('crm_pipelines')
				.select('id')
				.eq('ativo', true)
				.order('ordem')
				.limit(1)
				.maybeSingle();
			pipeline_id = p?.id ?? null;
		}
		if (!pipeline_id) return fail(400, { error: 'Nenhum funil configurado.' });
		if (!stage_id) {
			const { data: s } = await supabase
				.from('crm_stages')
				.select('id')
				.eq('pipeline_id', pipeline_id)
				.order('ordem')
				.limit(1)
				.maybeSingle();
			stage_id = s?.id ?? null;
		}

		// ordem = fim da coluna de destino.
		const { data: ult } = await supabase
			.from('crm_negocios')
			.select('ordem')
			.eq('stage_id', stage_id)
			.order('ordem', { ascending: false })
			.limit(1)
			.maybeSingle();
		const ordem = (ult?.ordem ?? -1) + 1;

		const { data, error } = await supabase
			.from('crm_negocios')
			.insert({
				titulo: v.titulo,
				contato_id: v.contato_id,
				pipeline_id,
				stage_id,
				valor: v.valor,
				previsao_fechamento: v.previsao_fechamento,
				responsavel_id: v.responsavel_id,
				observacoes: v.observacoes,
				ordem
			})
			.select('id')
			.single();
		if (error) return fail(500, { error: error.message });
		return { saved: true, id: data?.id ?? null };
	},

	negocio_atualizar: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Negócio inválido.' });
		const v = negocioFromForm(fd);
		if (!v.titulo) return fail(400, { error: 'O título do negócio é obrigatório.' });
		const contatoErr = await resolverContatoRapido(supabase, fd, v);
		if (contatoErr) return fail(500, { error: contatoErr });
		const { error } = await supabase
			.from('crm_negocios')
			.update({
				titulo: v.titulo,
				contato_id: v.contato_id,
				stage_id: v.stage_id,
				valor: v.valor,
				previsao_fechamento: v.previsao_fechamento,
				responsavel_id: v.responsavel_id,
				observacoes: v.observacoes,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	// Move + reordena: recebe id, stage_id e a ordem final de ids da coluna de destino.
	negocio_mover: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = idDe(fd);
		const stage_id = idDe(fd, 'stage_id');
		if (!id || !stage_id) return fail(400, { error: 'Dados inválidos.' });
		const idsRaw = fd.get('ids');
		const ids =
			typeof idsRaw === 'string' && idsRaw
				? idsRaw.split(',').filter(Boolean)
				: [id];

		// Garante que o card movido está na coluna de destino.
		const { error: e1 } = await supabase
			.from('crm_negocios')
			.update({ stage_id, updated_at: new Date().toISOString() })
			.eq('id', id);
		if (e1) return fail(500, { error: e1.message });

		// Renumera a coluna de destino conforme a ordem enviada pelo cliente.
		// Escopo por stage_id: ids de outras colunas (estado stale/concorrência) são ignorados.
		const updates = ids.map((nid, i) =>
			supabase.from('crm_negocios').update({ ordem: i }).eq('id', nid).eq('stage_id', stage_id)
		);
		const res = await Promise.all(updates);
		const erro = res.find((r) => r.error)?.error;
		if (erro) return fail(500, { error: erro.message });
		return { ok: true };
	},

	negocio_status: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = idDe(fd);
		const status = fd.get('status');
		if (!id || (status !== 'aberto' && status !== 'ganho' && status !== 'perdido')) {
			return fail(400, { error: 'Dados inválidos.' });
		}
		const agora = new Date().toISOString();
		const patch: Record<string, unknown> = { status, updated_at: agora };
		if (status === 'ganho') {
			patch.ganho_em = agora;
			patch.perdido_em = null;
			patch.motivo_perda = null;
		} else if (status === 'perdido') {
			patch.perdido_em = agora;
			patch.ganho_em = null;
			patch.motivo_perda =
				typeof fd.get('motivo_perda') === 'string' && (fd.get('motivo_perda') as string).trim()
					? (fd.get('motivo_perda') as string).trim()
					: null;
		} else {
			patch.ganho_em = null;
			patch.perdido_em = null;
			patch.motivo_perda = null;
		}
		const { error } = await supabase.from('crm_negocios').update(patch).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	negocio_excluir: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'excluir');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Negócio inválido.' });
		const { error } = await supabase.from('crm_negocios').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	},

	// ---------------- Metas (comercial) ----------------
	meta_definir: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const colaborador_id = idDe(fd, 'colaborador_id');
		if (!colaborador_id) return fail(400, { error: 'Colaborador inválido.' });
		const raw = fd.get('valor_meta');
		const valor_meta = typeof raw === 'string' && raw.trim() ? Number(raw) : 0;
		if (!Number.isFinite(valor_meta) || valor_meta < 0) {
			return fail(400, { error: 'Valor de meta inválido.' });
		}
		// Mesmo fuso do load (linhas ~46-56). Com `new Date()` cru, definir a meta
		// no fim do mês à noite gravava no mês seguinte e ela sumia da tela.
		const { ano, mes } = mesRefSP();
		const { error } = await supabase.from('crm_metas').upsert(
			{ colaborador_id, ano, mes, valor_meta },
			{ onConflict: 'colaborador_id,ano,mes' }
		);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	// ---------------- Contatos ----------------
	contato_criar: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const v = contatoFromForm(fd);
		if (!v.nome) return fail(400, { error: 'O nome do contato é obrigatório.' });
		const { data, error } = await supabase.from('crm_contatos').insert(v).select('id').single();
		if (error) return fail(500, { error: error.message });
		return { saved: true, id: data?.id ?? null };
	},

	contato_atualizar: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Contato inválido.' });
		const v = contatoFromForm(fd);
		if (!v.nome) return fail(400, { error: 'O nome do contato é obrigatório.' });
		const { error } = await supabase
			.from('crm_contatos')
			.update({ ...v, updated_at: new Date().toISOString() })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	contato_excluir: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'excluir');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Contato inválido.' });
		const { error } = await supabase.from('crm_contatos').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	},

	// ---------------- Atividades ----------------
	atividade_criar: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const v = atividadeFromForm(fd);
		if (!v.titulo && v.tipo !== 'nota') {
			return fail(400, { error: 'Descreva a atividade.' });
		}
		if (!v.negocio_id && !v.contato_id && !v.titulo) {
			return fail(400, { error: 'Dados insuficientes.' });
		}
		const { data, error } = await supabase
			.from('crm_atividades')
			.insert(v)
			.select('id')
			.single();
		if (error) return fail(500, { error: error.message });
		return { saved: true, id: data?.id ?? null };
	},

	atividade_concluir: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'editar');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Atividade inválida.' });
		const concluida = fd.get('concluida') === 'true';
		const { error } = await supabase
			.from('crm_atividades')
			.update({
				concluida,
				concluida_em: concluida ? new Date().toISOString() : null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},

	atividade_excluir: async ({ request, locals }) => {
		exigirPermissao(locals, 'crm', 'excluir');
		const { supabase } = locals;
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Atividade inválida.' });
		const { error } = await supabase.from('crm_atividades').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
