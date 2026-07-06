// Organyze — acesso a dados no Supabase.
// Tarefas ficam em organyze_tarefas (por colaborador); os perfis exibidos na tela
// de seleção vêm de `colaboradores` (ativos). RLS libera para qualquer autenticado
// (quadro de equipe compartilhado).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Colaborador, Prioridade, Tarefa } from './types';

function toTarefa(r: {
	id: string;
	colaborador_id: string;
	titulo: string;
	concluida: boolean;
	data: string;
	posicao: number;
	prioridade: string;
	prazo: string | null;
}): Tarefa {
	return {
		id: r.id,
		colaboradorId: r.colaborador_id,
		titulo: r.titulo,
		concluida: r.concluida,
		data: r.data,
		posicao: r.posicao,
		prioridade: (r.prioridade as Prioridade) ?? 'media',
		prazo: r.prazo ?? null
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
 * Rollover: joga tarefas NÃO concluídas de dias anteriores para `hoje`.
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
		.eq('concluida', false)
		.lt('data', hoje);
	if (error) throw error;
}

/** Tarefas de um colaborador num dia (yyyy-mm-dd), ordenadas por posição. */
export async function fetchByColaboradorDia(
	supabase: SupabaseClient,
	colaboradorId: string,
	data: string
): Promise<Tarefa[]> {
	const { data: rows, error } = await supabase
		.from('organyze_tarefas')
		.select('id, colaborador_id, titulo, concluida, data, posicao, prioridade, prazo')
		.eq('colaborador_id', colaboradorId)
		.eq('data', data)
		.order('posicao', { ascending: true });
	if (error) throw error;
	return (rows ?? []).map(toTarefa);
}

export async function insertTarefa(supabase: SupabaseClient, t: Tarefa): Promise<void> {
	// user_id não é enviado — tem default auth.uid() no banco (auditoria).
	const { error } = await supabase.from('organyze_tarefas').insert({
		id: t.id,
		colaborador_id: t.colaboradorId,
		titulo: t.titulo,
		concluida: t.concluida,
		data: t.data,
		posicao: t.posicao,
		prioridade: t.prioridade,
		prazo: t.prazo
	});
	if (error) throw error;
}

export async function updateTarefa(
	supabase: SupabaseClient,
	id: string,
	patch: Partial<Pick<Tarefa, 'titulo' | 'concluida' | 'posicao' | 'prioridade' | 'prazo'>>
): Promise<void> {
	const row: Record<string, unknown> = {};
	if (patch.titulo !== undefined) row.titulo = patch.titulo;
	if (patch.concluida !== undefined) row.concluida = patch.concluida;
	if (patch.posicao !== undefined) row.posicao = patch.posicao;
	if (patch.prioridade !== undefined) row.prioridade = patch.prioridade;
	if (patch.prazo !== undefined) row.prazo = patch.prazo;
	const { error } = await supabase.from('organyze_tarefas').update(row).eq('id', id);
	if (error) throw error;
}

/** Atualiza a posição de várias tarefas (reordenação). */
export async function updatePosicoes(
	supabase: SupabaseClient,
	ordem: { id: string; posicao: number }[]
): Promise<void> {
	const results = await Promise.all(
		ordem.map(({ id, posicao }) =>
			supabase.from('organyze_tarefas').update({ posicao }).eq('id', id)
		)
	);
	const err = results.find((r) => r.error)?.error;
	if (err) throw err;
}

export async function deleteTarefa(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('organyze_tarefas').delete().eq('id', id);
	if (error) throw error;
}
