<script lang="ts">
	import PlanoForm from '$lib/components/PlanoForm.svelte';
	let { form } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/contratos">Contratos</a></li>
		<li class="breadcrumb-item"><a href="/contratos/planos">Planos</a></li>
		<li class="breadcrumb-item active" aria-current="page">Novo</li>
	</ol>
</nav>

<div class="card card-body">
	<h1 class="h5">Novo plano</h1>
	<PlanoForm plano={form?.values ?? null} error={form?.error ?? null} submitLabel="Criar plano" />
</div>
