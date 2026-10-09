// Pag's Up — acesso a dados no Supabase (tabelas pagsup_*).
// Mapeia as linhas do banco (colunas em pt) para os tipos do app e vice-versa.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	Client,
	Provider,
	ScheduledService,
	Negotiation,
	ScheduledNegotiation,
	Payment,
	PaymentDoc,
	DocTipo
} from './types';
import { DOCS_BUCKET } from './documentos';

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
	/**
	 * A migration 0069 (NF/recibo e link público) já rodou? Enquanto não, a
	 * Planilha Mensal esconde a coluna de documentos e o link do financeiro.
	 */
	docsAtivos: boolean;
}

/** A linha do banco → o documento do pagamento (null = sem documento). */
function docDaLinha(p: Record<string, unknown>): PaymentDoc | null {
	if (!p.doc_tipo) return null;
	return {
		tipo: p.doc_tipo as DocTipo,
		arquivo: (p.doc_arquivo as string | null) ?? null,
		nome: (p.doc_nome as string | null) ?? '',
		bytes: Number(p.doc_bytes ?? 0),
		enviadoEm: (p.doc_enviado_em as string | null) ?? '',
		apagadoEm: (p.doc_apagado_em as string | null) ?? null
	};
}

/**
 * A API do Supabase corta em 1000 linhas por resposta (max-rows), silenciosamente
 * — sem erro, sem aviso. Cronograma e pagamentos crescem para sempre, então
 * varremos em páginas: enquanto vier uma página cheia, pede a próxima.
 *
 * Verificado em produção (07/08/2026): o teto é mesmo 1000. A maior tabela tinha
 * 74 linhas na época, então isto é prevenção — o dia em que estourar, a Planilha
 * Mensal perderia os meses mais antigos sem ninguém perceber.
 */
const PAGINA = 1000;

