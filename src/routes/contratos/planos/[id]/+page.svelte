<script lang="ts">
	import { enhance } from '$app/forms';
	import PlanoForm from '$lib/components/PlanoForm.svelte';

	let { data, form } = $props();
	let plano = $derived(form?.values ?? data.plano);
	let confirmDelete = $state(false);
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/contratos">Contratos</a></li>
		<li><a href="/contratos/planos">Planos</a></li>
		<li class="is-active"><a href="#" aria-current="page">{data.plano.nome}</a></li>
	</ul>
</nav>

{#if form?.saved}<div class="notification is-success is-light">Plano salvo com sucesso.</div>{/if}

<div class="box">
	<h1 class="title is-5">{data.plano.nome}</h1>
	<PlanoForm {plano} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
</div>

<div class="box">
	<h2 class="title is-6 has-text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir este plano? Contratos vinculados ficarão sem plano.</p>
			<div class="field is-grouped">
				<div class="control"><button class="button is-danger" type="submit">Sim, excluir</button></div>
				<div class="control">
					<button class="button is-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button>
				</div>
			</div>
		</form>
	{:else}
		<button class="button is-danger is-outlined" onclick={() => (confirmDelete = true)}>Excluir plano</button>
	{/if}
</div>
