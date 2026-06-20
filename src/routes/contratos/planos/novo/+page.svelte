<script lang="ts">
	import PlanoForm from '$lib/components/PlanoForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { form } = $props();
</script>

<Breadcrumb
	items={[
		{ label: 'Contratos', href: '/contratos' },
		{ label: 'Planos', href: '/contratos/planos' },
		{ label: 'Novo' }
	]}
/>

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Novo plano</h1>
	<PlanoForm plano={form?.values ?? null} error={form?.error ?? null} submitLabel="Criar plano" />
</Card>
