<script lang="ts">
	import KbForm from '$lib/components/KbForm.svelte';
	let { data, form } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/base-conhecimento">Base de Conhecimento</a></li>
		<li class="breadcrumb-item active" aria-current="page">Novo</li>
	</ol>
</nav>

<div class="card card-body">
	<h1 class="h5">Novo artigo</h1>
	<KbForm artigo={form?.values ?? null} clientes={data.clientes} error={form?.error ?? null} submitLabel="Criar artigo" />
</div>
