<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, Button } from '$lib/components/ui';
	import ProcessosGrid from '$lib/components/ProcessosGrid.svelte';

	let { data } = $props();
</script>

<div class="flex items-center justify-between gap-3 mb-4">
	<div>
		<h1 class="text-lg font-semibold text-navy">Cronograma de Processos</h1>
		<p class="text-sm text-grey">Visão tabular dos processos e etapas</p>
	</div>
	<Button onclick={() => goto('/processos/novo')}>+ Novo processo</Button>
</div>

{#if data.processosPendente}
	<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
		Aplique a migration <code class="font-mono">supabase/migrations/0004_processos.sql</code> no SQL Editor do Supabase para ativar o módulo.
	</div>
{:else}
	<Card>
		<ProcessosGrid processos={data.processos} />
	</Card>
{/if}
