// Organyze — acesso a dados no Supabase.
// Tarefas ficam em organyze_tarefas (por colaborador); os perfis exibidos na tela
// de seleção vêm de `colaboradores` (ativos). RLS libera para qualquer autenticado
// (quadro de equipe compartilhado).

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	Colaborador,
	DiaStatus,
	Habito,
	Meta,
	Prioridade,
	Status,
	Subtarefa,
	Tarefa
} from './types';

function toTarefa(r: {
	id: string;
	colaborador_id: string;
	titulo: string;
	status: string | null;
	concluida: boolean | null;
	data: string;
	posicao: number;
	prioridade: string;
	prazo: string | null;
	descricao: string | null;
	subtarefas: Subtarefa[] | null;
}): Tarefa {
	// Fallback: se `status` ainda estiver nulo, deriva do antigo `concluida`.
	const status = (r.status as Status) ?? (r.concluida ? 'concluida' : 'em_execucao');
	return {
		id: r.id,
		colaboradorId: r.colaborador_id,
		titulo: r.titulo,
		status,
		data: r.data,
		posicao: r.posicao,
		prioridade: (r.prioridade as Prioridade) ?? 'media',
		prazo: r.prazo ?? null,
		descricao: r.descricao ?? '',
		subtarefas: Array.isArray(r.subtarefas) ? r.subtarefas : []
	};
}

/** Colaboradores ativos, para a tela de seleção de perfil. */
export async function fetchColaboradores(supabase: SupabaseClient): Promise<Colaborador[]> {
	const { data, error } = await supabase
		.from('colaboradores')
		.select('id, nome, avatar_url, funcao')
		.eq('ativo', true)
		.order('nome', { ascending: true });
	if (error) throw error;
	return (data ?? []).map((c) => ({
		id: c.id,
		nome: c.nome,
		avatarUrl: c.avatar_url ?? null,
		funcao: c.funcao ?? null
	}));
}

/**
 * Rollover: joga tarefas ainda não concluídas de dias anteriores para `hoje`.
 * Assim, o que não foi feito "cai" automaticamente para o dia seguinte (acumulando
 * até hoje). Chamado antes de carregar as tarefas de hoje.
 */
export async function rolarPendentesParaHoje(
	supabase: SupabaseClient,
	colaboradorId: string,
	hoje: string
): Promise<void> {
	const { error } = await supabase
		.from('organyze_tarefas')
		.update({ data: hoje })
		.eq('colaborador_id', colaboradorId)
		.neq('status', 'concluida')
		.lt('data', hoje);
	if (error) throw error;
}

const COLUNAS =
	'id, colaborador_id, titulo, status, concluida, data, posicao, prioridade, prazo, descricao, subtarefas';

/** Tarefas de um colaborador num dia (yyyy-mm-dd), ordenadas por posição. */
export async function fetchByColaboradorDia(
	supabase: SupabaseClient,
	colaboradorId: string,
	data: string
): Promise<Tarefa[]> {
	return fetchByColaboradorRange(supabase, colaboradorId, data, data);
}

/** Tarefas de um colaborador num intervalo de datas [start, end] (inclusive). */
export async function fetchByColaboradorRange(
	supabase: SupabaseClient,
	colaboradorId: string,
	start: string,
	end: string
): Promise<Tarefa[]> {
	const { data: rows, error } = await supabase
		.from('organyze_tarefas')
		.select(COLUNAS)
		.eq('colaborador_id', colaboradorId)
		.gte('data', start)
		.lte('data', end)
		.order('data', { ascending: true })
		.order('posicao', { ascending: true });
	if (error) throw error;
	return (rows ?? []).map(toTarefa);
}

export async function insertTarefa(supabase: SupabaseClient, t: Tarefa): Promise<void> {
	// user_id não é enviado — tem default auth.uid() no banco (auditoria).
	// concluida é mantido em sincronia com status por compatibilidade.
	const { error } = await supabase.from('organyze_tarefas').insert({
		id: t.id,
		colaborador_id: t.colaboradorId,
		titulo: t.titulo,
		status: t.status,
		concluida: t.status === 'concluida',
		data: t.data,
		posicao: t.posicao,
		prioridade: t.prioridade,
		prazo: t.prazo,
		descricao: t.descricao,
		subtarefas: t.subtarefas
	});
	if (error) throw error;
}

