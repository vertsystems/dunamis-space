<script lang="ts">
	import { enhance } from '$app/forms';
	import ClienteForm from '$lib/components/ClienteForm.svelte';
	import { Card, Breadcrumb, Button } from '$lib/components/ui';

	let { data, form } = $props();
	let confirmDelete = $state(false);
</script>

<Breadcrumb items={[{ label: 'Clientes', href: '/cadastro' }, { label: data.cliente.nome }]} />

<div class="mb-4">
	<h1 class="text-xl font-bold text-navy">{data.cliente.nome}</h1>
	<p class="text-sm text-grey">Ficha completa do cliente</p>
</div>

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
		Cliente salvo.
	</div>
{/if}

<Card>
	<ClienteForm
		cliente={form?.values ?? data.cliente}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</Card>

<Card class="mt-6">
	<h2 class="text-base font-semibold text-brand-danger mb-3">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3 text-sm text-slate">Excluir este cliente? Esta ação não pode ser desfeita.</p>
			<div class="flex gap-2">
				<Button variant="danger" type="submit">Sim, excluir</Button>
				<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
			</div>
		</form>
	{:else}
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir cliente</Button>
	{/if}
</Card>
