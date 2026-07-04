// Pag's Up — acesso a dados no Supabase (tabelas pagsup_*).
// Mapeia as linhas do banco (colunas em pt) para os tipos do app e vice-versa.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	Client,
	Provider,
	ScheduledService,
	Negotiation,
	ScheduledNegotiation
} from './types';

/** `valor` no banco: null representa "A definir" (''). */
function toPrice(v: number | string | null): number | '' {
	return v === null || v === undefined ? '' : Number(v);
}
function fromPrice(p: number | ''): number | null {
	return p === '' ? null : Number(p);
}

// ---- Leitura -------------------------------------------------------------

export interface PagsupSnapshot {
	clients: Client[];
	providers: Provider[];
	scheduledServices: ScheduledService[];
	negotiations: Negotiation[];
	scheduledNegotiations: ScheduledNegotiation[];
}

export async function fetchAll(supabase: SupabaseClient): Promise<PagsupSnapshot> {
	const [cli, prest, cron, neg, negAg] = await Promise.all([
		supabase.from('pagsup_clientes').select('id, nome').order('nome', { ascending: true }),
		supabase
			.from('pagsup_prestadores')
			.select('id, cliente_id, nome, servico, regiao, valor_padrao, cpf, pix'),
		supabase.from('pagsup_cronograma').select('id, cliente_id, prestador_id, data, valor, observacoes'),
		supabase
			.from('pagsup_negociacoes')
			.select('id, cliente_id, empresa, servico, fornecedor, valor_contrato, pix, regiao, ddv'),
		supabase
			.from('pagsup_negociacoes_agendadas')
			.select('id, cliente_id, negociacao_id, data, valor, observacoes')
	]);

	const err = cli.error || prest.error || cron.error || neg.error || negAg.error;
	if (err) throw err;

	return {
		clients: (cli.data ?? []).map((c) => ({ id: c.id, name: c.nome })),
		providers: (prest.data ?? []).map((p) => ({
			id: p.id,
			clientId: p.cliente_id,
			name: p.nome,
			service: p.servico,
			region: p.regiao ?? '',
			defaultPrice: Number(p.valor_padrao ?? 0),
			cpf: p.cpf ?? '',
			pix: p.pix ?? ''
		})),
		scheduledServices: (cron.data ?? []).map((s) => ({
			id: s.id,
			clientId: s.cliente_id,
			providerId: s.prestador_id,
			date: s.data ?? '',
			price: toPrice(s.valor),
			notes: s.observacoes ?? ''
		})),
		negotiations: (neg.data ?? []).map((n) => ({
			id: n.id,
			clientId: n.cliente_id,
			company: n.empresa,
			service: n.servico ?? '',
			supplier: n.fornecedor ?? '',
			contractValue: Number(n.valor_contrato ?? 0),
			pix: n.pix ?? '',
			region: n.regiao ?? '',
			dueDate: n.ddv ?? ''
		})),
		scheduledNegotiations: (negAg.data ?? []).map((s) => ({
			id: s.id,
			clientId: s.cliente_id,
			negotiationId: s.negociacao_id,
			date: s.data ?? '',
			price: toPrice(s.valor),
			notes: s.observacoes ?? ''
		}))
	};
}

// ---- Clientes ------------------------------------------------------------

export async function insertClient(supabase: SupabaseClient, nome: string): Promise<Client> {
	const { data, error } = await supabase
		.from('pagsup_clientes')
		.insert({ nome })
		.select('id, nome')
		.single();
	if (error) throw error;
	return { id: data.id, name: data.nome };
}

// ---- Prestadores ---------------------------------------------------------

export async function insertProvider(supabase: SupabaseClient, p: Provider): Promise<void> {
	const { error } = await supabase.from('pagsup_prestadores').insert({
		id: p.id,
		cliente_id: p.clientId,
		nome: p.name,
		servico: p.service,
		regiao: p.region,
		valor_padrao: p.defaultPrice,
		cpf: p.cpf || null,
		pix: p.pix || null
	});
	if (error) throw error;
}

