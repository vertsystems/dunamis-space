// Pag's Up — store de estado (Svelte 5 runes) com persistência no Supabase.
// Carga assíncrona via db.fetchAll; mutations são otimistas (atualizam a UI na
// hora e persistem em segundo plano, com rollback + toast em caso de erro).
// A seleção de cliente fica em localStorage só por conveniência de UX.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	Provider,
	ScheduledService,
	Negotiation,
	ScheduledNegotiation,
	Client,
	Payment
} from './types';
import { toast } from '$lib/toast.svelte';
import * as db from './db';
import { hojeISO } from '$lib/datas';

const K_CLIENT = 'pagsup_selected_client';

function uid(): string {
	return crypto.randomUUID();
}
function hoje(): string {
	return hojeISO();
}

/** Remove pontuação de CPF/CNPJ (mantém só dígitos/letras da chave). */
export function cleanDoc(v: string | undefined | null): string {
	return v ? v.replace(/[.\-/\\ ]/g, '') : '';
}

class PagsupStore {
	supabase: SupabaseClient | null = null;
	#ready = false;

	loading = $state(true);
	error = $state<string | null>(null);

	clients = $state<Client[]>([]);
	selectedClientId = $state<string>('');

	providers = $state<Provider[]>([]);
	scheduledServices = $state<ScheduledService[]>([]);
	negotiations = $state<Negotiation[]>([]);
	scheduledNegotiations = $state<ScheduledNegotiation[]>([]);
	/** Pagamentos já efetuados (histórico) — base da Planilha Mensal. */
	payments = $state<Payment[]>([]);

	// ---- Derivados filtrados pelo cliente selecionado ----------------------
	filteredProviders = $derived(this.providers.filter((p) => p.clientId === this.selectedClientId));
	filteredScheduledServices = $derived(
		this.scheduledServices.filter((s) => s.clientId === this.selectedClientId)
	);
	filteredNegotiations = $derived(
		this.negotiations.filter((n) => n.clientId === this.selectedClientId)
	);
	filteredScheduledNegotiations = $derived(
		this.scheduledNegotiations.filter((sn) => sn.clientId === this.selectedClientId)
	);

