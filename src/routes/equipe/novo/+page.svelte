<script lang="ts">
	import ColaboradorForm from '$lib/components/ColaboradorForm.svelte';
	let { form } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/equipe">Equipe</a></li>
		<li class="is-active"><a href="#" aria-current="page">Novo</a></li>
	</ul>
</nav>

<div class="box">
	<h1 class="title is-5">Novo colaborador</h1>
	<ColaboradorForm colaborador={form?.values ?? null} error={form?.error ?? null} submitLabel="Criar colaborador" />
</div>
