<script lang="ts">
	import { enhance } from '$app/forms';
	import TarefaForm from '$lib/components/TarefaForm.svelte';
	import Comentarios from '$lib/components/Comentarios.svelte';

	let { data, form } = $props();
	let tarefa = $derived(form?.values ?? data.tarefa);
	let confirmDelete = $state(false);
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/tarefas">Tarefas</a></li>
		<li class="breadcrumb-item active" aria-current="page">{data.tarefa.titulo}</li>
	</ol>
</nav>

{#if form?.saved}<div class="alert alert-success">Tarefa salva com sucesso.</div>{/if}

<div class="card card-body">
	<h1 class="h5">{data.tarefa.titulo}</h1>
	<TarefaForm
		{tarefa}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</div>

<Comentarios entidadeTipo="tarefa" entidadeId={data.tarefa.id} />

<div class="card card-body">
	<h2 class="h6 text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir esta tarefa?</p>
			<div class="d-flex gap-2">
				<button class="btn btn-danger" type="submit">Sim, excluir</button>
				<button class="btn btn-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-outline-danger" onclick={() => (confirmDelete = true)}>Excluir tarefa</button>
	{/if}
</div>