	get selectedClientName(): string {
		return this.clients.find((c) => c.id === this.selectedClientId)?.name ?? '';
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
			const snap = await db.fetchAll(this.supabase);
			this.clients = snap.clients;
			this.providers = snap.providers;
			this.scheduledServices = snap.scheduledServices;
			this.negotiations = snap.negotiations;
			this.scheduledNegotiations = snap.scheduledNegotiations;
			this.payments = snap.payments;

			const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(K_CLIENT) : null;
			this.selectedClientId =
				saved && this.clients.some((c) => c.id === saved) ? saved : (this.clients[0]?.id ?? '');
		} catch (e) {
			console.error('[pagsup] load', e);
			this.error = 'Não foi possível carregar os dados. Tente atualizar a página.';
		} finally {
			this.loading = false;
		}
	}

	/** Executa a persistência em segundo plano; reverte + avisa se falhar. */
	#persist(action: () => Promise<void>, rollback: () => void, errMsg: string) {
		if (!this.supabase) return;
		action().catch((e) => {
			console.error('[pagsup]', errMsg, e);
			rollback();
			toast.error(errMsg);
		});
	}

	// ---- Cliente -----------------------------------------------------------
	selectClient(id: string) {
		this.selectedClientId = id;
		if (typeof localStorage !== 'undefined') localStorage.setItem(K_CLIENT, id);
	}

	async addClient(nome: string): Promise<Client | null> {
		if (!this.supabase) return null;
		const trimmed = nome.trim();
		if (!trimmed) return null;
		try {
			const c = await db.insertClient(this.supabase, trimmed);
			this.clients = [...this.clients, c].sort((a, b) => a.name.localeCompare(b.name));
			this.selectClient(c.id);
			toast.success('Cliente adicionado');
			return c;
		} catch (e) {
			console.error('[pagsup] addClient', e);
			toast.error('Falha ao adicionar cliente.');
			return null;
		}
	}

	// ---- Prestadores -------------------------------------------------------
	addProvider(data: Omit<Provider, 'id' | 'clientId'>): Provider {
		const provider: Provider = {
			...data,
			cpf: cleanDoc(data.cpf),
			id: uid(),
			clientId: this.selectedClientId
		};
		this.providers = [...this.providers, provider];
		this.#persist(
			() => db.insertProvider(this.supabase!, provider),
			() => (this.providers = this.providers.filter((p) => p.id !== provider.id)),
			'Falha ao salvar prestador.'
		);
		return provider;
	}

	updateProvider(id: string, patch: Partial<Provider>) {
		const snapshot = this.providers;
		const clean = patch.cpf !== undefined ? { ...patch, cpf: cleanDoc(patch.cpf) } : patch;
		this.providers = this.providers.map((p) => (p.id === id ? { ...p, ...clean } : p));
		this.#persist(
			() => db.updateProvider(this.supabase!, id, clean),
			() => (this.providers = snapshot),
			'Falha ao atualizar prestador.'
		);
	}

	deleteProvider(id: string) {
		const snapProviders = this.providers;
		const snapSchedule = this.scheduledServices;
		this.providers = this.providers.filter((p) => p.id !== id);
		this.scheduledServices = this.scheduledServices.filter((s) => s.providerId !== id);
		this.#persist(
			() => db.deleteProvider(this.supabase!, id),
			() => {
				this.providers = snapProviders;
				this.scheduledServices = snapSchedule;
			},
			'Falha ao excluir prestador.'
		);
	}

	// ---- Cronograma --------------------------------------------------------
	scheduleProvider(providerId: string, price: number | '' = '', notes = '') {
		const item: ScheduledService = {
			id: uid(),
			clientId: this.selectedClientId,
			providerId,
			date: hoje(),
			price,
			notes
		};
		this.scheduledServices = [...this.scheduledServices, item];
		this.#persist(
			() => db.insertScheduled(this.supabase!, item),
			() => (this.scheduledServices = this.scheduledServices.filter((s) => s.id !== item.id)),
			'Falha ao escalar prestador.'
		);
	}

	updateScheduled(id: string, patch: Partial<Pick<ScheduledService, 'price' | 'notes'>>) {
		const snapshot = this.scheduledServices;
		this.scheduledServices = this.scheduledServices.map((s) => (s.id === id ? { ...s, ...patch } : s));
		this.#persist(
			() => db.updateScheduled(this.supabase!, id, patch),
			() => (this.scheduledServices = snapshot),
			'Falha ao atualizar item.'
		);
	}

	deleteScheduled(id: string) {
		const snapshot = this.scheduledServices;
		this.scheduledServices = this.scheduledServices.filter((s) => s.id !== id);
		this.#persist(
			() => db.deleteScheduled(this.supabase!, id),
			() => (this.scheduledServices = snapshot),
			'Falha ao remover item.'
		);
	}

	/**
	 * Finaliza o cronograma do cliente: cada item vira um pagamento no histórico
	 * (é isso que a Planilha Mensal soma no fim do mês) e o cronograma é limpo.
	 * Antes os itens eram simplesmente apagados e o mês ficava sem rastro.
	 */
	clearScheduleForCurrentClient(dataPagamento?: string) {
		const cid = this.selectedClientId;
		const data = dataPagamento || hoje();
		const doCliente = this.scheduledServices.filter((s) => s.clientId === cid);

		const novos: Payment[] = doCliente.map((s) => {
			const prov = this.providers.find((p) => p.id === s.providerId);
			return {
				id: uid(),
				clientId: cid,
				providerId: s.providerId,
				// Congelado no ato: editar o cadastro depois não reescreve o passado.
				providerName: prov?.name ?? '(prestador removido)',
				service: prov?.service ?? '',
				region: prov?.region ?? '',
				value: Number(s.price) || 0,
				date: data,
				notes: s.notes ?? '',
				lj: prov?.lj ?? ''
			};
		});

		const snapSchedule = this.scheduledServices;
		const snapPayments = this.payments;
		this.payments = [...novos, ...this.payments];
		this.scheduledServices = this.scheduledServices.filter((s) => s.clientId !== cid);

		this.#persist(
			async () => {
				await db.insertPayments(this.supabase!, novos);
				await db.clearScheduledForClient(this.supabase!, cid);
			},
			() => {
				this.scheduledServices = snapSchedule;
				this.payments = snapPayments;
			},
			'Falha ao finalizar cronograma.'
		);
		return novos.length;
	}

	// ---- Pagamentos (Planilha Mensal) --------------------------------------

	/** Lança um pagamento avulso — o que foi pago antes ou esquecido de registrar. */
	addPayment(data: Omit<Payment, 'id'>): Payment {
		const item: Payment = { ...data, id: uid() };
		const snapshot = this.payments;
		this.payments = [item, ...this.payments];
		this.#persist(
			() => db.insertPayments(this.supabase!, [item]),
			() => (this.payments = snapshot),
			'Falha ao registrar o pagamento.'
		);
		return item;
	}

	updatePayment(id: string, patch: Partial<Payment>) {
		const snapshot = this.payments;
		this.payments = this.payments.map((p) => (p.id === id ? { ...p, ...patch } : p));
		this.#persist(
			() => db.updatePayment(this.supabase!, id, patch),
			() => (this.payments = snapshot),
			'Falha ao salvar o pagamento.'
		);
	}

	deletePayment(id: string) {
		const snapshot = this.payments;
		this.payments = this.payments.filter((p) => p.id !== id);
		this.#persist(
			() => db.deletePayment(this.supabase!, id),
			() => (this.payments = snapshot),
			'Falha ao excluir o pagamento.'
		);
	}

	// ---- Negociações -------------------------------------------------------
	addNegotiation(data: Omit<Negotiation, 'id' | 'clientId'>): Negotiation {
		const negotiation: Negotiation = { ...data, id: uid(), clientId: this.selectedClientId };
		this.negotiations = [...this.negotiations, negotiation];
		this.#persist(
			() => db.insertNegotiation(this.supabase!, negotiation),
			() => (this.negotiations = this.negotiations.filter((n) => n.id !== negotiation.id)),
			'Falha ao salvar negociação.'
		);
		return negotiation;
	}

	/**
	 * Tira um serviço mensal do cadastro. Sem isto a lista de fixos só crescia:
	 * o que entrava uma vez ficava "padrão" para sempre.
	 */
	deleteNegotiation(id: string) {
		const snapNeg = this.negotiations;
		const snapSched = this.scheduledNegotiations;
		this.negotiations = this.negotiations.filter((n) => n.id !== id);
		this.scheduledNegotiations = this.scheduledNegotiations.filter((s) => s.negotiationId !== id);
		this.#persist(
			() => db.deleteNegotiation(this.supabase!, id),
			() => {
				this.negotiations = snapNeg;
				this.scheduledNegotiations = snapSched;
			},
			'Falha ao remover a negociação.'
		);
	}

	scheduleNegotiation(negotiationId: string, price: number | '', notes = '') {
		const item: ScheduledNegotiation = {
			id: uid(),
			clientId: this.selectedClientId,
			negotiationId,
			date: hoje(),
			price,
			notes
		};
		this.scheduledNegotiations = [...this.scheduledNegotiations, item];
		this.#persist(
			() => db.insertScheduledNeg(this.supabase!, item),
			() =>
				(this.scheduledNegotiations = this.scheduledNegotiations.filter((s) => s.id !== item.id)),
			'Falha ao escalar negociação.'
		);
	}

	updateScheduledNeg(id: string, patch: Partial<Pick<ScheduledNegotiation, 'price' | 'notes'>>) {
		const snapshot = this.scheduledNegotiations;
		this.scheduledNegotiations = this.scheduledNegotiations.map((s) =>
			s.id === id ? { ...s, ...patch } : s
		);
		this.#persist(
			() => db.updateScheduledNeg(this.supabase!, id, patch),
			() => (this.scheduledNegotiations = snapshot),
			'Falha ao atualizar negociação.'
		);
	}

	removeScheduledNeg(id: string) {
		const snapshot = this.scheduledNegotiations;
		this.scheduledNegotiations = this.scheduledNegotiations.filter((s) => s.id !== id);
		this.#persist(
			() => db.deleteScheduledNeg(this.supabase!, id),
			() => (this.scheduledNegotiations = snapshot),
			'Falha ao remover negociação.'
		);
	}

	clearScheduledNegForCurrentClient() {
		const cid = this.selectedClientId;
		const snapshot = this.scheduledNegotiations;
		this.scheduledNegotiations = this.scheduledNegotiations.filter((s) => s.clientId !== cid);
		this.#persist(
			() => db.clearScheduledNegForClient(this.supabase!, cid),
			() => (this.scheduledNegotiations = snapshot),
			'Falha ao finalizar negociações.'
		);
	}
}

export const pagsup = new PagsupStore();
