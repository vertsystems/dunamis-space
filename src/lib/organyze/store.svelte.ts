// Organyze — store de estado (Svelte 5 runes) com persistência no Supabase.
// Fluxo: carrega colaboradores (perfis) → usuário escolhe um → carrega as tarefas
// daquele colaborador no dia selecionado. Mutations otimistas (rollback + toast).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Colaborador, DiaStatus, Habito, Meta, Prioridade, Status, Tarefa } from './types';
import { metaConcluida, proximoDia } from './types';
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

/** Mês atual no formato yyyy-mm. */
function mesAtual(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export type Modo = 'dia' | 'semana' | 'mes';

function parseISO(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}
/** Início da semana (segunda-feira) do dia informado. */
export function inicioSemana(iso: string): string {
	const d = parseISO(iso);
	const off = (d.getDay() + 6) % 7; // 0=segunda
	d.setDate(d.getDate() - off);
	return toISODate(d);
}
export function fimSemana(iso: string): string {
	const d = parseISO(inicioSemana(iso));
	d.setDate(d.getDate() + 6);
	return toISODate(d);
}
export function inicioMes(iso: string): string {
	const [y, m] = iso.split('-').map(Number);
	return toISODate(new Date(y, m - 1, 1));
}
export function fimMes(iso: string): string {
	const [y, m] = iso.split('-').map(Number);
	return toISODate(new Date(y, m, 0));
}

class OrganyzeStore {
	supabase: SupabaseClient | null = null;
	#ready = false;

	loading = $state(true); // carga inicial (colaboradores)
	loadingTarefas = $state(false); // troca de perfil/dia
	error = $state<string | null>(null);

	colaboradores = $state<Colaborador[]>([]);
	colaboradorId = $state<string | null>(null);
	// Colaborador do usuário logado (casado por e-mail no layout). Usado para
	// entrar direto no próprio perfil, sem passar pela tela de seleção.
	autoColaboradorId: string | null = null;

	dia = $state<string>(hoje());
	modo = $state<Modo>('dia');
	tarefas = $state<Tarefa[]>([]); // conjunto carregado (dia/semana/mês)

	// Metas do Mês (por colaborador)
	mesMeta = $state<string>(mesAtual());
	metas = $state<Meta[]>([]);
	loadingMetas = $state(false);

	// Habit Tracker (por colaborador, mesmo mês das metas)
	habitos = $state<Habito[]>([]);
	loadingHabitos = $state(false);

	// ---- Derivados ---------------------------------------------------------
	// Tarefas do dia em foco (usadas no quadro do modo "Dia" e no progresso).
	tarefasDia = $derived(this.tarefas.filter((t) => t.data === this.dia));
	total = $derived(this.tarefasDia.length);
	concluidas = $derived(this.tarefasDia.filter((t) => t.status === 'concluida').length);
	pendentes = $derived(this.total - this.concluidas);
	tudoFeito = $derived(this.total > 0 && this.pendentes === 0);

	get colaborador(): Colaborador | null {
		return this.colaboradores.find((c) => c.id === this.colaboradorId) ?? null;
	}
	get ehHoje(): boolean {
		return this.dia === hoje();
	}

	// ---- Ciclo de vida -----------------------------------------------------
	async init(supabase: SupabaseClient, autoColaboradorId: string | null = null) {
		this.autoColaboradorId = autoColaboradorId;
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
		// Usuário logado: entra direto no próprio perfil (se casar com um colaborador ativo).
		if (
			!this.colaboradorId &&
			this.autoColaboradorId &&
			this.colaboradores.some((c) => c.id === this.autoColaboradorId)
		) {
			await this.selecionarColaborador(this.autoColaboradorId);
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

	#range(): [string, string] {
		if (this.modo === 'semana') return [inicioSemana(this.dia), fimSemana(this.dia)];
		if (this.modo === 'mes') return [inicioMes(this.dia), fimMes(this.dia)];
		return [this.dia, this.dia];
	}

	async carregarTarefas() {
		if (!this.supabase || !this.colaboradorId) return;
		this.loadingTarefas = true;
		this.error = null;
		try {
			// Rollover: ao focar HOJE, joga pendentes de dias anteriores para hoje.
			if (this.dia === hoje()) {
				await db.rolarPendentesParaHoje(this.supabase, this.colaboradorId, hoje());
			}
			const [start, end] = this.#range();
			this.tarefas = await db.fetchByColaboradorRange(
				this.supabase,
				this.colaboradorId,
				start,
				end
			);
		} catch (e) {
			console.error('[organyze] carregarTarefas', e);
			this.error = 'Não foi possível carregar as tarefas.';
		} finally {
			this.loadingTarefas = false;
		}
	}

	async setModo(modo: Modo) {
		if (this.modo === modo) return;
		this.modo = modo;
		await this.carregarTarefas();
	}
	async setDia(dia: string) {
		this.dia = dia;
		await this.carregarTarefas();
	}
	async irParaHoje() {
		if (!this.ehHoje) await this.setDia(hoje());
	}
	/** Navega pela unidade do modo atual (dia/semana/mês). */
	async passar(delta: number) {
		const [y, m, d] = this.dia.split('-').map(Number);
		if (this.modo === 'mes') {
			await this.setDia(toISODate(new Date(y, m - 1 + delta, d)));
		} else {
			const step = this.modo === 'semana' ? 7 : 1;
			const base = new Date(y, m - 1, d);
			base.setDate(base.getDate() + delta * step);
			await this.setDia(toISODate(base));
		}
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
	addTarefa(titulo: string, prazo: string | null = null): Tarefa | null {
		const trimmed = titulo.trim();
		if (!trimmed || !this.colaboradorId) return null;
		const posicao = this.tarefas.length
			? Math.max(...this.tarefas.map((t) => t.posicao)) + 1
			: 0;
		const tarefa: Tarefa = {
			id: uid(),
			colaboradorId: this.colaboradorId,
			titulo: trimmed,
			status: 'nao_iniciado',
			data: this.dia,
			posicao,
			prioridade: 'media',
			prazo: prazo || null,
			descricao: '',
			subtarefas: [],
			responsaveis: []
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
		const status: Status = alvo.status === 'concluida' ? 'em_execucao' : 'concluida';
		this.#update(id, { status }, 'Falha ao atualizar tarefa.');
	}

	setStatus(id: string, status: Status) {
		this.#update(id, { status }, 'Falha ao mover tarefa.');
	}

	editTarefa(id: string, titulo: string) {
		const trimmed = titulo.trim();
		if (trimmed) this.#update(id, { titulo: trimmed }, 'Falha ao salvar tarefa.');
	}

	setPrioridade(id: string, prioridade: Prioridade) {
		this.#update(id, { prioridade }, 'Falha ao alterar prioridade.');
	}

	setPrazo(id: string, prazo: string | null) {
		this.#update(id, { prazo }, 'Falha ao salvar prazo.');
	}

	setDescricao(id: string, descricao: string) {
		this.#update(id, { descricao }, 'Falha ao salvar descrição.');
	}

	/** Compartilha (ou descompartilha) a tarefa com outros colaboradores. */
	setResponsaveis(id: string, responsaveis: string[]) {
		this.#update(id, { responsaveis }, 'Falha ao salvar responsáveis.');
	}
	/** Alterna um colaborador na lista de responsáveis (não inclui o dono). */
	toggleResponsavel(id: string, colaboradorId: string) {
		const t = this.tarefas.find((x) => x.id === id);
		if (!t || colaboradorId === t.colaboradorId) return;
		const has = t.responsaveis.includes(colaboradorId);
		const responsaveis = has
			? t.responsaveis.filter((c) => c !== colaboradorId)
			: [...t.responsaveis, colaboradorId];
		this.setResponsaveis(id, responsaveis);
	}

	// ---- Subtarefas --------------------------------------------------------
	addSubtarefa(id: string, titulo: string) {
		const t = this.tarefas.find((x) => x.id === id);
		const nome = titulo.trim();
		if (!t || !nome) return;
		const subtarefas = [...t.subtarefas, { id: uid(), titulo: nome, feita: false }];
		this.#update(id, { subtarefas }, 'Falha ao salvar subtarefa.');
	}
	toggleSubtarefa(id: string, subId: string) {
		const t = this.tarefas.find((x) => x.id === id);
		if (!t) return;
		const subtarefas = t.subtarefas.map((s) => (s.id === subId ? { ...s, feita: !s.feita } : s));
		this.#update(id, { subtarefas }, 'Falha ao atualizar subtarefa.');
	}
	editSubtarefa(id: string, subId: string, titulo: string) {
		const t = this.tarefas.find((x) => x.id === id);
		const nome = titulo.trim();
		if (!t || !nome) return;
		const subtarefas = t.subtarefas.map((s) => (s.id === subId ? { ...s, titulo: nome } : s));
		this.#update(id, { subtarefas }, 'Falha ao salvar subtarefa.');
	}
	removeSubtarefa(id: string, subId: string) {
		const t = this.tarefas.find((x) => x.id === id);
		if (!t) return;
		const subtarefas = t.subtarefas.filter((s) => s.id !== subId);
		this.#update(id, { subtarefas }, 'Falha ao excluir subtarefa.');
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

	/**
	 * Aplica a ordem/estado do quadro após um arrasto: `items` é a lista completa das
	 * tarefas visíveis já na ordem final (topo→base, em todas as seções). posicao = índice
	 * e status vem da seção onde cada tarefa parou.
	 */
	aplicarQuadro(items: { id: string; status: Status }[]) {
		const snapshot = this.tarefas;
		const meta = new Map(items.map((it, i) => [it.id, { posicao: i, status: it.status }]));
		this.tarefas = [...this.tarefas]
			.map((t) => (meta.has(t.id) ? { ...t, ...meta.get(t.id)! } : t))
			.sort((a, b) => a.posicao - b.posicao);
		const ordem = items.map((it, i) => ({ id: it.id, posicao: i, status: it.status }));
		this.#persist(
			() => db.updatePosicoes(this.supabase!, ordem),
			() => (this.tarefas = snapshot),
			'Falha ao mover tarefa.'
		);
	}

	limparConcluidas() {
		const concluidas = this.tarefas.filter((t) => t.status === 'concluida');
		if (!concluidas.length) return;
		const snapshot = this.tarefas;
		this.tarefas = this.tarefas.filter((t) => t.status !== 'concluida');
		this.#persist(
			async () => {
				for (const t of concluidas) await db.deleteTarefa(this.supabase!, t.id);
			},
			() => (this.tarefas = snapshot),
			'Falha ao limpar concluídas.'
		);
	}

	// ---- Metas do Mês ------------------------------------------------------
	get mesMetaLabel(): string {
		const [y, m] = this.mesMeta.split('-').map(Number);
		return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
	}

	async carregarMetas() {
		if (!this.supabase || !this.colaboradorId) {
			this.metas = [];
			return;
		}
		this.loadingMetas = true;
		try {
			this.metas = await db.fetchMetas(this.supabase, this.colaboradorId, this.mesMeta);
		} catch (e) {
			console.error('[organyze] carregarMetas', e);
			toast.error('Não foi possível carregar as metas.');
		} finally {
			this.loadingMetas = false;
		}
	}

	/** Seleciona um perfil (a página de Metas recarrega via $effect). */
	selecionarParaMetas(id: string) {
		this.colaboradorId = id;
		if (typeof localStorage !== 'undefined') localStorage.setItem(K_PERFIL, id);
	}

	setMesMeta(mes: string) {
		this.mesMeta = mes;
	}
	passarMes(delta: number) {
		const [y, m] = this.mesMeta.split('-').map(Number);
		const d = new Date(y, m - 1 + delta, 1);
		this.mesMeta = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	}

	#persistMeta(action: () => Promise<void>, rollback: () => void, errMsg: string) {
		if (!this.supabase) return;
		action().catch((e) => {
			console.error('[organyze]', errMsg, e);
			rollback();
			toast.error(errMsg);
		});
	}

	addMeta(titulo: string, alvo = 1, unidade = ''): Meta | null {
		const nome = titulo.trim();
		if (!nome || !this.colaboradorId) return null;
		const posicao = this.metas.length ? Math.max(...this.metas.map((m) => m.posicao)) + 1 : 0;
		const meta: Meta = {
			id: uid(),
			colaboradorId: this.colaboradorId,
			mes: this.mesMeta,
			titulo: nome,
			alvo: Math.max(1, Math.round(alvo)),
			atual: 0,
			unidade: unidade.trim(),
			posicao
		};
		this.metas = [...this.metas, meta];
		this.#persistMeta(
			() => db.insertMeta(this.supabase!, meta),
			() => (this.metas = this.metas.filter((m) => m.id !== meta.id)),
			'Falha ao adicionar meta.'
		);
		return meta;
	}

	#updateMeta(id: string, patch: Partial<Meta>, errMsg: string) {
		const snapshot = this.metas;
		this.metas = this.metas.map((m) => (m.id === id ? { ...m, ...patch } : m));
		this.#persistMeta(
			() => db.updateMeta(this.supabase!, id, patch),
			() => (this.metas = snapshot),
			errMsg
		);
	}

	/** Soma delta ao progresso atual (limitado entre 0 e alvo). */
	incMeta(id: string, delta: number) {
		const m = this.metas.find((x) => x.id === id);
		if (!m) return;
		const atual = Math.max(0, Math.min(m.alvo, m.atual + delta));
		if (atual !== m.atual) this.#updateMeta(id, { atual }, 'Falha ao atualizar meta.');
	}
	/** Alterna concluída: cheia ↔ zerada. */
	toggleMeta(id: string) {
		const m = this.metas.find((x) => x.id === id);
		if (!m) return;
		this.#updateMeta(id, { atual: metaConcluida(m) ? 0 : m.alvo }, 'Falha ao atualizar meta.');
	}
	editMeta(id: string, patch: { titulo?: string; alvo?: number; unidade?: string }) {
		const clean: Partial<Meta> = {};
		if (patch.titulo !== undefined && patch.titulo.trim()) clean.titulo = patch.titulo.trim();
		if (patch.alvo !== undefined) clean.alvo = Math.max(1, Math.round(patch.alvo));
		if (patch.unidade !== undefined) clean.unidade = patch.unidade.trim();
		if (Object.keys(clean).length) this.#updateMeta(id, clean, 'Falha ao salvar meta.');
	}
	removeMeta(id: string) {
		const snapshot = this.metas;
		this.metas = this.metas.filter((m) => m.id !== id);
		this.#persistMeta(
			() => db.deleteMeta(this.supabase!, id),
			() => (this.metas = snapshot),
			'Falha ao excluir meta.'
		);
	}

	// ---- Habit Tracker -----------------------------------------------------
	async carregarHabitos() {
		if (!this.supabase || !this.colaboradorId) {
			this.habitos = [];
			return;
		}
		this.loadingHabitos = true;
		try {
			this.habitos = await db.fetchHabitos(this.supabase, this.colaboradorId, this.mesMeta);
		} catch (e) {
			console.error('[organyze] carregarHabitos', e);
			toast.error('Não foi possível carregar os hábitos.');
		} finally {
			this.loadingHabitos = false;
		}
	}

	addHabito(nome: string): Habito | null {
		const n = nome.trim();
		if (!n || !this.colaboradorId) return null;
		const posicao = this.habitos.length ? Math.max(...this.habitos.map((h) => h.posicao)) + 1 : 0;
		const habito: Habito = {
			id: uid(),
			colaboradorId: this.colaboradorId,
			mes: this.mesMeta,
			nome: n,
			dias: {},
			posicao
		};
		this.habitos = [...this.habitos, habito];
		this.#persistMeta(
			() => db.insertHabito(this.supabase!, habito),
			() => (this.habitos = this.habitos.filter((h) => h.id !== habito.id)),
			'Falha ao adicionar hábito.'
		);
		return habito;
	}

	#updateHabito(id: string, patch: Partial<Habito>, errMsg: string) {
		const snapshot = this.habitos;
		this.habitos = this.habitos.map((h) => (h.id === id ? { ...h, ...patch } : h));
		this.#persistMeta(
			() => db.updateHabito(this.supabase!, id, patch),
			() => (this.habitos = snapshot),
			errMsg
		);
	}

	/** Alterna a marcação de um dia: vazio → feito → falhou → vazio. */
	marcarDia(id: string, dia: number) {
		const h = this.habitos.find((x) => x.id === id);
		if (!h) return;
		const chave = String(dia);
		const prox = proximoDia(h.dias[chave]);
		const dias: Record<string, DiaStatus> = { ...h.dias };
		if (prox === undefined) delete dias[chave];
		else dias[chave] = prox;
		this.#updateHabito(id, { dias }, 'Falha ao marcar dia.');
	}

	editHabito(id: string, nome: string) {
		const n = nome.trim();
		if (n) this.#updateHabito(id, { nome: n }, 'Falha ao salvar hábito.');
	}

	removeHabito(id: string) {
		const snapshot = this.habitos;
		this.habitos = this.habitos.filter((h) => h.id !== id);
		this.#persistMeta(
			() => db.deleteHabito(this.supabase!, id),
			() => (this.habitos = snapshot),
			'Falha ao excluir hábito.'
		);
	}
}

export const organyze = new OrganyzeStore();
