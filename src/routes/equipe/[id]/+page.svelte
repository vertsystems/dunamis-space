<script lang="ts">
	import { enhance } from '$app/forms';
	import ColaboradorForm from '$lib/components/ColaboradorForm.svelte';

	let { data, form } = $props();
	let colaborador = $derived(form?.values ?? data.colaborador);
	let confirmDelete = $state(false);
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/equipe">Equipe</a></li>
		<li class="breadcrumb-item active" aria-current="page">{data.colaborador.nome}</li>
	</ol>
</nav>

{#if form?.saved}<div class="alert alert-success">Colaborador salvo com sucesso.</div>{/if}

<div class="card card-body">
	<h1 class="h5">{data.colaborador.nome}</h1>
	<ColaboradorForm {colaborador} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
</div>

<div class="card card-body">
	<h2 class="h6 text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir este colaborador? Ele será desvinculado dos clientes/projetos/tarefas.</p>
			<div class="d-flex gap-2">
				<button class="btn btn-danger" type="submit">Sim, excluir</button>
				<button class="btn btn-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-outline-danger" onclick={() => (confirmDelete = true)}>Excluir colaborador</button>
	{/if}
</div>
