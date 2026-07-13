// LeadGrap — store de estado (Svelte 5 runes) com persistência no Supabase.
// Carrega todos os leads + colaboradores + templates + jobs de captura e mantém
// tudo em memória; as telas (leads, kanban, dashboard, atividade) derivam desse
// conjunto. Mutations são otimistas (rollback + toast em caso de erro).

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	ActivityDTO,
	Colaborador,
	LeadDTO,
	LeadStage,
	MessageTemplateDTO,
	ScrapeJobDTO
} from './types';
import { STAGE_LABEL } from './types';
import { toast } from '$lib/toast.svelte';
import * as db from './db';
import type { LeadPatch, TemplateInput } from './db';
import type { ParsedLeadRow } from './csv';

/** Normaliza telefone para os últimos 11 dígitos (dedupe de importação). */
function normalizePhone(phone: string | null): string | null {
	if (!phone) return null;
	const digits = phone.replace(/\D/g, '');
	return digits.length >= 8 ? digits.slice(-11) : null;
}

class LeadgrapStore {
	supabase: SupabaseClient | null = null;
	#ready = false;

	loading = $state(true);
	error = $state<string | null>(null);

	leads = $state<LeadDTO[]>([]);
	colaboradores = $state<Colaborador[]>([]);
	templates = $state<MessageTemplateDTO[]>([]);
	scrapeJobs = $state<ScrapeJobDTO[]>([]);

	/** Colaborador do usuário logado — autor das atividades. */
	colaboradorId: string | null = null;

	async init(supabase: SupabaseClient, colaboradorId: string | null) {
		this.supabase = supabase;
		this.colaboradorId = colaboradorId;
		if (this.#ready) return;
		this.#ready = true;
		await this.reloadAll();
	}

	async reloadAll() {
		if (!this.supabase) return;
		this.loading = true;
		this.error = null;
		try {
			const [leads, colaboradores, templates, jobs] = await Promise.all([
				db.fetchLeads(this.supabase),
				db.fetchColaboradores(this.supabase),
				db.fetchTemplates(this.supabase),
				db.fetchScrapeJobs(this.supabase)
			]);
			this.leads = leads;
			this.colaboradores = colaboradores;
			this.templates = templates;
			this.scrapeJobs = jobs;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Erro ao carregar';
			toast.error('Não foi possível carregar o LeadGrap.');
		} finally {
			this.loading = false;
		}
	}

	async reloadLeads() {
		if (!this.supabase) return;
		try {
			this.leads = await db.fetchLeads(this.supabase);
		} catch {
			toast.error('Erro ao recarregar leads.');
		}
	}

	async reloadJobs() {
		if (!this.supabase) return;
		try {
			this.scrapeJobs = await db.fetchScrapeJobs(this.supabase);
		} catch {
			/* silencioso — polling */
		}
	}

	colabNome(id: string | null): string | null {
		if (!id) return null;
		return this.colaboradores.find((c) => c.id === id)?.nome ?? null;
	}

	#replaceLead(updated: LeadDTO) {
		const i = this.leads.findIndex((l) => l.id === updated.id);
		if (i !== -1) this.leads[i] = updated;
	}

	// ---- Mutations de lead ----

	/** Muda o estágio (kanban/tabela). Registra atividade. */
	async setStage(id: string, stage: LeadStage) {
		if (!this.supabase) return;
		const lead = this.leads.find((l) => l.id === id);
		if (!lead || lead.stage === stage) return;
		const prev = lead.stage;
		this.#replaceLead({ ...lead, stage }); // otimista
		try {
			await db.updateLead(this.supabase, id, { stage });
			await db.addActivity(this.supabase, id, this.colaboradorId, db.stageActivityMessage(stage));
		} catch {
			this.#replaceLead({ ...lead, stage: prev });
			toast.error('Não foi possível mover o lead.');
		}
	}

	/** Atribui/remove responsável de um lead. Registra atividade. */
	async assign(id: string, colaboradorId: string | null) {
		if (!this.supabase) return;
		const lead = this.leads.find((l) => l.id === id);
		if (!lead) return;
		const prev = { id: lead.assignedToId, name: lead.assignedToName };
		const nome = this.colabNome(colaboradorId);
		this.#replaceLead({ ...lead, assignedToId: colaboradorId, assignedToName: nome });
		try {
			await db.updateLead(this.supabase, id, { assignedToId: colaboradorId });
			await db.addActivity(
				this.supabase,
				id,
				this.colaboradorId,
				colaboradorId ? `Atribuído a ${nome}` : 'Atribuição removida'
			);
		} catch {
			this.#replaceLead({ ...lead, assignedToId: prev.id, assignedToName: prev.name });
			toast.error('Não foi possível atribuir o lead.');
		}
	}

