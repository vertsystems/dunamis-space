<script lang="ts">
	import TransacaoForm from '$lib/components/TransacaoForm.svelte';
	let { data, form } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/financeiro">Financeiro</a></li>
		<li class="is-active"><a href="#" aria-current="page">Nova transação</a></li>
	</ul>
</nav>

<div class="box">
	<h1 class="title is-5">Nova transação</h1>
	<TransacaoForm
		transacao={form?.values ?? null}
		clientes={data.clientes}
		error={form?.error ?? null}
		submitLabel="Criar transação"
	/>
</div>
