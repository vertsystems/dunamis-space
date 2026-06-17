<script lang="ts">
	import { enhance } from '$app/forms';
	import KbForm from '$lib/components/KbForm.svelte';

	let { data, form } = $props();
	let artigo = $derived(form?.values ?? data.artigo);
	let confirmDelete = $state(false);
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/base-conhecimento">Base de Conhecimento</a></li>
		<li class="is-active"><a href="#" aria-current="page">{data.artigo.titulo}</a></li>
	</ul>
</nav>

{#if form?.saved}<div class="notification is-success is-light">Artigo salvo com sucesso.</div>{/if}

<div class="box">
	<h1 class="title is-5">{data.artigo.titulo}</h1>
	<KbForm {artigo} clientes={data.clientes} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
</div>

<div class="box">
	<h2 class="title is-6 has-text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir este artigo?</p>
			<div class="field is-grouped">
				<div class="control"><button class="button is-danger" type="submit">Sim, excluir</button></div>
				<div class="control"><button class="button is-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button></div>
			</div>
		</form>
	{:else}
		<button class="button is-danger is-outlined" onclick={() => (confirmDelete = true)}>Excluir artigo</button>
	{/if}
</div>
