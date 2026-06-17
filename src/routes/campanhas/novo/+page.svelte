<script lang="ts">
	import CampanhaForm from '$lib/components/CampanhaForm.svelte';
	let { data, form } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/campanhas">Campanhas</a></li>
		<li class="is-active"><a href="#" aria-current="page">Nova</a></li>
	</ul>
</nav>

<div class="box">
	<h1 class="title is-5">Nova campanha</h1>
	<CampanhaForm campanha={form?.values ?? null} clientes={data.clientes} error={form?.error ?? null} submitLabel="Criar campanha" />
</div>
