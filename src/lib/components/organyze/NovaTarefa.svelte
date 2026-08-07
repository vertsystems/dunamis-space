<script lang="ts">
	// Caixa de adicionar tarefa do modo Dia: título, lado (Empresa / Vida
	// Pessoal) e um prazo opcional que só aparece quando pedido.
	import { organyze } from '$lib/organyze/store.svelte';
	import { CATEGORIAS, CATEGORIA_COR, CATEGORIA_LABEL } from '$lib/organyze/types';
	import type { Categoria } from '$lib/organyze/types';
	import { Button } from '$lib/components/ui';
	import { CalendarClock, Plus } from '@lucide/svelte';

	let titulo = $state('');
	let prazo = $state('');
	let lado = $state<Categoria>('empresa');
	let mostrarPrazo = $state(false);

	function adicionar() {
		if (organyze.addTarefa(titulo, prazo || null, lado)) {
			titulo = '';
			prazo = '';
			mostrarPrazo = false;
		}
	}
</script>

<div class="space-y-2">
	<!-- Lado da nova tarefa: Empresa | Vida Pessoal -->
	<div class="inline-flex rounded-[var(--radius)] border border-grey-200 bg-surface p-0.5">
		{#each CATEGORIAS as cat (cat)}
			<button
				class="rounded-[calc(var(--radius)-3px)] px-3 py-1 text-xs font-semibold transition-colors"
				class:text-white={lado === cat}
				class:text-grey={lado !== cat}
				style:background={lado === cat ? CATEGORIA_COR[cat] : 'transparent'}
				onclick={() => (lado = cat)}
			>
				{CATEGORIA_LABEL[cat]}
			</button>
		{/each}
	</div>
	<div class="flex gap-2">
		<input
			class="h-11 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-4 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
			placeholder="O que precisa ser feito?"
			bind:value={titulo}
			onkeydown={(e) => e.key === 'Enter' && adicionar()}
		/>
		<button
			class="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] border transition-colors"
			class:border-grey-200={!mostrarPrazo && !prazo}
			class:text-grey={!mostrarPrazo && !prazo}
			class:border-brand={mostrarPrazo || prazo}
			class:text-brand={mostrarPrazo || prazo}
			title="Definir prazo de entrega (opcional)"
			aria-label="Definir prazo de entrega"
			onclick={() => (mostrarPrazo = !mostrarPrazo)}
		>
			<CalendarClock size={18} />
		</button>
		<Button onclick={adicionar} disabled={!titulo.trim()}>
			<Plus size={18} /> Adicionar
		</Button>
	</div>
	{#if mostrarPrazo}
		<div class="flex items-center gap-2 px-1">
			<span class="text-xs font-medium text-grey">Prazo de entrega:</span>
			<input
				type="date"
				bind:value={prazo}
				class="h-8 rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-xs text-navy outline-none focus-visible:border-brand [color-scheme:light]"
			/>
			{#if prazo}
				<button class="text-xs font-medium text-grey hover:text-brand-danger" onclick={() => (prazo = '')}>
					limpar
				</button>
			{/if}
		</div>
	{/if}
</div>
