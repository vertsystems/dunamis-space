<script lang="ts">
	import ConteudoForm from '$lib/components/ConteudoForm.svelte';
	let { data, form } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/conteudo">Conteúdo</a></li>
		<li class="is-active"><a href="#" aria-current="page">Novo</a></li>
	</ul>
</nav>

<div class="box">
	<h1 class="title is-5">Novo conteúdo</h1>
	<ConteudoForm
		conteudo={form?.values ?? null}
		clientes={data.clientes}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar conteúdo"
	/>
</div>
