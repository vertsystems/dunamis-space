<script lang="ts">
	import { enhance } from '$app/forms';
	import PlanoForm from '$lib/components/PlanoForm.svelte';

	let { data, form } = $props();
	let plano = $derived(form?.values ?? data.plano);
	let confirmDelete = $state(false);
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/contratos">Contratos</a></li>
		<li class="breadcrumb-item"><a href="/contratos/planos">Planos</a></li>
		<li class="breadcrumb-item active" aria-current="page">{data.plano.nome}</li>
	</ol>
</nav>

{#if form?.saved}<div class="alert alert-success">Plano salvo com sucesso.</div>{/if}

<div class="card card-body">
	<h1 class="h5">{data.plano.nome}</h1>
	<PlanoForm {plano} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
</div>

<div class="card card-body">
	<h2 class="h6 text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir este plano? Contratos vinculados ficarão sem plano.</p>
			<div class="d-flex gap-2">
				<button class="btn btn-danger" type="submit">Sim, excluir</button>
				<button class="btn btn-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-outline-danger" onclick={() => (confirmDelete = true)}>Excluir plano</button>
	{/if}
</div>
