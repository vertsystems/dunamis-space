<script lang="ts">
	import ClienteForm from '$lib/components/ClienteForm.svelte';

	let { data, form } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/clientes">Clientes</a></li>
		<li class="breadcrumb-item active" aria-current="page">Novo</li>
	</ol>
</nav>

<div class="card card-body">
	<h1 class="h5">Novo cliente</h1>
	<ClienteForm
		cliente={form?.values ?? null}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar cliente"
	/>
</div>
