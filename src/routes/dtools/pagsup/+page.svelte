<script lang="ts">
	import { pagsup } from '$lib/pagsup/store.svelte';
	import Cronograma from '$lib/components/pagsup/Cronograma.svelte';
	import Prestadores from '$lib/components/pagsup/Prestadores.svelte';
	import Negociacoes from '$lib/components/pagsup/Negociacoes.svelte';
	import Configuracoes from '$lib/components/pagsup/Configuracoes.svelte';
	import { Calendar, Users, Briefcase, Settings, Building2, FileUp } from '@lucide/svelte';

	type ModuleId = 'cronograma' | 'prestadores' | 'negociacoes' | 'configuracoes';
	let active = $state<ModuleId>('cronograma');

	const NAV = [
		{ id: 'cronograma', label: 'Cronograma', icon: Calendar },
		{ id: 'prestadores', label: 'Prestadores', icon: Users },
		{ id: 'negociacoes', label: 'Negociações', icon: Briefcase },
		{ id: 'configuracoes', label: 'Configurações', icon: Settings }
	] as const;

	const showClient = $derived(active !== 'configuracoes');
</script>

<svelte:head>
	<title>Pag's Up | Dunamis Space</title>
</svelte:head>

<div class="pagsup-root">
	<!-- Cabeçalho: marca + seletor de cliente -->
	<div class="flex flex-wrap items-center justify-between gap-4 mb-6">
		<div class="flex items-center gap-3">
			<span class="grid size-11 place-items-center rounded-[var(--radius-lg)] bg-navy text-white shadow-sm">
				<FileUp size={22} strokeWidth={2.4} />
			</span>
			<div>
				<h1 class="text-xl font-bold text-navy leading-none">Pag's Up</h1>
				<p class="text-[11px] font-semibold text-grey uppercase tracking-[0.14em] mt-1">Gestão de Marketing Inteligente</p>
			</div>
		</div>

		{#if showClient}
			<div class="flex items-center gap-3 rounded-[var(--radius-lg)] border border-grey-200 bg-surface px-4 h-12 shadow-sm">
				<span class="grid size-8 place-items-center rounded-[var(--radius-sm)] bg-brand/10 text-brand"><Building2 size={18} /></span>
				<label for="pagsup-client" class="text-[10px] font-semibold text-grey uppercase tracking-wider whitespace-nowrap">Cliente</label>
				<select
					id="pagsup-client"
					value={pagsup.selectedClientId}
					onchange={(e) => pagsup.selectClient(e.currentTarget.value)}
					class="bg-transparent text-navy font-bold text-sm outline-none cursor-pointer pr-1"
				>
					{#each pagsup.clients as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
				</select>
			</div>
		{/if}
	</div>

	<!-- Conteúdo do módulo ativo -->
	<div class="module-area">
		{#if active === 'cronograma'}
			<Cronograma />
		{:else if active === 'prestadores'}
			<Prestadores />
		{:else if active === 'negociacoes'}
			<Negociacoes />
		{:else}
			<Configuracoes />
		{/if}
	</div>

	<!-- Barra de navegação inferior (dock) -->
	<nav class="pagsup-dock" aria-label="Módulos do Pag's Up">
		{#each NAV as item (item.id)}
			{@const Ico = item.icon}
			<button class:is-active={active === item.id} onclick={() => (active = item.id)}>
				<Ico size={19} />
				<span>{item.label}</span>
			</button>
		{/each}
	</nav>
</div>

<style>
	/* espaço para o conteúdo não ficar atrás do dock flutuante */
	.module-area {
		padding-bottom: 6rem;
	}

	.pagsup-dock {
		position: fixed;
		bottom: 1.4rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 25;
		display: flex;
		gap: 0.2rem;
		padding: 0.4rem;
		background: rgba(255, 255, 255, 0.75);
		backdrop-filter: blur(20px) saturate(180%);
		-webkit-backdrop-filter: blur(20px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.65);
		border-radius: 20px;
		box-shadow:
			0 14px 34px -10px rgba(16, 24, 40, 0.2),
			0 2px 6px rgba(16, 24, 40, 0.06);
		max-width: calc(100vw - 1.5rem);
		overflow-x: auto;
	}

	.pagsup-dock button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1.1rem;
		border-radius: 14px;
		border: none;
		background: transparent;
		color: #5b6576;
		font-weight: 600;
		font-size: 0.85rem;
		white-space: nowrap;
		cursor: pointer;
		transition:
			background-color 0.18s ease,
			color 0.18s ease,
			box-shadow 0.18s ease;
	}

	.pagsup-dock button:hover {
		background: rgba(16, 24, 40, 0.05);
		color: #1c2534;
	}

	.pagsup-dock button.is-active {
		background: var(--color-brand, #3b6ef6);
		color: #fff;
		box-shadow: 0 4px 12px -2px rgba(59, 110, 246, 0.5);
	}

	@media (max-width: 640px) {
		.pagsup-dock button span {
			display: none;
		}
		.pagsup-dock button {
			padding: 0.6rem 0.85rem;
		}
	}
</style>
