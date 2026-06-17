<script lang="ts">
	import { enhance } from '$app/forms';
	import ConteudoForm from '$lib/components/ConteudoForm.svelte';

	let { data, form } = $props();
	let conteudo = $derived(form?.values ?? data.conteudo);
	let confirmDelete = $state(false);
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/conteudo">Conteúdo</a></li>
		<li class="is-active"><a href="#" aria-current="page">{data.conteudo.titulo ?? 'Conteúdo'}</a></li>
	</ul>
</nav>

{#if form?.saved}<div class="notification is-success is-light">Conteúdo salvo com sucesso.</div>{/if}

<div class="box">
	<h1 class="title is-5">{data.conteudo.titulo ?? 'Conteúdo'}</h1>
	<ConteudoForm
		{conteudo}
		clientes={data.clientes}
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
			<p class="mb-3">Excluir este conteúdo?</p>
			<div class="field is-grouped">
				<div class="control"><button class="button is-danger" type="submit">Sim, excluir</button></div>
				<div class="control"><button class="button is-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button></div>
			</div>
		</form>
	{:else}
		<button class="button is-danger is-outlined" onclick={() => (confirmDelete = true)}>Excluir conteúdo</button>
	{/if}
</div>
