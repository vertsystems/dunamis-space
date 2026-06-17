<script lang="ts">
	import ClienteForm from '$lib/components/ClienteForm.svelte';

	let { data, form } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/clientes">Clientes</a></li>
		<li class="is-active"><a href="#" aria-current="page">Novo</a></li>
	</ul>
</nav>

<div class="box">
	<h1 class="title is-5">Novo cliente</h1>
	<ClienteForm
		cliente={form?.values ?? null}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar cliente"
	/>
</div>
