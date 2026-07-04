<script lang="ts">
	import { pagsup } from '$lib/pagsup/store.svelte';
	import Cronograma from '$lib/components/pagsup/Cronograma.svelte';
	import Prestadores from '$lib/components/pagsup/Prestadores.svelte';
	import Negociacoes from '$lib/components/pagsup/Negociacoes.svelte';
	import Configuracoes from '$lib/components/pagsup/Configuracoes.svelte';
	import { Button } from '$lib/components/ui';
	import { Calendar, Users, Briefcase, Settings } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type ModuleId = 'cronograma' | 'prestadores' | 'negociacoes' | 'configuracoes';
	let active = $state<ModuleId>('cronograma');

	const NAV = [
		{ id: 'cronograma', label: 'Cronograma', icon: Calendar },
		{ id: 'prestadores', label: 'Prestadores', icon: Users },
		{ id: 'negociacoes', label: 'Negociações', icon: Briefcase },
		{ id: 'configuracoes', label: 'Configurações', icon: Settings }
	] as const;

	// Inicializa o store com o cliente Supabase (autenticado) do layout.
	$effect(() => {
		if (data.supabase) pagsup.init(data.supabase);
	});
</script>

<svelte:head>
	<title>Pag's Up | Dunamis Space</title>
</svelte:head>

<div class="pagsup-root">
	<!-- Conteúdo do módulo ativo -->
	<div class="module-area">
		{#if pagsup.loading}
			<div class="flex flex-col items-center justify-center py-24 text-grey">
				<span class="size-8 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
				<p class="mt-3 text-sm">Carregando dados…</p>
			</div>
		{:else if pagsup.error}
			<div class="flex flex-col items-center justify-center py-24 text-center">
				<p class="text-brand-danger mb-3">{pagsup.error}</p>
				<Button variant="secondary" onclick={() => pagsup.load()}>Tentar novamente</Button>
			</div>
		{:else if active === 'cronograma'}
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
