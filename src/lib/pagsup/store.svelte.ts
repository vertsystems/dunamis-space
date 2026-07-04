// Pag's Up — store de estado (Svelte 5 runes) com persistência em localStorage.
// Substitui os useState/useEffect do App.tsx original. Estado é global (singleton)
// para ser compartilhado entre os módulos (Cronograma, Prestadores, Negociações).
//
// Persistência real (Supabase) virá depois; por ora mantém o mesmo esquema de
// chaves `pagsup_*` em localStorage do app original.

import type { Provider, ScheduledService, Negotiation, ScheduledNegotiation, Client } from './types';
import { INITIAL_CLIENTS, INITIAL_PROVIDERS, INITIAL_NEGOTIATIONS } from './data';

const K_PROVIDERS = 'pagsup_providers';
const K_SCHEDULE = 'pagsup_schedule';
const K_NEGOTIATIONS = 'pagsup_negotiations';
const K_SCHED_NEG = 'pagsup_scheduled_negotiations';
const K_CLIENT = 'pagsup_selected_client';

/** ID curto aleatório (só roda no cliente, em resposta a interação). */
function uid(): string {
	return Math.random().toString(36).slice(2, 11);
}

/** Remove pontuação de CPF/CNPJ (mantém só dígitos/letras da chave). */
export function cleanDoc(v: string | undefined | null): string {
	return v ? v.replace(/[.\-/\\ ]/g, '') : '';
}

function read<T>(key: string, fallback: T): T {
	if (typeof localStorage === 'undefined') return fallback;
	const raw = localStorage.getItem(key);
	if (!raw) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function write(key: string, value: unknown) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* quota/priv mode — ignora */
	}
}

class PagsupStore {
	clients = $state<Client[]>(INITIAL_CLIENTS);
	selectedClientId = $state<string>('mari');

	providers = $state<Provider[]>(INITIAL_PROVIDERS);
	scheduledServices = $state<ScheduledService[]>([]);
	negotiations = $state<Negotiation[]>(INITIAL_NEGOTIATIONS);
	scheduledNegotiations = $state<ScheduledNegotiation[]>([]);

	constructor() {
		if (typeof localStorage === 'undefined') return;
		// Hidrata do localStorage já no cliente (a rota roda com ssr desligado).
		this.providers = read<Provider[]>(K_PROVIDERS, INITIAL_PROVIDERS).map((p) => ({
			...p,
			clientId: p.clientId || 'mari'
		}));
		this.scheduledServices = read<ScheduledService[]>(K_SCHEDULE, []).map((s) => ({
			...s,
			clientId: s.clientId || 'mari'
		}));
		this.negotiations = read<Negotiation[]>(K_NEGOTIATIONS, INITIAL_NEGOTIATIONS).map((n) => ({
			...n,
			clientId: n.clientId || 'mari'
		}));
		this.scheduledNegotiations = read<ScheduledNegotiation[]>(K_SCHED_NEG, []).map((sn) => ({
			...sn,
			clientId: sn.clientId || 'mari'
		}));
		this.selectedClientId = localStorage.getItem(K_CLIENT) || 'mari';
	}

	// ---- Derivados filtrados pelo cliente selecionado ----------------------
	filteredProviders = $derived(
		this.providers.filter((p) => (p.clientId ?? 'mari') === this.selectedClientId)
	);
	filteredScheduledServices = $derived(
		this.scheduledServices.filter((s) => (s.clientId ?? 'mari') === this.selectedClientId)
	);
	filteredNegotiations = $derived(
		this.negotiations.filter((n) => (n.clientId ?? 'mari') === this.selectedClientId)
	);
	filteredScheduledNegotiations = $derived(
		this.scheduledNegotiations.filter((sn) => (sn.clientId ?? 'mari') === this.selectedClientId)
	);

	get selectedClientName(): string {
		return this.clients.find((c) => c.id === this.selectedClientId)?.name ?? '';
	}

	// ---- Seleção de cliente ------------------------------------------------
	selectClient(id: string) {
		this.selectedClientId = id;
		if (typeof localStorage !== 'undefined') localStorage.setItem(K_CLIENT, id);
	}

