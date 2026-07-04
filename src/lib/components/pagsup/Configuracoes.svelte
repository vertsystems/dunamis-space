<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { Settings, Layers } from '@lucide/svelte';

	// Área de configurações (ainda ilustrativa — persistência virá com a fase de dados).
	let empresa = $state('');
	let moeda = $state('BRL (R$)');
	const modulos = $state([
		{ label: 'Controle de Frota', active: false },
		{ label: 'Gestão de Contratos', active: false },
		{ label: 'Relatórios Avançados', active: true }
	]);
</script>

<div class="mx-auto max-w-3xl">
	<div class="mb-6">
		<h2 class="text-xl font-bold text-navy tracking-tight">Configurações</h2>
		<p class="text-sm text-grey mt-0.5">Gerencie as preferências e módulos do sistema.</p>
	</div>

	<div class="space-y-5">
		<Card padding="none">
			<div class="flex items-start gap-4 p-5 border-b border-grey-200">
				<span class="grid size-11 place-items-center rounded-[var(--radius)] bg-bg text-slate shrink-0">
					<Settings size={22} />
				</span>
				<div>
					<h3 class="text-base font-semibold text-navy">Geral</h3>
					<p class="text-sm text-grey mt-0.5">Configurações básicas do sistema e preferências.</p>
				</div>
			</div>
			<div class="p-5 space-y-5 bg-bg/40">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<label for="cfg-empresa" class="text-sm font-medium text-navy">Nome da Empresa</label>
					<input
						id="cfg-empresa"
						type="text"
						bind:value={empresa}
						placeholder="Minha Empresa Ltda"
						class="h-10 w-full sm:w-64 rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
					/>
				</div>
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<label for="cfg-moeda" class="text-sm font-medium text-navy">Moeda Padrão</label>
					<select
						id="cfg-moeda"
						bind:value={moeda}
						class="h-10 w-full sm:w-64 rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
					>
						<option>BRL (R$)</option>
						<option>USD ($)</option>
						<option>EUR (€)</option>
					</select>
				</div>
			</div>
		</Card>

		<Card padding="none">
			<div class="flex items-start gap-4 p-5 border-b border-grey-200">
				<span class="grid size-11 place-items-center rounded-[var(--radius)] bg-bg text-slate shrink-0">
					<Layers size={22} />
				</span>
				<div>
					<h3 class="text-base font-semibold text-navy">Módulos do Sistema</h3>
					<p class="text-sm text-grey mt-0.5">Ative ou desative módulos adicionais conforme a necessidade.</p>
				</div>
			</div>
			<div class="p-5 space-y-4 bg-bg/40">
				{#each modulos as m (m.label)}
					<div class="flex items-center justify-between gap-3">
						<span class="text-sm font-medium text-navy">{m.label}</span>
						<button
							type="button"
							role="switch"
							aria-checked={m.active}
							aria-label={m.label}
							onclick={() => (m.active = !m.active)}
							class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors {m.active
								? 'bg-brand'
								: 'bg-grey-200'}"
						>
							<span
								class="inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform {m.active
									? 'translate-x-6'
									: 'translate-x-1'}"
							></span>
						</button>
					</div>
				{/each}
			</div>
		</Card>
	</div>
</div>
