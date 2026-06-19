<script lang="ts">
	import CampanhaForm from '$lib/components/CampanhaForm.svelte';
	let { data, form } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/campanhas">Campanhas</a></li>
		<li class="breadcrumb-item active" aria-current="page">Nova</li>
	</ol>
</nav>

<div class="card card-body">
	<h1 class="h5">Nova campanha</h1>
	<CampanhaForm campanha={form?.values ?? null} clientes={data.clientes} error={form?.error ?? null} submitLabel="Criar campanha" />
</div>
