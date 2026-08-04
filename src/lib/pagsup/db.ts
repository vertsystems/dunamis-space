// Pag's Up — acesso a dados no Supabase (tabelas pagsup_*).
// Mapeia as linhas do banco (colunas em pt) para os tipos do app e vice-versa.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	Client,
	Provider,
	ScheduledService,
	Negotiation,
	ScheduledNegotiation,
	Payment
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
	payments: Payment[];
}

export async function fetchAll(supabase: SupabaseClient): Promise<PagsupSnapshot> {
	const [cli, prest, cron, neg, negAg, pag] = await Promise.all([
		supabase.from('pagsup_clientes').select('id, nome').order('nome', { ascending: true }),
		supabase
			.from('pagsup_prestadores')
			.select('id, cliente_id, nome, servico, regiao, valor_padrao, cpf, pix, lj'),
		supabase.from('pagsup_cronograma').select('id, cliente_id, prestador_id, data, valor, observacoes'),
		supabase
			.from('pagsup_negociacoes')
			.select('id, cliente_id, empresa, servico, fornecedor, valor_contrato, pix, regiao, ddv'),
		supabase
			.from('pagsup_negociacoes_agendadas')
			.select('id, cliente_id, negociacao_id, data, valor, observacoes'),
		supabase
			.from('pagsup_pagamentos')
			.select('id, cliente_id, prestador_id, prestador_nome, servico, regiao, valor, data_pagamento, observacoes, lj')
			.order('data_pagamento', { ascending: false })
	]);

	const err = cli.error || prest.error || cron.error || neg.error || negAg.error;
	if (err) throw err;
	// Pagamentos à parte: se a migration 0046 ainda não rodou, o resto do Pag's
	// Up continua funcionando e só a Planilha Mensal fica vazia.
	if (pag.error) console.error('[pagsup] pagamentos', pag.error);

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
			pix: p.pix ?? '',
			lj: p.lj ?? ''
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
		})),
		payments: (pag.data ?? []).map((p) => ({
			id: p.id,
			clientId: p.cliente_id,
			providerId: p.prestador_id,
			providerName: p.prestador_nome,
			service: p.servico,
			region: p.regiao ?? '',
			value: Number(p.valor ?? 0),
			date: p.data_pagamento,
			notes: p.observacoes ?? '',
			lj: p.lj ?? ''
		}))
	};
}

// ---- Pagamentos (Planilha Mensal) ---------------------------------------

function pagamentoRow(p: Payment) {
	return {
		id: p.id,
		cliente_id: p.clientId,
		prestador_id: p.providerId ?? null,
		prestador_nome: p.providerName,
		servico: p.service,
		regiao: p.region ?? null,
		valor: p.value,
		data_pagamento: p.date,
		observacoes: p.notes || null,
		lj: p.lj || null
	};
}

export async function insertPayments(supabase: SupabaseClient, ps: Payment[]): Promise<void> {
	if (!ps.length) return;
	const { error } = await supabase.from('pagsup_pagamentos').insert(ps.map(pagamentoRow));
	if (error) throw error;
}

export async function updatePayment(
	supabase: SupabaseClient,
	id: string,
	patch: Partial<Payment>
): Promise<void> {
	const row: Record<string, unknown> = {};
	if (patch.value !== undefined) row.valor = patch.value;
	if (patch.date !== undefined) row.data_pagamento = patch.date;
	if (patch.notes !== undefined) row.observacoes = patch.notes || null;
	if (patch.service !== undefined) row.servico = patch.service;
	if (patch.lj !== undefined) row.lj = patch.lj || null;
	const { error } = await supabase.from('pagsup_pagamentos').update(row).eq('id', id);
	if (error) throw error;
}

export async function deletePayment(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('pagsup_pagamentos').delete().eq('id', id);
	if (error) throw error;
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
		pix: p.pix || null,
		lj: p.lj || null
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
	if (patch.lj !== undefined) row.lj = patch.lj || null;
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

export async function deleteNegotiation(supabase: SupabaseClient, id: string): Promise<void> {
	// As escalas saem junto: uma negociação fora do cadastro não pode continuar
	// escalada em mês nenhum.
	const { error: e1 } = await supabase
		.from('pagsup_negociacoes_agendadas')
		.delete()
		.eq('negociacao_id', id);
	if (e1) throw e1;
	const { error } = await supabase.from('pagsup_negociacoes').delete().eq('id', id);
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
