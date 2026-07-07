<script lang="ts">
	import { page } from '$app/state';
	import { podeEditar } from '$lib/permissoes';
	import ClienteForm from '$lib/components/ClienteForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';

	let { data, form } = $props();
	const perms = $derived(page.data.permissoes);
</script>

<Breadcrumb items={[{ label: 'Clientes', href: '/cadastro' }, { label: 'Novo' }]} />

<Card>
	<h1 class="text-sm font-semibold text-navy mb-4">Novo cliente</h1>
	{#if podeEditar(perms, 'clientes')}
		<ClienteForm
			cliente={form?.values ?? null}
			colaboradores={data.colaboradores}
			error={form?.error ?? null}
			submitLabel="Criar cliente"
		/>
	{:else}
		<p class="text-sm text-grey">Você não tem permissão para criar clientes.</p>
	{/if}
</Card>
