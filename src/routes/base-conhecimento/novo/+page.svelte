<script lang="ts">
	import KbForm from '$lib/components/KbForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Base de Conhecimento', href: '/base-conhecimento' }, { label: 'Novo' }]} />

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Novo artigo</h1>
	<KbForm artigo={form?.values ?? null} clientes={data.clientes} error={form?.error ?? null} submitLabel="Criar artigo" />
</Card>
