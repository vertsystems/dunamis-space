<script lang="ts">
	import ProjetoForm from '$lib/components/ProjetoForm.svelte';
	let { data, form } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/projetos">Projetos</a></li>
		<li class="is-active"><a href="#" aria-current="page">Novo</a></li>
	</ul>
</nav>

<div class="box">
	<h1 class="title is-5">Novo projeto</h1>
	<ProjetoForm
		projeto={form?.values ?? null}
		clientes={data.clientes}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar projeto"
	/>
</div>
