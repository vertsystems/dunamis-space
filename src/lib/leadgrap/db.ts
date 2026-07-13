// LeadGrap — acesso a dados no Supabase.
// Leads, atividades, templates e jobs de captura ficam em tabelas leadgrap_*.
// O responsável (assignedTo) e o autor de atividade são colaboradores do dunamisspace.
// RLS libera para qualquer autenticado (ferramenta interna compartilhada).

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
import type { ParsedLeadRow } from './csv';

type LeadRow = {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	website: string | null;
	has_website: boolean;
	email: string | null;
	instagram: string | null;
	facebook: string | null;
	category: string | null;
	rating: number | null;
	review_count: number | null;
	google_url: string | null;
	search_query: string | null;
	stage: LeadStage;
	notes: string | null;
	tags: string | null;
	estimated_value: number | null;
	next_contact_at: string | null;
	colaborador_id: string | null;
	created_at: string;
	updated_at: string;
	colaborador?: { nome: string } | null;
};

const LEAD_COLS =
	'id, name, address, phone, website, has_website, email, instagram, facebook, category, rating, review_count, google_url, search_query, stage, notes, tags, estimated_value, next_contact_at, colaborador_id, created_at, updated_at, colaborador:colaborador_id(nome)';

function toLead(r: LeadRow): LeadDTO {
	return {
		id: r.id,
		name: r.name,
		address: r.address,
		phone: r.phone,
		website: r.website,
		hasWebsite: r.has_website,
		email: r.email,
		instagram: r.instagram,
		facebook: r.facebook,
		category: r.category,
		rating: r.rating,
		reviewCount: r.review_count,
		googleUrl: r.google_url,
		searchQuery: r.search_query,
		stage: r.stage,
		notes: r.notes,
		tags: r.tags,
		estimatedValue: r.estimated_value,
		nextContactAt: r.next_contact_at,
		assignedToId: r.colaborador_id,
		assignedToName: r.colaborador?.nome ?? null,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	};
}

/** Colaboradores ativos — para o seletor de responsável. */
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

// ---- Leads ----

export async function fetchLeads(supabase: SupabaseClient): Promise<LeadDTO[]> {
	const { data, error } = await supabase
		.from('leadgrap_leads')
		.select(LEAD_COLS)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return ((data ?? []) as unknown as LeadRow[]).map(toLead);
}

export type LeadPatch = {
	stage?: LeadStage;
	notes?: string | null;
	tags?: string | null;
	estimatedValue?: number | null;
	nextContactAt?: string | null;
	assignedToId?: string | null;
};

function patchToRow(patch: LeadPatch): Record<string, unknown> {
	const row: Record<string, unknown> = {};
	if (patch.stage !== undefined) row.stage = patch.stage;
	if (patch.notes !== undefined) row.notes = patch.notes;
	if (patch.tags !== undefined) row.tags = patch.tags;
	if (patch.estimatedValue !== undefined) row.estimated_value = patch.estimatedValue;
	if (patch.nextContactAt !== undefined) row.next_contact_at = patch.nextContactAt;
	if (patch.assignedToId !== undefined) row.colaborador_id = patch.assignedToId;
	return row;
}

export async function updateLead(
	supabase: SupabaseClient,
	id: string,
	patch: LeadPatch
): Promise<LeadDTO> {
	const { data, error } = await supabase
		.from('leadgrap_leads')
		.update(patchToRow(patch))
		.eq('id', id)
		.select(LEAD_COLS)
		.single();
	if (error) throw error;
	return toLead(data as unknown as LeadRow);
}

export async function bulkUpdateLeads(
	supabase: SupabaseClient,
	ids: string[],
	patch: LeadPatch
): Promise<LeadDTO[]> {
	const { data, error } = await supabase
		.from('leadgrap_leads')
		.update(patchToRow(patch))
		.in('id', ids)
		.select(LEAD_COLS);
	if (error) throw error;
	return ((data ?? []) as unknown as LeadRow[]).map(toLead);
}

export async function deleteLead(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('leadgrap_leads').delete().eq('id', id);
	if (error) throw error;
}

export async function deleteLeads(supabase: SupabaseClient, ids: string[]): Promise<void> {
	const { error } = await supabase.from('leadgrap_leads').delete().in('id', ids);
	if (error) throw error;
}

/** Insere leads importados de CSV. Retorna os leads criados (DTO). */
export async function insertLeads(
	supabase: SupabaseClient,
	rows: ParsedLeadRow[]
): Promise<LeadDTO[]> {
	const payload = rows.map((r) => ({
		name: r.name,
		phone: r.phone,
		email: r.email,
		website: r.website,
		has_website: !!r.website,
		category: r.category,
		address: r.address,
		instagram: r.instagram,
		facebook: r.facebook,
		rating: r.rating,
		review_count: r.reviewCount,
		tags: r.tags,
		search_query: 'Importado (CSV)'
	}));
	const { data, error } = await supabase.from('leadgrap_leads').insert(payload).select(LEAD_COLS);
	if (error) throw error;
	return ((data ?? []) as unknown as LeadRow[]).map(toLead);
}

// ---- Atividades ----

export async function addActivity(
	supabase: SupabaseClient,
	leadId: string,
	colaboradorId: string | null,
	message: string
): Promise<void> {
	const { error } = await supabase
		.from('leadgrap_atividades')
		.insert({ lead_id: leadId, colaborador_id: colaboradorId, message });
	if (error) throw error;
}

/** Registra várias atividades de uma vez. */
export async function addActivities(
	supabase: SupabaseClient,
	rows: { leadId: string; colaboradorId: string | null; message: string }[]
): Promise<void> {
	if (!rows.length) return;
	const { error } = await supabase.from('leadgrap_atividades').insert(
		rows.map((r) => ({ lead_id: r.leadId, colaborador_id: r.colaboradorId, message: r.message }))
	);
	if (error) throw error;
}

