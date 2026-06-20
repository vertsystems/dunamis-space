<script lang="ts">
	import { enhance } from '$app/forms';
	import ClienteForm from '$lib/components/ClienteForm.svelte';
	import Comentarios from '$lib/components/Comentarios.svelte';
	import { statusTone, statusLabel } from '$lib/clientes';
	import { Card, Badge, Button, Breadcrumb } from '$lib/components/ui';

	let { data, form } = $props();

	// Após salvar com sucesso, usa os valores atualizados; senão, os do banco.
	let cliente = $derived(form?.values ?? data.cliente);
	let confirmDelete = $state(false);
</script>

<Breadcrumb items={[{ label: 'Clientes', href: '/clientes' }, { label: data.cliente.nome }]} />

<div class="flex items-center gap-3 mb-4">
	<h1 class="text-lg font-semibold text-navy">{data.cliente.nome}</h1>
	<Badge tone={statusTone(data.cliente.status)}>{statusLabel(data.cliente.status)}</Badge>
</div>

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
		Cliente salvo com sucesso.
	</div>
{/if}

<Card>
	<ClienteForm
		{cliente}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</Card>

<Comentarios entidadeTipo="cliente" entidadeId={data.cliente.id} />

<Card class="mt-6">
	<h2 class="text-base font-semibold text-brand-danger mb-3">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3 text-sm text-slate">
				Tem certeza? Esta ação remove o cliente e seus dados vinculados.
			</p>
			<div class="flex gap-2">
				<Button variant="danger" type="submit">Sim, excluir</Button>
				<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
			</div>
		</form>
	{:else}
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir cliente</Button>
	{/if}
</Card>
