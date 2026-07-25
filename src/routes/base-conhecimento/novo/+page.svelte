<script lang="ts">
	import KbForm from '$lib/components/KbForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Base de Conhecimento', href: '/base-conhecimento' }, { label: 'Novo' }]} />

<Card>
	<h1 class="text-sm font-semibold text-navy mb-4">Novo artigo</h1>
	{#if data.loadError}
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			{data.loadError}
		</div>
	{/if}
	<KbForm artigo={form?.values ?? null} clientes={data.clientes} error={form?.error ?? null} submitLabel="Criar artigo" />
</Card>
