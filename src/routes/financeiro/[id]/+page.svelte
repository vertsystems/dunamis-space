<script lang="ts">
	import { enhance } from '$app/forms';
	import TransacaoForm from '$lib/components/TransacaoForm.svelte';

	let { data, form } = $props();
	let transacao = $derived(form?.values ?? data.transacao);
	let confirmDelete = $state(false);
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/financeiro">Financeiro</a></li>
		<li class="breadcrumb-item active" aria-current="page">Transação</li>
	</ol>
</nav>

{#if form?.saved}<div class="alert alert-success">Transação salva com sucesso.</div>{/if}

<div class="card card-body">
	<h1 class="h5">Editar transação</h1>
	<TransacaoForm
		{transacao}
		clientes={data.clientes}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</div>

<div class="card card-body">
	<h2 class="h6 text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir esta transação?</p>
			<div class="d-flex gap-2">
				<button class="btn btn-danger" type="submit">Sim, excluir</button>
				<button class="btn btn-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-outline-danger" onclick={() => (confirmDelete = true)}>Excluir transação</button>
	{/if}
</div>
