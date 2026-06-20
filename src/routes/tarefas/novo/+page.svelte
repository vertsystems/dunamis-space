<script lang="ts">
	import TarefaForm from '$lib/components/TarefaForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Tarefas', href: '/tarefas' }, { label: 'Nova' }]} />

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Nova tarefa</h1>
	<TarefaForm
		tarefa={form?.values ?? null}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar tarefa"
	/>
</Card>
