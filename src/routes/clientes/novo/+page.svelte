<script lang="ts">
	import ClienteForm from '$lib/components/ClienteForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';

	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Clientes', href: '/clientes' }, { label: 'Novo' }]} />

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Novo cliente</h1>
	<ClienteForm
		cliente={form?.values ?? null}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar cliente"
	/>
</Card>