	// ---- Prestadores -------------------------------------------------------
	#saveProviders() {
		write(K_PROVIDERS, this.providers);
	}

	addProvider(data: Omit<Provider, 'id' | 'clientId'>): Provider {
		const provider: Provider = {
			...data,
			cpf: cleanDoc(data.cpf),
			id: uid(),
			clientId: this.selectedClientId
		};
		this.providers = [...this.providers, provider];
		this.#saveProviders();
		return provider;
	}

	updateProvider(id: string, patch: Partial<Provider>) {
		this.providers = this.providers.map((p) =>
			p.id === id ? { ...p, ...patch, cpf: patch.cpf !== undefined ? cleanDoc(patch.cpf) : p.cpf } : p
		);
		this.#saveProviders();
	}

	deleteProvider(id: string) {
		this.providers = this.providers.filter((p) => p.id !== id);
		this.#saveProviders();
	}

	/** Restaura os prestadores do cliente atual para o seed (usado no "Finalizar"). */
	resetProvidersForCurrentClient() {
		const seed = INITIAL_PROVIDERS.filter((p) => (p.clientId ?? 'mari') === this.selectedClientId);
		this.providers = [
			...this.providers.filter((p) => (p.clientId ?? 'mari') !== this.selectedClientId),
			...seed
		];
		this.#saveProviders();
	}

	// ---- Cronograma (schedule) --------------------------------------------
	#saveSchedule() {
		write(K_SCHEDULE, this.scheduledServices);
	}

	scheduleProvider(providerId: string, price: number | '' = '', notes = '') {
		const item: ScheduledService = {
			id: uid(),
			clientId: this.selectedClientId,
			providerId,
			date: new Date().toISOString().split('T')[0],
			price,
			notes
		};
		this.scheduledServices = [...this.scheduledServices, item];
		this.#saveSchedule();
	}

	updateScheduled(id: string, patch: Partial<Pick<ScheduledService, 'price' | 'notes'>>) {
		this.scheduledServices = this.scheduledServices.map((s) =>
			s.id === id ? { ...s, ...patch } : s
		);
		this.#saveSchedule();
	}

	deleteScheduled(id: string) {
		this.scheduledServices = this.scheduledServices.filter((s) => s.id !== id);
		this.#saveSchedule();
	}

	clearScheduleForCurrentClient() {
		this.scheduledServices = this.scheduledServices.filter(
			(s) => (s.clientId ?? 'mari') !== this.selectedClientId
		);
		this.#saveSchedule();
	}

	// ---- Negociações -------------------------------------------------------
	#saveNegotiations() {
		write(K_NEGOTIATIONS, this.negotiations);
	}
	#saveSchedNeg() {
		write(K_SCHED_NEG, this.scheduledNegotiations);
	}

	addNegotiation(data: Omit<Negotiation, 'id' | 'clientId'>): Negotiation {
		const negotiation: Negotiation = { ...data, id: uid(), clientId: this.selectedClientId };
		this.negotiations = [...this.negotiations, negotiation];
		this.#saveNegotiations();
		return negotiation;
	}

	scheduleNegotiation(negotiationId: string, price: number | '', notes = '') {
		const item: ScheduledNegotiation = {
			id: uid(),
			clientId: this.selectedClientId,
			negotiationId,
			date: new Date().toISOString().split('T')[0],
			price,
			notes
		};
		this.scheduledNegotiations = [...this.scheduledNegotiations, item];
		this.#saveSchedNeg();
	}

	updateScheduledNeg(id: string, patch: Partial<Pick<ScheduledNegotiation, 'price' | 'notes'>>) {
		this.scheduledNegotiations = this.scheduledNegotiations.map((s) =>
			s.id === id ? { ...s, ...patch } : s
		);
		this.#saveSchedNeg();
	}

	removeScheduledNeg(id: string) {
		this.scheduledNegotiations = this.scheduledNegotiations.filter((s) => s.id !== id);
		this.#saveSchedNeg();
	}

	clearScheduledNegForCurrentClient() {
		this.scheduledNegotiations = this.scheduledNegotiations.filter(
			(sn) => (sn.clientId ?? 'mari') !== this.selectedClientId
		);
		this.#saveSchedNeg();
	}
}

export const pagsup = new PagsupStore();
