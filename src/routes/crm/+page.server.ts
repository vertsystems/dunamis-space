import { fail } from '@sveltejs/kit';
import { exigirPermissao } from '$lib/server/permissao';
import { acoesNaPagina } from '$lib/server/crud';
import { crmAtividades, crmContatos } from '$lib/server/recursos';
import { carregarCrm } from '$lib/server/crm';
import { negocioFromForm } from '$lib/crm';
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

export const load: PageServerLoad = ({ locals: { supabase }, url }) => carregarCrm(supabase, url);

// ------------------------------------------------------------
// Helpers de action
// ------------------------------------------------------------
function idDe(fd: FormData, campo = 'id'): string | null {
	const v = fd.get(campo);
	return typeof v === 'string' && v ? v : null;
}

const contatos = acoesNaPagina(crmContatos);
const atividades = acoesNaPagina(crmAtividades);

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

	// ---------------- Contatos e atividades ----------------
	// CRUD comum: a fábrica cuida de permissão, validação e mensagens.
	contato_criar: contatos.criar,
	contato_atualizar: contatos.atualizar,
	contato_excluir: contatos.excluir,

	atividade_criar: atividades.criar,
	atividade_excluir: atividades.excluir,

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
	}
};
