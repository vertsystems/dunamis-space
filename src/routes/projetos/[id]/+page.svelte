<script lang="ts">
	import { enhance } from '$app/forms';
	import ProjetoForm from '$lib/components/ProjetoForm.svelte';
	import Comentarios from '$lib/components/Comentarios.svelte';

	let { data, form } = $props();
	let projeto = $derived(form?.values ?? data.projeto);
	let confirmDelete = $state(false);
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/projetos">Projetos</a></li>
		<li class="breadcrumb-item active" aria-current="page">{data.projeto.nome}</li>
	</ol>
</nav>

{#if form?.saved}<div class="alert alert-success">Projeto salvo com sucesso.</div>{/if}

<div class="card card-body">
	<div class="d-flex justify-content-between align-items-center mb-3">
		<h1 class="h5 mb-0">{data.projeto.nome}</h1>
		<a class="btn btn-sm btn-light" href={`/tarefas?projeto=${data.projeto.id}`}>Ver tarefas</a>
	</div>
	<ProjetoForm
		{projeto}
		clientes={data.clientes}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</div>

<Comentarios entidadeTipo="projeto" entidadeId={data.projeto.id} />

<div class="card card-body">
	<h2 class="h6 text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir este projeto? As tarefas vinculadas também serão removidas.</p>
			<div class="d-flex gap-2">
				<button class="btn btn-danger" type="submit">Sim, excluir</button>
				<button class="btn btn-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-outline-danger" onclick={() => (confirmDelete = true)}>Excluir projeto</button>
	{/if}
</div>
