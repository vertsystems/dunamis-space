import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Cadastrar e escalar no mesmo clique ("Novo Prestador" do Cronograma) dispara
 * dois inserts. O do cronograma tem FK obrigatória para o prestador, então ele
 * PRECISA chegar depois — quando chegava antes, o banco recusava, a linha sumia
 * da tela e só o prestador ficava salvo.
 */
const cena = vi.hoisted(() => ({
	ordem: [] as string[],
	liberarProvider: null as null | (() => void)
}));

vi.mock('./db', () => ({
	insertProvider: () =>
		new Promise<void>((resolve) => {
			cena.liberarProvider = () => {
				cena.ordem.push('provider');
				resolve();
			};
		}),
	insertScheduled: async () => {
		cena.ordem.push('scheduled');
	}
}));

const { pagsup } = await import('./store.svelte');

describe("Pag's Up — ordem dos inserts ao cadastrar já escalando", () => {
	beforeEach(() => {
		cena.ordem = [];
		cena.liberarProvider = null;
		// Um supabase de mentira só para o #persist não sair cedo.
		pagsup.supabase = {} as never;
		pagsup.providers = [];
		pagsup.scheduledServices = [];
		pagsup.clients = [{ id: 'cli-1', name: 'Lojas Mari' }];
		pagsup.selectedClientId = 'cli-1';
	});

	it('só insere no cronograma depois que o prestador chega ao banco', async () => {
		const p = pagsup.addProvider({
			name: 'Fulano',
			service: 'Carros e Veículos de Som',
			region: 'Piedade',
			cpf: '',
			pix: '',
			lj: 'PIE',
			defaultPrice: 150
		});
		pagsup.scheduleProvider(p.id, 150, 'obs');

		// Deixa as microtasks correrem: sem a espera, o insert do cronograma já
		// teria acontecido aqui, antes de o prestador existir.
		await Promise.resolve();
		await Promise.resolve();
		expect(cena.ordem).toEqual([]);

		cena.liberarProvider?.();
		await vi.waitFor(() => expect(cena.ordem).toEqual(['provider', 'scheduled']));

		// E a linha continua na tela.
		expect(pagsup.filteredScheduledServices).toHaveLength(1);
		expect(pagsup.providers).toHaveLength(1);
	});
});
