<script lang="ts">
	import ColaboradorForm from '$lib/components/ColaboradorForm.svelte';
	let { form } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/equipe">Equipe</a></li>
		<li class="breadcrumb-item active" aria-current="page">Novo</li>
	</ol>
</nav>

<div class="card card-body">
	<h1 class="h5">Novo colaborador</h1>
	<ColaboradorForm colaborador={form?.values ?? null} error={form?.error ?? null} submitLabel="Criar colaborador" />
</div>
