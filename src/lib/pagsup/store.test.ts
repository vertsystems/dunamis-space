import { describe, it, expect, beforeEach } from 'vitest';
import { pagsup } from './store.svelte';

/**
 * Fluxo do "Novo Prestador" do Cronograma: cadastrar já escalando, com a LJ
 * escolhida no formulário. Sem supabase o store só mantém o estado local (o
 * #persist sai cedo), que é justamente o que a tela lê para desenhar a linha.
 */
describe('Pag\'s Up — LJ ao cadastrar prestador pelo cronograma', () => {
	beforeEach(() => {
		pagsup.supabase = null;
		pagsup.providers = [];
		pagsup.scheduledServices = [];
		pagsup.clients = [{ id: 'cli-1', name: 'Lojas Mari' }];
		pagsup.selectedClientId = 'cli-1';
	});

	it('guarda a LJ no prestador criado', () => {
		const p = pagsup.addProvider({
			name: 'Fulano',
			service: 'Carro de Som',
			region: 'Piedade',
			cpf: '123.456.789-00',
			pix: 'x',
			lj: 'PIE',
			defaultPrice: 150
		});
		expect(p.lj).toBe('PIE');
		expect(pagsup.providers[0].lj).toBe('PIE');
	});

	it('a linha do cronograma enxerga a LJ do prestador recém-criado', () => {
		const p = pagsup.addProvider({
			name: 'Fulano',
			service: 'Carro de Som',
			region: 'Piedade',
			cpf: '',
			pix: '',
			lj: 'REG1',
			defaultPrice: 150
		});
		pagsup.scheduleProvider(p.id, 150, 'obs');

		// Mesma resolução que o groupedSchedule da tela faz.
		const item = pagsup.filteredScheduledServices[0];
		const provider = pagsup.filteredProviders.find((x) => x.id === item.providerId);
		expect(provider?.lj).toBe('REG1');
	});

	it('editar a LJ na linha atualiza o cadastro', () => {
		const p = pagsup.addProvider({
			name: 'Fulano',
			service: 'Carro de Som',
			region: 'Piedade',
			cpf: '',
			pix: '',
			lj: '',
			defaultPrice: 0
		});
		pagsup.updateProvider(p.id, { lj: 'ADB' });
		expect(pagsup.providers[0].lj).toBe('ADB');
	});
});