	async bulkStage(ids: string[], stage: LeadStage) {
		if (!this.supabase || !ids.length) return;
		const snapshot = new Map(this.leads.filter((l) => ids.includes(l.id)).map((l) => [l.id, l.stage]));
		for (const id of ids) {
			const lead = this.leads.find((l) => l.id === id);
			if (lead) this.#replaceLead({ ...lead, stage });
		}
		try {
			await db.bulkUpdateLeads(this.supabase, ids, { stage });
			await db.addActivities(
				this.supabase,
				ids.map((leadId) => ({
					leadId,
					colaboradorId: this.colaboradorId,
					message: db.stageActivityMessage(stage)
				}))
			);
			toast.success(`${ids.length} lead(s) movido(s).`);
		} catch {
			for (const [id, st] of snapshot) {
				const lead = this.leads.find((l) => l.id === id);
				if (lead) this.#replaceLead({ ...lead, stage: st });
			}
			toast.error('Não foi possível mover os leads.');
		}
	}

	async bulkAssign(ids: string[], colaboradorId: string | null) {
		if (!this.supabase || !ids.length) return;
		const snapshot = new Map(
			this.leads.filter((l) => ids.includes(l.id)).map((l) => [l.id, { id: l.assignedToId, name: l.assignedToName }])
		);
		const nome = this.colabNome(colaboradorId);
		for (const id of ids) {
			const lead = this.leads.find((l) => l.id === id);
			if (lead) this.#replaceLead({ ...lead, assignedToId: colaboradorId, assignedToName: nome });
		}
		try {
			await db.bulkUpdateLeads(this.supabase, ids, { assignedToId: colaboradorId });
			await db.addActivities(
				this.supabase,
				ids.map((leadId) => ({
					leadId,
					colaboradorId: this.colaboradorId,
					message: colaboradorId ? `Atribuído a ${nome}` : 'Atribuição removida'
				}))
			);
			toast.success(`${ids.length} lead(s) atualizado(s).`);
		} catch {
			for (const [id, prev] of snapshot) {
				const lead = this.leads.find((l) => l.id === id);
				if (lead) this.#replaceLead({ ...lead, assignedToId: prev.id, assignedToName: prev.name });
			}
			toast.error('Não foi possível atribuir os leads.');
		}
	}

	/** Salva os campos editáveis do modal de detalhe. Retorna o lead atualizado. */
	async saveDetails(
		id: string,
		patch: LeadPatch
	): Promise<LeadDTO | null> {
		if (!this.supabase) return null;
		const lead = this.leads.find((l) => l.id === id);
		if (!lead) return null;
		try {
			const assignmentChanged =
				patch.assignedToId !== undefined && patch.assignedToId !== lead.assignedToId;
			const updated = await db.updateLead(this.supabase, id, patch);
			if (assignmentChanged) {
				await db.addActivity(
					this.supabase,
					id,
					this.colaboradorId,
					patch.assignedToId ? `Atribuído a ${this.colabNome(patch.assignedToId)}` : 'Atribuição removida'
				);
			}
			this.#replaceLead(updated);
			toast.success('Lead salvo.');
			return updated;
		} catch {
			toast.error('Não foi possível salvar o lead.');
			return null;
		}
	}

	/** Registra um contato (WhatsApp/e-mail); sobe de NOVO para CONTATADO. */
	async registerContact(id: string, canal: 'whatsapp' | 'email'): Promise<LeadDTO | null> {
		if (!this.supabase) return null;
		const lead = this.leads.find((l) => l.id === id);
		if (!lead) return null;
		const label = canal === 'whatsapp' ? 'WhatsApp' : 'e-mail';
		const subiu = lead.stage === 'NOVO';
		try {
			if (subiu) {
				await db.updateLead(this.supabase, id, { stage: 'CONTATADO' });
				this.#replaceLead({ ...lead, stage: 'CONTATADO' });
			}
			await db.addActivity(this.supabase, id, this.colaboradorId, `Contato via ${label}`);
			return this.leads.find((l) => l.id === id) ?? null;
		} catch {
			toast.error('Não foi possível registrar o contato.');
			return null;
		}
	}

	async removeLead(id: string) {
		if (!this.supabase) return;
		const idx = this.leads.findIndex((l) => l.id === id);
		if (idx === -1) return;
		const [removed] = this.leads.splice(idx, 1);
		try {
			await db.deleteLead(this.supabase, id);
			toast.success('Lead excluído.');
		} catch {
			this.leads.splice(idx, 0, removed);
			toast.error('Não foi possível excluir.');
		}
	}

