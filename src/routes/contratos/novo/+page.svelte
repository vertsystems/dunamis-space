<script lang="ts">
	import ContratoForm from '$lib/components/ContratoForm.svelte';
	let { data, form } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/contratos">Contratos</a></li>
		<li class="is-active"><a href="#" aria-current="page">Novo</a></li>
	</ul>
</nav>

<div class="box">
	<h1 class="title is-5">Novo contrato</h1>
	<ContratoForm
		contrato={form?.values ?? null}
		clientes={data.clientes}
		planos={data.planos}
		error={form?.error ?? null}
		submitLabel="Criar contrato"
	/>
</div>
