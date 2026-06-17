<script lang="ts">
	import { enhance } from '$app/forms';
	import ColaboradorForm from '$lib/components/ColaboradorForm.svelte';

	let { data, form } = $props();
	let colaborador = $derived(form?.values ?? data.colaborador);
	let confirmDelete = $state(false);
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/equipe">Equipe</a></li>
		<li class="is-active"><a href="#" aria-current="page">{data.colaborador.nome}</a></li>
	</ul>
</nav>

{#if form?.saved}<div class="notification is-success is-light">Colaborador salvo com sucesso.</div>{/if}

<div class="box">
	<h1 class="title is-5">{data.colaborador.nome}</h1>
	<ColaboradorForm {colaborador} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
</div>

<div class="box">
	<h2 class="title is-6 has-text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir este colaborador? Ele será desvinculado dos clientes/projetos/tarefas.</p>
			<div class="field is-grouped">
				<div class="control"><button class="button is-danger" type="submit">Sim, excluir</button></div>
				<div class="control"><button class="button is-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button></div>
			</div>
		</form>
	{:else}
		<button class="button is-danger is-outlined" onclick={() => (confirmDelete = true)}>Excluir colaborador</button>
	{/if}
</div>