async function todasAsPaginas<T>(
	montar: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<{ data: T[]; error: unknown }> {
	const tudo: T[] = [];
	for (let de = 0; ; de += PAGINA) {
		const { data, error } = await montar(de, de + PAGINA - 1);
		if (error) return { data: tudo, error };
		const lote = data ?? [];
		tudo.push(...lote);
		if (lote.length < PAGINA) return { data: tudo, error: null };
	}
}

export async function fetchAll(supabase: SupabaseClient): Promise<PagsupSnapshot> {
	const [cli, prest, cron, neg, negAg, pag] = await Promise.all([
		// '*' pelo mesmo motivo das negociações agendadas logo abaixo: token_publico
		// só existe depois da migration 0069, e pedi-lo pelo nome antes disso
		// derrubaria o Pag's Up inteiro.
		supabase.from('pagsup_clientes').select('*').order('nome', { ascending: true }),
		supabase
			.from('pagsup_prestadores')
			.select('id, cliente_id, nome, servico, regiao, valor_padrao, cpf, pix, whatsapp, especialidade, lj'),
		todasAsPaginas((de, ate) =>
			supabase
				.from('pagsup_cronograma')
				.select('id, cliente_id, prestador_id, data, valor, observacoes')
				.order('data', { ascending: true })
				.range(de, ate)
		),
		supabase
			.from('pagsup_negociacoes')
			.select('id, cliente_id, empresa, servico, fornecedor, valor_contrato, pix, regiao, ddv'),
		// select('*') e não a lista de colunas: pedir mes_fechado pelo nome faz o
		// PostgREST devolver erro enquanto a migration 0048 não roda, e aí o Pag's
		// Up inteiro deixa de carregar. Com '*', a coluna aparece quando existir.
		supabase.from('pagsup_negociacoes_agendadas').select('*'),
		todasAsPaginas((de, ate) =>
			supabase
				.from('pagsup_pagamentos')
				// '*': as colunas doc_* chegam com a migration 0069 (ver os clientes).
				.select('*')
				.order('data_pagamento', { ascending: false })
				.range(de, ate)
		)
	]);

	const err = cli.error || prest.error || cron.error || neg.error || negAg.error;
	if (err) throw err;
	// Pagamentos à parte: se a migration 0046 ainda não rodou, o resto do Pag's
	// Up continua funcionando e só a Planilha Mensal fica vazia.
	if (pag.error) console.error('[pagsup] pagamentos', pag.error);

	return {
		clients: (cli.data ?? []).map((c) => ({
			id: c.id,
			name: c.nome,
			publicToken: c.token_publico ?? null
		})),
		providers: (prest.data ?? []).map((p) => ({
			id: p.id,
			clientId: p.cliente_id,
			name: p.nome,
			service: p.servico,
			region: p.regiao ?? '',
			defaultPrice: Number(p.valor_padrao ?? 0),
			cpf: p.cpf ?? '',
			pix: p.pix ?? '',
			whatsapp: p.whatsapp ?? '',
			especialidade: p.especialidade ?? '',
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
			notes: s.observacoes ?? '',
			closedMonth: s.mes_fechado ?? ''
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
			lj: p.lj ?? '',
			doc: docDaLinha(p)
		})),
		docsAtivos: !!cli.data?.length && 'token_publico' in cli.data[0]
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

// ---- NF / recibo do pagamento -------------------------------------------

/** Sobe o PDF já compactado. Nome novo a cada envio: nada é sobrescrito. */
export async function uploadDocumento(
	supabase: SupabaseClient,
	caminho: string,
	bytes: Uint8Array
): Promise<void> {
	const { error } = await supabase.storage
		.from(DOCS_BUCKET)
		.upload(caminho, new Blob([bytes as BlobPart], { type: 'application/pdf' }), {
			contentType: 'application/pdf',
			// O arquivo nunca muda (troca = nome novo), então pode ficar em cache.
			cacheControl: '31536000',
			upsert: false
		});
	if (error) throw error;
}

/** Grava (ou limpa, com null) o documento na linha do pagamento. */
export async function salvarDocumento(
	supabase: SupabaseClient,
	pagamentoId: string,
	doc: PaymentDoc | null
): Promise<void> {
	const { error } = await supabase
		.from('pagsup_pagamentos')
		.update({
			doc_tipo: doc?.tipo ?? null,
			doc_arquivo: doc?.arquivo ?? null,
			doc_nome: doc?.nome || null,
			doc_bytes: doc?.bytes ?? null,
			doc_enviado_em: doc?.enviadoEm || null,
			doc_apagado_em: doc?.apagadoEm ?? null
		})
		.eq('id', pagamentoId);
	if (error) throw error;
}

export async function removerArquivos(supabase: SupabaseClient, caminhos: string[]): Promise<void> {
	if (!caminhos.length) return;
	const { error } = await supabase.storage.from(DOCS_BUCKET).remove(caminhos);
	if (error) throw error;
}

/** Liga (token novo) ou desliga (null) o link público do financeiro. */
export async function setTokenPublico(
	supabase: SupabaseClient,
	clienteId: string,
	token: string | null
): Promise<void> {
	const { error } = await supabase
		.from('pagsup_clientes')
		.update({ token_publico: token })
		.eq('id', clienteId);
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

function prestadorRow(p: Provider) {
	return {
		id: p.id,
		cliente_id: p.clientId,
		nome: p.name,
		servico: p.service,
		regiao: p.region,
		valor_padrao: p.defaultPrice,
		cpf: p.cpf || null,
		pix: p.pix || null,
		whatsapp: p.whatsapp || null,
		especialidade: p.especialidade || null,
		lj: p.lj || null
	};
}

export async function insertProvider(supabase: SupabaseClient, p: Provider): Promise<void> {
	const { error } = await supabase.from('pagsup_prestadores').insert(prestadorRow(p));
	if (error) throw error;
}

/**
 * Cadastra vários prestadores de uma vez (importação de planilha). Um insert só:
 * uma planilha de 80 linhas por insertProvider seriam 80 requisições, e um erro
 * no meio deixava metade cadastrada.
 */
export async function insertProviders(supabase: SupabaseClient, ps: Provider[]): Promise<void> {
	if (!ps.length) return;
	const { error } = await supabase.from('pagsup_prestadores').insert(ps.map(prestadorRow));
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
	if (patch.whatsapp !== undefined) row.whatsapp = patch.whatsapp || null;
	if (patch.especialidade !== undefined) row.especialidade = patch.especialidade || null;
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

/**
 * Carimba o mês fechado nas linhas escaladas. Substituiu o antigo
 * clearScheduledNegForClient: a lista não é mais apagada no fim do mês, só
 * marcada — quem se repete todo mês continua lá.
 */
export async function markScheduledNegClosed(
	supabase: SupabaseClient,
	ids: string[],
	mes: string
): Promise<void> {
	if (!ids.length) return;
	const { error } = await supabase
		.from('pagsup_negociacoes_agendadas')
		.update({ mes_fechado: mes })
		.in('id', ids);
	if (error) throw error;
}
