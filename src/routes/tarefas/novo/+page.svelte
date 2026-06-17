<script lang="ts">
	import TarefaForm from '$lib/components/TarefaForm.svelte';
	let { data, form } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/tarefas">Tarefas</a></li>
		<li class="is-active"><a href="#" aria-current="page">Nova</a></li>
	</ul>
</nav>

<div class="box">
	<h1 class="title is-5">Nova tarefa</h1>
	<TarefaForm
		tarefa={form?.values ?? null}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar tarefa"
	/>
</div>
