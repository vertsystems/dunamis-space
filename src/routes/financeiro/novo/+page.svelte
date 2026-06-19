<script lang="ts">
	import TransacaoForm from '$lib/components/TransacaoForm.svelte';
	let { data, form } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/financeiro">Financeiro</a></li>
		<li class="breadcrumb-item active" aria-current="page">Nova transação</li>
	</ol>
</nav>

<div class="card card-body">
	<h1 class="h5">Nova transação</h1>
	<TransacaoForm
		transacao={form?.values ?? null}
		clientes={data.clientes}
		error={form?.error ?? null}
		submitLabel="Criar transação"
	/>
</div>