export async function updateTarefa(
	supabase: SupabaseClient,
	id: string,
	patch: Partial<
		Pick<Tarefa, 'titulo' | 'status' | 'posicao' | 'prioridade' | 'prazo' | 'descricao' | 'subtarefas'>
	>
): Promise<void> {
	const row: Record<string, unknown> = {};
	if (patch.titulo !== undefined) row.titulo = patch.titulo;
	if (patch.status !== undefined) {
		row.status = patch.status;
		row.concluida = patch.status === 'concluida';
	}
	if (patch.posicao !== undefined) row.posicao = patch.posicao;
	if (patch.prioridade !== undefined) row.prioridade = patch.prioridade;
	if (patch.prazo !== undefined) row.prazo = patch.prazo;
	if (patch.descricao !== undefined) row.descricao = patch.descricao;
	if (patch.subtarefas !== undefined) row.subtarefas = patch.subtarefas;
	const { error } = await supabase.from('organyze_tarefas').update(row).eq('id', id);
	if (error) throw error;
}

/** Atualiza a posição (e opcionalmente o status) de várias tarefas. */
export async function updatePosicoes(
	supabase: SupabaseClient,
	ordem: { id: string; posicao: number; status?: Status }[]
): Promise<void> {
	const results = await Promise.all(
		ordem.map(({ id, posicao, status }) => {
			const row: Record<string, unknown> = { posicao };
			if (status !== undefined) {
				row.status = status;
				row.concluida = status === 'concluida';
			}
			return supabase.from('organyze_tarefas').update(row).eq('id', id);
		})
	);
	const err = results.find((r) => r.error)?.error;
	if (err) throw err;
}

export async function deleteTarefa(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('organyze_tarefas').delete().eq('id', id);
	if (error) throw error;
}

// ---- Metas do Mês --------------------------------------------------------

function toMeta(r: {
	id: string;
	colaborador_id: string;
	mes: string;
	titulo: string;
	alvo: number;
	atual: number;
	unidade: string | null;
	posicao: number;
}): Meta {
	return {
		id: r.id,
		colaboradorId: r.colaborador_id,
		mes: r.mes,
		titulo: r.titulo,
		alvo: r.alvo,
		atual: r.atual,
		unidade: r.unidade ?? '',
		posicao: r.posicao
	};
}

export async function fetchMetas(
	supabase: SupabaseClient,
	colaboradorId: string,
	mes: string
): Promise<Meta[]> {
	const { data, error } = await supabase
		.from('organyze_metas')
		.select('id, colaborador_id, mes, titulo, alvo, atual, unidade, posicao')
		.eq('colaborador_id', colaboradorId)
		.eq('mes', mes)
		.order('posicao', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(toMeta);
}

export async function insertMeta(supabase: SupabaseClient, m: Meta): Promise<void> {
	const { error } = await supabase.from('organyze_metas').insert({
		id: m.id,
		colaborador_id: m.colaboradorId,
		mes: m.mes,
		titulo: m.titulo,
		alvo: m.alvo,
		atual: m.atual,
		unidade: m.unidade,
		posicao: m.posicao
	});
	if (error) throw error;
}

export async function updateMeta(
	supabase: SupabaseClient,
	id: string,
	patch: Partial<Pick<Meta, 'titulo' | 'alvo' | 'atual' | 'unidade' | 'posicao'>>
): Promise<void> {
	const { error } = await supabase.from('organyze_metas').update(patch).eq('id', id);
	if (error) throw error;
}

export async function deleteMeta(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('organyze_metas').delete().eq('id', id);
	if (error) throw error;
}

// ---- Habit Tracker -------------------------------------------------------

function toHabito(r: {
	id: string;
	colaborador_id: string;
	mes: string;
	nome: string;
	dias: Record<string, DiaStatus> | null;
	posicao: number;
}): Habito {
	return {
		id: r.id,
		colaboradorId: r.colaborador_id,
		mes: r.mes,
		nome: r.nome,
		dias: r.dias ?? {},
		posicao: r.posicao
	};
}

export async function fetchHabitos(
	supabase: SupabaseClient,
	colaboradorId: string,
	mes: string
): Promise<Habito[]> {
	const { data, error } = await supabase
		.from('organyze_habitos')
		.select('id, colaborador_id, mes, nome, dias, posicao')
		.eq('colaborador_id', colaboradorId)
		.eq('mes', mes)
		.order('posicao', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(toHabito);
}

export async function insertHabito(supabase: SupabaseClient, h: Habito): Promise<void> {
	const { error } = await supabase.from('organyze_habitos').insert({
		id: h.id,
		colaborador_id: h.colaboradorId,
		mes: h.mes,
		nome: h.nome,
		dias: h.dias,
		posicao: h.posicao
	});
	if (error) throw error;
}

export async function updateHabito(
	supabase: SupabaseClient,
	id: string,
	patch: Partial<Pick<Habito, 'nome' | 'dias' | 'posicao'>>
): Promise<void> {
	const { error } = await supabase.from('organyze_habitos').update(patch).eq('id', id);
	if (error) throw error;
}

export async function deleteHabito(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('organyze_habitos').delete().eq('id', id);
	if (error) throw error;
}
