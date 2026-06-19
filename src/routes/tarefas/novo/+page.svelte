<script lang="ts">
	import TarefaForm from '$lib/components/TarefaForm.svelte';
	let { data, form } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/tarefas">Tarefas</a></li>
		<li class="breadcrumb-item active" aria-current="page">Nova</li>
	</ol>
</nav>

<div class="card card-body">
	<h1 class="h5">Nova tarefa</h1>
	<TarefaForm
		tarefa={form?.values ?? null}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar tarefa"
	/>
</div>
