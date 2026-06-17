<script lang="ts">
	import { enhance } from '$app/forms';
	import TarefaForm from '$lib/components/TarefaForm.svelte';

	let { data, form } = $props();
	let tarefa = $derived(form?.values ?? data.tarefa);
	let confirmDelete = $state(false);
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/tarefas">Tarefas</a></li>
		<li class="is-active"><a href="#" aria-current="page">{data.tarefa.titulo}</a></li>
	</ul>
</nav>

{#if form?.saved}<div class="notification is-success is-light">Tarefa salva com sucesso.</div>{/if}

<div class="box">
	<h1 class="title is-5">{data.tarefa.titulo}</h1>
	<TarefaForm
		{tarefa}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</div>

<div class="box">
	<h2 class="title is-6 has-text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir esta tarefa?</p>
			<div class="field is-grouped">
				<div class="control"><button class="button is-danger" type="submit">Sim, excluir</button></div>
				<div class="control"><button class="button is-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button></div>
			</div>
		</form>
	{:else}
		<button class="button is-danger is-outlined" onclick={() => (confirmDelete = true)}>Excluir tarefa</button>
	{/if}
</div>
