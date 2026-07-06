// Organyze — store de estado (Svelte 5 runes) com persistência no Supabase.
// Fluxo: carrega colaboradores (perfis) → usuário escolhe um → carrega as tarefas
// daquele colaborador no dia selecionado. Mutations otimistas (rollback + toast).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Colaborador, Prioridade, Tarefa } from './types';
import { toast } from '$lib/toast.svelte';
import * as db from './db';

const K_PERFIL = 'organyze_perfil_selecionado';

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

	loading = $state(true); // carga inicial (colaboradores)
	loadingTarefas = $state(false); // troca de perfil/dia
	error = $state<string | null>(null);

	colaboradores = $state<Colaborador[]>([]);
	colaboradorId = $state<string | null>(null);

	dia = $state<string>(hoje());
	tarefas = $state<Tarefa[]>([]);

	// ---- Derivados ---------------------------------------------------------
	total = $derived(this.tarefas.length);
	concluidas = $derived(this.tarefas.filter((t) => t.concluida).length);
	pendentes = $derived(this.total - this.concluidas);
	tudoFeito = $derived(this.total > 0 && this.pendentes === 0);

	get colaborador(): Colaborador | null {
		return this.colaboradores.find((c) => c.id === this.colaboradorId) ?? null;
	}
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
			this.colaboradores = await db.fetchColaboradores(this.supabase);
		} catch (e) {
			console.error('[organyze] load colaboradores', e);
			this.error = 'Não foi possível carregar os perfis. Tente atualizar a página.';
		} finally {
			this.loading = false;
		}
	}

	/** Seleciona um perfil e carrega suas tarefas do dia. */
	async selecionarColaborador(id: string) {
		this.colaboradorId = id;
		if (typeof localStorage !== 'undefined') localStorage.setItem(K_PERFIL, id);
		await this.carregarTarefas();
	}

	/** Volta para a tela de seleção de perfil. */
	sair() {
		this.colaboradorId = null;
		this.tarefas = [];
		if (typeof localStorage !== 'undefined') localStorage.removeItem(K_PERFIL);
	}

	async carregarTarefas() {
		if (!this.supabase || !this.colaboradorId) return;
		this.loadingTarefas = true;
		this.error = null;
		try {
			this.tarefas = await db.fetchByColaboradorDia(this.supabase, this.colaboradorId, this.dia);
		} catch (e) {
			console.error('[organyze] carregarTarefas', e);
			this.error = 'Não foi possível carregar as tarefas.';
		} finally {
			this.loadingTarefas = false;
		}
	}

	async setDia(dia: string) {
		this.dia = dia;
		await this.carregarTarefas();
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
		if (!trimmed || !this.colaboradorId) return null;
		const posicao = this.tarefas.length
			? Math.max(...this.tarefas.map((t) => t.posicao)) + 1
			: 0;
		const tarefa: Tarefa = {
			id: uid(),
			colaboradorId: this.colaboradorId,
			titulo: trimmed,
			concluida: false,
			data: this.dia,
			posicao,
			prioridade: 'media',
			etiquetas: []
		};
		this.tarefas = [...this.tarefas, tarefa];
		this.#persist(
			() => db.insertTarefa(this.supabase!, tarefa),
			() => (this.tarefas = this.tarefas.filter((t) => t.id !== tarefa.id)),
			'Falha ao adicionar tarefa.'
		);
		return tarefa;
	}

	#update(id: string, patch: Partial<Tarefa>, errMsg: string) {
		const snapshot = this.tarefas;
		this.tarefas = this.tarefas.map((t) => (t.id === id ? { ...t, ...patch } : t));
		this.#persist(
			() => db.updateTarefa(this.supabase!, id, patch),
			() => (this.tarefas = snapshot),
			errMsg
		);
	}

	toggle(id: string) {
		const alvo = this.tarefas.find((t) => t.id === id);
		if (!alvo) return;
		this.#update(id, { concluida: !alvo.concluida }, 'Falha ao atualizar tarefa.');
	}

	editTarefa(id: string, titulo: string) {
		const trimmed = titulo.trim();
		if (trimmed) this.#update(id, { titulo: trimmed }, 'Falha ao salvar tarefa.');
	}

	setPrioridade(id: string, prioridade: Prioridade) {
		this.#update(id, { prioridade }, 'Falha ao alterar prioridade.');
	}

	setEtiquetas(id: string, etiquetas: string[]) {
		this.#update(id, { etiquetas }, 'Falha ao salvar etiquetas.');
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

	/** Reordena as tarefas visíveis para a nova ordem de ids e persiste posições. */
	reordenar(orderedIds: string[]) {
		const snapshot = this.tarefas;
		const pos = new Map(orderedIds.map((id, i) => [id, i]));
		this.tarefas = [...this.tarefas]
			.map((t) => (pos.has(t.id) ? { ...t, posicao: pos.get(t.id)! } : t))
			.sort((a, b) => a.posicao - b.posicao);
		const ordem = orderedIds.map((id, i) => ({ id, posicao: i }));
		this.#persist(
			() => db.updatePosicoes(this.supabase!, ordem),
			() => (this.tarefas = snapshot),
			'Falha ao reordenar.'
		);
	}

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