	async removeLeads(ids: string[]) {
		if (!this.supabase || !ids.length) return;
		const removed = this.leads.filter((l) => ids.includes(l.id));
		this.leads = this.leads.filter((l) => !ids.includes(l.id));
		try {
			await db.deleteLeads(this.supabase, ids);
			toast.success(`${ids.length} lead(s) excluído(s).`);
		} catch {
			this.leads = [...removed, ...this.leads];
			toast.error('Não foi possível excluir os leads.');
		}
	}

	/** Importa leads do CSV com dedupe (telefone últimos 11 dígitos OU nome+categoria). */
	async importLeads(rows: ParsedLeadRow[]): Promise<{ created: number; skipped: number }> {
		if (!this.supabase) return { created: 0, skipped: 0 };
		const phones = new Set(this.leads.map((l) => normalizePhone(l.phone)).filter(Boolean));
		const nameCat = new Set(
			this.leads.map((l) => `${l.name.toLowerCase()}|${(l.category ?? '').toLowerCase()}`)
		);
		const novos: ParsedLeadRow[] = [];
		let skipped = 0;
		for (const r of rows) {
			const p = normalizePhone(r.phone);
			const nc = `${r.name.toLowerCase()}|${(r.category ?? '').toLowerCase()}`;
			if ((p && phones.has(p)) || nameCat.has(nc)) {
				skipped++;
				continue;
			}
			novos.push(r);
			if (p) phones.add(p);
			nameCat.add(nc);
		}
		if (!novos.length) return { created: 0, skipped };
		try {
			const criados = await db.insertLeads(this.supabase, novos);
			this.leads = [...criados, ...this.leads];
			return { created: criados.length, skipped };
		} catch {
			toast.error('Falha ao importar leads.');
			return { created: 0, skipped };
		}
	}

	loadLeadActivities(leadId: string): Promise<ActivityDTO[]> {
		if (!this.supabase) return Promise.resolve([]);
		return db.fetchLeadActivities(this.supabase, leadId);
	}

	loadActivitiesFeed(before?: string): Promise<ActivityDTO[]> {
		if (!this.supabase) return Promise.resolve([]);
		return db.fetchActivitiesFeed(this.supabase, 30, before);
	}

	// ---- Templates ----

	async addTemplate(t: TemplateInput) {
		if (!this.supabase) return;
		try {
			const created = await db.insertTemplate(this.supabase, t);
			this.templates = [...this.templates, created];
			toast.success('Modelo criado.');
		} catch {
			toast.error('Não foi possível criar o modelo.');
		}
	}

	async editTemplate(id: string, t: TemplateInput) {
		if (!this.supabase) return;
		try {
			const updated = await db.updateTemplate(this.supabase, id, t);
			const i = this.templates.findIndex((x) => x.id === id);
			if (i !== -1) this.templates[i] = updated;
			toast.success('Modelo atualizado.');
		} catch {
			toast.error('Não foi possível salvar o modelo.');
		}
	}

	async removeTemplate(id: string) {
		if (!this.supabase) return;
		const idx = this.templates.findIndex((t) => t.id === id);
		if (idx === -1) return;
		const [removed] = this.templates.splice(idx, 1);
		try {
			await db.deleteTemplate(this.supabase, id);
			toast.success('Modelo excluído.');
		} catch {
			this.templates.splice(idx, 0, removed);
			toast.error('Não foi possível excluir o modelo.');
		}
	}

	// ---- Captura ----

	/** Cria jobs de captura (status 'queued') — executados pelo app local. */
	async startCapture(
		queries: string[],
		opts: { maxResults: number; enrich: boolean }
	): Promise<ScrapeJobDTO[]> {
		if (!this.supabase || !queries.length) return [];
		try {
			const jobs = await db.insertScrapeJobs(this.supabase, queries, opts);
			this.scrapeJobs = [...jobs, ...this.scrapeJobs];
			toast.success(`${jobs.length} captura(s) na fila.`);
			return jobs;
		} catch {
			toast.error('Não foi possível iniciar a captura.');
			return [];
		}
	}

	async cancelJob(id: string) {
		if (!this.supabase) return;
		try {
			await db.cancelScrapeJob(this.supabase, id);
			const i = this.scrapeJobs.findIndex((j) => j.id === id);
			if (i !== -1) this.scrapeJobs[i] = { ...this.scrapeJobs[i], status: 'cancelled' };
		} catch {
			toast.error('Não foi possível cancelar.');
		}
	}
}

export const leadgrap = new LeadgrapStore();
