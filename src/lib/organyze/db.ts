// Organyze — acesso a dados no Supabase (tabela organyze_tarefas).
// RLS garante que cada usuário só enxerga/edita as próprias tarefas
// (user_id = auth.uid()); por isso não filtramos por usuário aqui.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tarefa } from './types';

function toTarefa(r: {
	id: string;
	titulo: string;
	concluida: boolean;
	data: string;
	posicao: number;
}): Tarefa {
	return {
		id: r.id,
		titulo: r.titulo,
		concluida: r.concluida,
		data: r.data,
		posicao: r.posicao
	};
}

/** Tarefas de um dia específico (yyyy-mm-dd), ordenadas por posição. */
export async function fetchByDay(supabase: SupabaseClient, data: string): Promise<Tarefa[]> {
	const { data: rows, error } = await supabase
		.from('organyze_tarefas')
		.select('id, titulo, concluida, data, posicao')
		.eq('data', data)
		.order('posicao', { ascending: true });
	if (error) throw error;
	return (rows ?? []).map(toTarefa);
}

export async function insertTarefa(supabase: SupabaseClient, t: Tarefa): Promise<void> {
	// user_id não é enviado — a coluna tem default auth.uid() no banco.
	const { error } = await supabase.from('organyze_tarefas').insert({
		id: t.id,
		titulo: t.titulo,
		concluida: t.concluida,
		data: t.data,
		posicao: t.posicao
	});
	if (error) throw error;
}

export async function updateTarefa(
	supabase: SupabaseClient,
	id: string,
	patch: Partial<Pick<Tarefa, 'titulo' | 'concluida' | 'posicao'>>
): Promise<void> {
	const row: Record<string, unknown> = {};
	if (patch.titulo !== undefined) row.titulo = patch.titulo;
	if (patch.concluida !== undefined) row.concluida = patch.concluida;
	if (patch.posicao !== undefined) row.posicao = patch.posicao;
	const { error } = await supabase.from('organyze_tarefas').update(row).eq('id', id);
	if (error) throw error;
}

export async function deleteTarefa(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('organyze_tarefas').delete().eq('id', id);
	if (error) throw error;
}
