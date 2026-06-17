<script lang="ts">
	import { enhance } from '$app/forms';
	import ProjetoForm from '$lib/components/ProjetoForm.svelte';

	let { data, form } = $props();
	let projeto = $derived(form?.values ?? data.projeto);
	let confirmDelete = $state(false);
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/projetos">Projetos</a></li>
		<li class="is-active"><a href="#" aria-current="page">{data.projeto.nome}</a></li>
	</ul>
</nav>

{#if form?.saved}<div class="notification is-success is-light">Projeto salvo com sucesso.</div>{/if}

<div class="box">
	<div class="level mb-3">
		<div class="level-left"><h1 class="title is-5 mb-0">{data.projeto.nome}</h1></div>
		<div class="level-right">
			<a class="button is-small is-light" href={`/tarefas?projeto=${data.projeto.id}`}>Ver tarefas</a>
		</div>
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

<div class="box">
	<h2 class="title is-6 has-text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir este projeto? As tarefas vinculadas também serão removidas.</p>
			<div class="field is-grouped">
				<div class="control"><button class="button is-danger" type="submit">Sim, excluir</button></div>
				<div class="control"><button class="button is-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button></div>
			</div>
		</form>
	{:else}
		<button class="button is-danger is-outlined" onclick={() => (confirmDelete = true)}>Excluir projeto</button>
	{/if}
</div>
