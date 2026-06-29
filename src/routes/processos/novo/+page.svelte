<script lang="ts">
	import ProcessoForm from '$lib/components/ProcessoForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { form } = $props();
</script>

<Breadcrumb items={[{ label: 'Processos', href: '/processos' }, { label: 'Novo' }]} />

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Novo processo</h1>
	<ProcessoForm processo={form?.values ?? null} error={form?.error ?? null} submitLabel="Criar processo" />
</Card>
