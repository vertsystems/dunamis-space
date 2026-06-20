<script lang="ts">
	import ProjetoForm from '$lib/components/ProjetoForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Projetos', href: '/projetos' }, { label: 'Novo' }]} />

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Novo projeto</h1>
	<ProjetoForm
		projeto={form?.values ?? null}
		clientes={data.clientes}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar projeto"
	/>
</Card>
