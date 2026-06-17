<script lang="ts">
	import KbForm from '$lib/components/KbForm.svelte';
	let { data, form } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/base-conhecimento">Base de Conhecimento</a></li>
		<li class="is-active"><a href="#" aria-current="page">Novo</a></li>
	</ul>
</nav>

<div class="box">
	<h1 class="title is-5">Novo artigo</h1>
	<KbForm artigo={form?.values ?? null} clientes={data.clientes} error={form?.error ?? null} submitLabel="Criar artigo" />
</div>