type ActivityRow = {
	id: string;
	lead_id: string;
	message: string;
	created_at: string;
	colaborador?: { nome: string } | null;
	lead?: { name: string } | null;
};

const ACTIVITY_COLS =
	'id, lead_id, message, created_at, colaborador:colaborador_id(nome), lead:lead_id(name)';

/** Histórico de atividades de um lead (mais recentes primeiro). */
export async function fetchLeadActivities(
	supabase: SupabaseClient,
	leadId: string
): Promise<ActivityDTO[]> {
	const { data, error } = await supabase
		.from('leadgrap_atividades')
		.select(ACTIVITY_COLS)
		.eq('lead_id', leadId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return ((data ?? []) as unknown as ActivityRow[]).map((r) => ({
		id: r.id,
		leadId: r.lead_id,
		leadName: r.lead?.name ?? '',
		message: r.message,
		createdAt: r.created_at,
		userName: r.colaborador?.nome ?? null
	}));
}

/** Feed global de atividades, paginado por cursor (created_at do último item). */
export async function fetchActivitiesFeed(
	supabase: SupabaseClient,
	limit = 30,
	before?: string
): Promise<ActivityDTO[]> {
	let q = supabase
		.from('leadgrap_atividades')
		.select(ACTIVITY_COLS)
		.order('created_at', { ascending: false })
		.limit(limit);
	if (before) q = q.lt('created_at', before);
	const { data, error } = await q;
	if (error) throw error;
	return ((data ?? []) as unknown as ActivityRow[]).map((r) => ({
		id: r.id,
		leadId: r.lead_id,
		leadName: r.lead?.name ?? '',
		message: r.message,
		createdAt: r.created_at,
		userName: r.colaborador?.nome ?? null
	}));
}

// ---- Templates ----

type TemplateRow = {
	id: string;
	name: string;
	channel: 'whatsapp' | 'email';
	subject: string | null;
	body: string;
	created_at: string;
	updated_at: string;
};

function toTemplate(r: TemplateRow): MessageTemplateDTO {
	return {
		id: r.id,
		name: r.name,
		channel: r.channel,
		subject: r.subject,
		body: r.body,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	};
}

export async function fetchTemplates(supabase: SupabaseClient): Promise<MessageTemplateDTO[]> {
	const { data, error } = await supabase
		.from('leadgrap_templates')
		.select('id, name, channel, subject, body, created_at, updated_at')
		.order('created_at', { ascending: true });
	if (error) throw error;
	return ((data ?? []) as TemplateRow[]).map(toTemplate);
}

export type TemplateInput = {
	name: string;
	channel: 'whatsapp' | 'email';
	subject: string | null;
	body: string;
};

export async function insertTemplate(
	supabase: SupabaseClient,
	t: TemplateInput
): Promise<MessageTemplateDTO> {
	const { data, error } = await supabase
		.from('leadgrap_templates')
		.insert(t)
		.select('id, name, channel, subject, body, created_at, updated_at')
		.single();
	if (error) throw error;
	return toTemplate(data as TemplateRow);
}

export async function updateTemplate(
	supabase: SupabaseClient,
	id: string,
	t: TemplateInput
): Promise<MessageTemplateDTO> {
	const { data, error } = await supabase
		.from('leadgrap_templates')
		.update(t)
		.eq('id', id)
		.select('id, name, channel, subject, body, created_at, updated_at')
		.single();
	if (error) throw error;
	return toTemplate(data as TemplateRow);
}

export async function deleteTemplate(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('leadgrap_templates').delete().eq('id', id);
	if (error) throw error;
}

// ---- Jobs de captura ----

type JobRow = {
	id: string;
	query: string;
	status: string;
	found: number;
	saved: number;
	error: string | null;
	log: string | null;
	created_at: string;
	updated_at: string;
};

function toJob(r: JobRow): ScrapeJobDTO {
	return {
		id: r.id,
		query: r.query,
		status: r.status,
		found: r.found,
		saved: r.saved,
		error: r.error,
		log: r.log,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	};
}

export async function fetchScrapeJobs(supabase: SupabaseClient, limit = 50): Promise<ScrapeJobDTO[]> {
	const { data, error } = await supabase
		.from('leadgrap_scrape_jobs')
		.select('id, query, status, found, saved, error, log, created_at, updated_at')
		.order('created_at', { ascending: false })
		.limit(limit);
	if (error) throw error;
	return ((data ?? []) as JobRow[]).map(toJob);
}

/** Cria jobs de captura (status 'queued'); o app local os executa. */
export async function insertScrapeJobs(
	supabase: SupabaseClient,
	queries: string[],
	opts: { maxResults: number; enrich: boolean }
): Promise<ScrapeJobDTO[]> {
	const { data, error } = await supabase
		.from('leadgrap_scrape_jobs')
		.insert(
			queries.map((query) => ({
				query,
				status: 'queued',
				max_results: opts.maxResults,
				enrich: opts.enrich
			}))
		)
		.select('id, query, status, found, saved, error, log, created_at, updated_at');
	if (error) throw error;
	return ((data ?? []) as JobRow[]).map(toJob);
}

/** Marca um job como cancelado (o app local respeita ao pegar da fila). */
export async function cancelScrapeJob(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase
		.from('leadgrap_scrape_jobs')
		.update({ status: 'cancelled' })
		.eq('id', id)
		.in('status', ['queued', 'running']);
	if (error) throw error;
}

/** Mensagem automática de atividade ao mudar de estágio. */
export function stageActivityMessage(stage: LeadStage): string {
	return `Movido para ${STAGE_LABEL[stage]}`;
}
