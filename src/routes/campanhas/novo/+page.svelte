<script lang="ts">
	import CampanhaForm from '$lib/components/CampanhaForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Campanhas', href: '/campanhas' }, { label: 'Nova' }]} />

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Nova campanha</h1>
	<CampanhaForm campanha={form?.values ?? null} clientes={data.clientes} error={form?.error ?? null} submitLabel="Criar campanha" />
</Card>
