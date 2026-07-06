// Organyze — store de estado (Svelte 5 runes) com persistência no Supabase.
// Mostra as tarefas de um dia (por padrão hoje). Mutations otimistas: a UI
// atualiza na hora e persiste em segundo plano, com rollback + toast se falhar.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tarefa } from './types';
import { toast } from '$lib/toast.svelte';
import * as db from './db';

function uid(): string {
	return crypto.randomUUID();
}

/** Data local (yyyy-mm-dd) sem escorregar de fuso, ao contrário de toISOString(). */
export function toISODate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function hoje(): string {
	return toISODate(new Date());
}

class OrganyzeStore {
	supabase: SupabaseClient | null = null;
	#ready = false;

	loading = $state(true);
	error = $state<string | null>(null);

	/** Dia atualmente visível (yyyy-mm-dd). */
	dia = $state<string>(hoje());
	tarefas = $state<Tarefa[]>([]);

	// ---- Derivados ---------------------------------------------------------
	total = $derived(this.tarefas.length);
	concluidas = $derived(this.tarefas.filter((t) => t.concluida).length);
	pendentes = $derived(this.total - this.concluidas);
	tudoFeito = $derived(this.total > 0 && this.pendentes === 0);

	get ehHoje(): boolean {
		return this.dia === hoje();
	}

	// ---- Ciclo de vida -----------------------------------------------------
	async init(supabase: SupabaseClient) {
		if (this.#ready) return;
		this.#ready = true;
		this.supabase = supabase;
		await this.load();
	}

	async load() {
		if (!this.supabase) return;
		this.loading = true;
		this.error = null;
		try {
			this.tarefas = await db.fetchByDay(this.supabase, this.dia);
		} catch (e) {
			console.error('[organyze] load', e);
			this.error = 'Não foi possível carregar as tarefas. Tente atualizar a página.';
		} finally {
			this.loading = false;
		}
	}

	/** Troca o dia visível e recarrega as tarefas. */
	async setDia(dia: string) {
		this.dia = dia;
		await this.load();
	}

	async irParaHoje() {
		if (!this.ehHoje) await this.setDia(hoje());
	}

	async passarDia(delta: number) {
		const [y, m, d] = this.dia.split('-').map(Number);
		const base = new Date(y, m - 1, d);
		base.setDate(base.getDate() + delta);
		await this.setDia(toISODate(base));
	}

	/** Executa a persistência em segundo plano; reverte + avisa se falhar. */
	#persist(action: () => Promise<void>, rollback: () => void, errMsg: string) {
		if (!this.supabase) return;
		action().catch((e) => {
			console.error('[organyze]', errMsg, e);
			rollback();
			toast.error(errMsg);
		});
	}

	// ---- Tarefas -----------------------------------------------------------
	addTarefa(titulo: string): Tarefa | null {
		const trimmed = titulo.trim();
		if (!trimmed) return null;
		const posicao = this.tarefas.length
			? Math.max(...this.tarefas.map((t) => t.posicao)) + 1
			: 0;
		const tarefa: Tarefa = {
			id: uid(),
			titulo: trimmed,
			concluida: false,
			data: this.dia,
			posicao
		};
		this.tarefas = [...this.tarefas, tarefa];
		this.#persist(
			() => db.insertTarefa(this.supabase!, tarefa),
			() => (this.tarefas = this.tarefas.filter((t) => t.id !== tarefa.id)),
			'Falha ao adicionar tarefa.'
		);
		return tarefa;
	}

	toggle(id: string) {
		const snapshot = this.tarefas;
		const alvo = this.tarefas.find((t) => t.id === id);
		if (!alvo) return;
		const concluida = !alvo.concluida;
		this.tarefas = this.tarefas.map((t) => (t.id === id ? { ...t, concluida } : t));
		this.#persist(
			() => db.updateTarefa(this.supabase!, id, { concluida }),
			() => (this.tarefas = snapshot),
			'Falha ao atualizar tarefa.'
		);
	}

	editTarefa(id: string, titulo: string) {
		const trimmed = titulo.trim();
		if (!trimmed) return;
		const snapshot = this.tarefas;
		this.tarefas = this.tarefas.map((t) => (t.id === id ? { ...t, titulo: trimmed } : t));
		this.#persist(
			() => db.updateTarefa(this.supabase!, id, { titulo: trimmed }),
			() => (this.tarefas = snapshot),
			'Falha ao salvar tarefa.'
		);
	}

	removeTarefa(id: string) {
		const snapshot = this.tarefas;
		this.tarefas = this.tarefas.filter((t) => t.id !== id);
		this.#persist(
			() => db.deleteTarefa(this.supabase!, id),
			() => (this.tarefas = snapshot),
			'Falha ao excluir tarefa.'
		);
	}

	/** Remove todas as tarefas já concluídas do dia. */
	limparConcluidas() {
		const concluidas = this.tarefas.filter((t) => t.concluida);
		if (!concluidas.length) return;
		const snapshot = this.tarefas;
		this.tarefas = this.tarefas.filter((t) => !t.concluida);
		this.#persist(
			async () => {
				for (const t of concluidas) await db.deleteTarefa(this.supabase!, t.id);
			},
			() => (this.tarefas = snapshot),
			'Falha ao limpar concluídas.'
		);
	}
}

export const organyze = new OrganyzeStore();
