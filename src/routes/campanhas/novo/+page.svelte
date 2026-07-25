<script lang="ts">
	import CampanhaForm from '$lib/components/CampanhaForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Campanhas', href: '/campanhas' }, { label: 'Nova' }]} />

<Card>
	<h1 class="text-sm font-semibold text-navy mb-4">Nova campanha</h1>
	{#if data.loadError}
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			{data.loadError}
		</div>
	{/if}
	<CampanhaForm campanha={form?.values ?? null} clientes={data.clientes} error={form?.error ?? null} submitLabel="Criar campanha" />
</Card>
