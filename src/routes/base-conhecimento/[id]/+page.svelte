<script lang="ts">
	import { enhance } from '$app/forms';
	import KbForm from '$lib/components/KbForm.svelte';

	let { data, form } = $props();
	let artigo = $derived(form?.values ?? data.artigo);
	let confirmDelete = $state(false);
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/base-conhecimento">Base de Conhecimento</a></li>
		<li class="breadcrumb-item active" aria-current="page">{data.artigo.titulo}</li>
	</ol>
</nav>

{#if form?.saved}<div class="alert alert-success">Artigo salvo com sucesso.</div>{/if}

<div class="card card-body">
	<h1 class="h5">{data.artigo.titulo}</h1>
	<KbForm {artigo} clientes={data.clientes} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
</div>

<div class="card card-body">
	<h2 class="h6 text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir este artigo?</p>
			<div class="d-flex gap-2">
				<button class="btn btn-danger" type="submit">Sim, excluir</button>
				<button class="btn btn-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-outline-danger" onclick={() => (confirmDelete = true)}>Excluir artigo</button>
	{/if}
</div>
