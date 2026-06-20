<script lang="ts">
	import ColaboradorForm from '$lib/components/ColaboradorForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { form } = $props();
</script>

<Breadcrumb items={[{ label: 'Equipe', href: '/equipe' }, { label: 'Novo' }]} />

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Novo colaborador</h1>
	<ColaboradorForm colaborador={form?.values ?? null} error={form?.error ?? null} submitLabel="Criar colaborador" />
</Card>
