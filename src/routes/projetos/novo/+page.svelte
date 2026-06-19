<script lang="ts">
	import ProjetoForm from '$lib/components/ProjetoForm.svelte';
	let { data, form } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/projetos">Projetos</a></li>
		<li class="breadcrumb-item active" aria-current="page">Novo</li>
	</ol>
</nav>

<div class="card card-body">
	<h1 class="h5">Novo projeto</h1>
	<ProjetoForm
		projeto={form?.values ?? null}
		clientes={data.clientes}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar projeto"
	/>
</div>
