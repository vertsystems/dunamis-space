<script lang="ts">
	import ConteudoForm from '$lib/components/ConteudoForm.svelte';
	let { data, form } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/conteudo">Conteúdo</a></li>
		<li class="breadcrumb-item active" aria-current="page">Novo</li>
	</ol>
</nav>

<div class="card card-body">
	<h1 class="h5">Novo conteúdo</h1>
	<ConteudoForm
		conteudo={form?.values ?? null}
		clientes={data.clientes}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar conteúdo"
	/>
</div>
