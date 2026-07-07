<script lang="ts">
	import { enhance } from '$app/forms';
	import TransacaoForm from '$lib/components/TransacaoForm.svelte';
	import { Card, Button, Breadcrumb } from '$lib/components/ui';
	import { page } from '$app/state';
	import { podeExcluir } from '$lib/permissoes';

	let { data, form } = $props();
	let transacao = $derived(form?.values ?? data.transacao);
	let confirmDelete = $state(false);
	const perms = $derived(page.data.permissoes);
</script>

<Breadcrumb items={[{ label: 'Financeiro', href: '/financeiro' }, { label: 'Transação' }]} />

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Transação salva com sucesso.</div>
{/if}

<Card>
	<h1 class="text-sm font-semibold text-navy mb-4">Editar transação</h1>
	<TransacaoForm
		{transacao}
		clientes={data.clientes}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</Card>

{#if podeExcluir(perms, 'financeiro')}
	<Card class="mt-6">
		<h2 class="text-sm font-semibold text-brand-danger mb-3">Zona de perigo</h2>
		{#if confirmDelete}
			<form method="POST" action="?/delete" use:enhance>
				<p class="mb-3 text-sm text-slate">Excluir esta transação?</p>
				<div class="flex gap-2">
					<Button variant="danger" type="submit">Sim, excluir</Button>
					<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
				</div>
			</form>
		{:else}
			<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir transação</Button>
		{/if}
	</Card>
{/if}
