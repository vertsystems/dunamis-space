<script lang="ts">
	import TransacaoForm from '$lib/components/TransacaoForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Financeiro', href: '/financeiro' }, { label: 'Nova transação' }]} />

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Nova transação</h1>
	<TransacaoForm
		transacao={form?.values ?? null}
		clientes={data.clientes}
		error={form?.error ?? null}
		submitLabel="Criar transação"
	/>
</Card>