export async function updateProvider(
	supabase: SupabaseClient,
	id: string,
	patch: Partial<Provider>
): Promise<void> {
	const row: Record<string, unknown> = {};
	if (patch.name !== undefined) row.nome = patch.name;
	if (patch.service !== undefined) row.servico = patch.service;
	if (patch.region !== undefined) row.regiao = patch.region;
	if (patch.defaultPrice !== undefined) row.valor_padrao = patch.defaultPrice;
	if (patch.cpf !== undefined) row.cpf = patch.cpf || null;
	if (patch.pix !== undefined) row.pix = patch.pix || null;
	const { error } = await supabase.from('pagsup_prestadores').update(row).eq('id', id);
	if (error) throw error;
}

export async function deleteProvider(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('pagsup_prestadores').delete().eq('id', id);
	if (error) throw error;
}

// ---- Cronograma ----------------------------------------------------------

export async function insertScheduled(supabase: SupabaseClient, s: ScheduledService): Promise<void> {
	const { error } = await supabase.from('pagsup_cronograma').insert({
		id: s.id,
		cliente_id: s.clientId,
		prestador_id: s.providerId,
		data: s.date || null,
		valor: fromPrice(s.price),
		observacoes: s.notes || null
	});
	if (error) throw error;
}

export async function updateScheduled(
	supabase: SupabaseClient,
	id: string,
	patch: Partial<Pick<ScheduledService, 'price' | 'notes'>>
): Promise<void> {
	const row: Record<string, unknown> = {};
	if (patch.price !== undefined) row.valor = fromPrice(patch.price);
	if (patch.notes !== undefined) row.observacoes = patch.notes || null;
	const { error } = await supabase.from('pagsup_cronograma').update(row).eq('id', id);
	if (error) throw error;
}

export async function deleteScheduled(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('pagsup_cronograma').delete().eq('id', id);
	if (error) throw error;
}

export async function clearScheduledForClient(
	supabase: SupabaseClient,
	clientId: string
): Promise<void> {
	const { error } = await supabase.from('pagsup_cronograma').delete().eq('cliente_id', clientId);
	if (error) throw error;
}

// ---- Negociações ---------------------------------------------------------

export async function insertNegotiation(supabase: SupabaseClient, n: Negotiation): Promise<void> {
	const { error } = await supabase.from('pagsup_negociacoes').insert({
		id: n.id,
		cliente_id: n.clientId,
		empresa: n.company,
		servico: n.service || null,
		fornecedor: n.supplier || null,
		valor_contrato: n.contractValue,
		pix: n.pix || null,
		regiao: n.region || null,
		ddv: n.dueDate || null
	});
	if (error) throw error;
}

export async function insertScheduledNeg(
	supabase: SupabaseClient,
	s: ScheduledNegotiation
): Promise<void> {
	const { error } = await supabase.from('pagsup_negociacoes_agendadas').insert({
		id: s.id,
		cliente_id: s.clientId,
		negociacao_id: s.negotiationId,
		data: s.date || null,
		valor: fromPrice(s.price),
		observacoes: s.notes || null
	});
	if (error) throw error;
}

export async function updateScheduledNeg(
	supabase: SupabaseClient,
	id: string,
	patch: Partial<Pick<ScheduledNegotiation, 'price' | 'notes'>>
): Promise<void> {
	const row: Record<string, unknown> = {};
	if (patch.price !== undefined) row.valor = fromPrice(patch.price);
	if (patch.notes !== undefined) row.observacoes = patch.notes || null;
	const { error } = await supabase.from('pagsup_negociacoes_agendadas').update(row).eq('id', id);
	if (error) throw error;
}

export async function deleteScheduledNeg(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('pagsup_negociacoes_agendadas').delete().eq('id', id);
	if (error) throw error;
}

export async function clearScheduledNegForClient(
	supabase: SupabaseClient,
	clientId: string
): Promise<void> {
	const { error } = await supabase
		.from('pagsup_negociacoes_agendadas')
		.delete()
		.eq('cliente_id', clientId);
	if (error) throw error;
}
