<script lang="ts">
	import TransacaoForm from '$lib/components/TransacaoForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Financeiro', href: '/financeiro' }, { label: 'Nova transação' }]} />

<Card>
	<h1 class="text-sm font-semibold text-navy mb-4">Nova transação</h1>
	{#if data.loadError}
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			{data.loadError}
		</div>
	{/if}
	<TransacaoForm
		transacao={form?.values ?? null}
		clientes={data.clientes}
		error={form?.error ?? null}
		submitLabel="Criar transação"
	/>
</Card>
