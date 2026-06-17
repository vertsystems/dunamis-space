<script lang="ts">
	import PlanoForm from '$lib/components/PlanoForm.svelte';
	let { form } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/contratos">Contratos</a></li>
		<li><a href="/contratos/planos">Planos</a></li>
		<li class="is-active"><a href="#" aria-current="page">Novo</a></li>
	</ul>
</nav>

<div class="box">
	<h1 class="title is-5">Novo plano</h1>
	<PlanoForm plano={form?.values ?? null} error={form?.error ?? null} submitLabel="Criar plano" />
</div>
