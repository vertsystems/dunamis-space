<script lang="ts">
	// Caixa de adicionar tarefa do modo Dia: título, lado (Empresa / Vida
	// Pessoal) e, opcionalmente, o dia para o qual a tarefa é agendada.
	import { organyze } from '$lib/organyze/store.svelte';
	import { CATEGORIAS, CATEGORIA_COR, CATEGORIA_LABEL } from '$lib/organyze/types';
	import type { Categoria } from '$lib/organyze/types';
	import { fmtDiaMes } from '$lib/organyze/ui';
	import { Button } from '$lib/components/ui';
	import { CalendarClock, Plus } from '@lucide/svelte';

	let titulo = $state('');
	// Dia em que a tarefa vai cair no quadro. Vazio = o dia em foco.
	let agendarPara = $state('');
	let lado = $state<Categoria>('empresa');
	let mostrarAgenda = $state(false);

	function adicionar() {
		if (organyze.addTarefa(titulo, agendarPara || null, lado)) {
			titulo = '';
			agendarPara = '';
			mostrarAgenda = false;
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
			class:border-grey-200={!mostrarAgenda && !agendarPara}
			class:text-grey={!mostrarAgenda && !agendarPara}
			class:border-brand={mostrarAgenda || agendarPara}
			class:text-brand={mostrarAgenda || agendarPara}
			title="Agendar para outro dia (opcional)"
			aria-label="Agendar para outro dia"
			onclick={() => (mostrarAgenda = !mostrarAgenda)}
		>
			<CalendarClock size={18} />
		</button>
		<Button onclick={adicionar} disabled={!titulo.trim()}>
			<Plus size={18} /> Adicionar
		</Button>
	</div>
	{#if mostrarAgenda}
		<div class="flex flex-wrap items-center gap-2 px-1">
			<span class="text-xs font-medium text-grey">Agendar para:</span>
			<input
				type="date"
				bind:value={agendarPara}
				class="h-8 rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-xs text-navy outline-none focus-visible:border-brand [color-scheme:light]"
			/>
			{#if agendarPara}
				<!-- Deixa claro que a tarefa não vai ficar no quadro que está à vista. -->
				<span class="text-xs text-grey">
					aparece só no quadro de {fmtDiaMes(agendarPara)}
				</span>
				<button class="text-xs font-medium text-grey hover:text-brand-danger" onclick={() => (agendarPara = '')}>
					limpar
				</button>
			{/if}
		</div>
	{/if}
</div>
