<script lang="ts">
	import ContratoForm from '$lib/components/ContratoForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Contratos', href: '/contratos' }, { label: 'Novo' }]} />

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Novo contrato</h1>
	<ContratoForm
		contrato={form?.values ?? null}
		clientes={data.clientes}
		planos={data.planos}
		error={form?.error ?? null}
		submitLabel="Criar contrato"
	/>
</Card>
