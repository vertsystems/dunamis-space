<script lang="ts">
	import { enhance } from '$app/forms';
	import KbForm from '$lib/components/KbForm.svelte';
	import { Card, Button, Breadcrumb } from '$lib/components/ui';

	let { data, form } = $props();
	let artigo = $derived(form?.values ?? data.artigo);
	let confirmDelete = $state(false);
</script>

<Breadcrumb items={[{ label: 'Base de Conhecimento', href: '/base-conhecimento' }, { label: data.artigo.titulo }]} />

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Artigo salvo com sucesso.</div>
{/if}

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">{data.artigo.titulo}</h1>
	<KbForm {artigo} clientes={data.clientes} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
</Card>

<Card class="mt-6">
	<h2 class="text-base font-semibold text-brand-danger mb-3">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3 text-sm text-slate">Excluir este artigo?</p>
			<div class="flex gap-2">
				<Button variant="danger" type="submit">Sim, excluir</Button>
				<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
			</div>
		</form>
	{:else}
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir artigo</Button>
	{/if}
</Card>
