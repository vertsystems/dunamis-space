<script lang="ts">
	import { pagsup } from '$lib/pagsup/store.svelte';
	import Cronograma from '$lib/components/pagsup/Cronograma.svelte';
	import Prestadores from '$lib/components/pagsup/Prestadores.svelte';
	import Negociacoes from '$lib/components/pagsup/Negociacoes.svelte';
	import PlanilhaMensal from '$lib/components/pagsup/PlanilhaMensal.svelte';
	import { Button } from '$lib/components/ui';
	import { Calendar, Users, Briefcase, FileSpreadsheet } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type ModuleId = 'cronograma' | 'mensal' | 'prestadores' | 'negociacoes';
	let active = $state<ModuleId>('cronograma');

	const NAV = [
		{ id: 'cronograma', label: 'Cronograma', icon: Calendar },
		{ id: 'mensal', label: 'Planilha Mensal', icon: FileSpreadsheet },
		{ id: 'prestadores', label: 'Prestadores', icon: Users },
		{ id: 'negociacoes', label: 'Negociações', icon: Briefcase }
	] as const;

	// Inicializa o store com o cliente Supabase (autenticado) do layout.
	$effect(() => {
		if (data.supabase) pagsup.init(data.supabase);
	});
</script>

<svelte:head>
	<title>Pag's Up | Dunamis Space</title>
</svelte:head>

{#snippet abas()}
	<!-- As abas ficam na MESMA linha das ações de cada módulo (Total, botões...),
	     por isso são passadas como snippet em vez de renderizadas aqui: cada tela
	     as coloca à esquerda da própria barra, no lugar do antigo título. -->
	<nav class="inline-flex shrink-0 self-start rounded-full bg-bg p-0.5" aria-label="Módulos do Pag's Up">
		{#each NAV as item (item.id)}
			{@const Ico = item.icon}
			<button
				type="button"
				onclick={() => (active = item.id)}
				aria-current={active === item.id ? 'page' : undefined}
				class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors {active ===
				item.id
					? 'bg-surface text-navy shadow-sm'
					: 'text-grey hover:text-navy'}"
			>
				<Ico size={15} />
				<span class="hidden sm:inline">{item.label}</span>
			</button>
		{/each}
	</nav>
{/snippet}

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
	<Cronograma {abas} />
{:else if active === 'mensal'}
	<PlanilhaMensal {abas} />
{:else if active === 'prestadores'}
	<Prestadores {abas} />
{:else}
	<Negociacoes {abas} />
{/if}
