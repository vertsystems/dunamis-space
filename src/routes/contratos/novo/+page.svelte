<script lang="ts">
	import ContratoForm from '$lib/components/ContratoForm.svelte';
	let { data, form } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/contratos">Contratos</a></li>
		<li class="breadcrumb-item active" aria-current="page">Novo</li>
	</ol>
</nav>

<div class="card card-body">
	<h1 class="h5">Novo contrato</h1>
	<ContratoForm
		contrato={form?.values ?? null}
		clientes={data.clientes}
		planos={data.planos}
		error={form?.error ?? null}
		submitLabel="Criar contrato"
	/>
</div>
