<script lang="ts">
	import { enhance } from '$app/forms';
	import TarefaForm from '$lib/components/TarefaForm.svelte';
	import Comentarios from '$lib/components/Comentarios.svelte';
	import { Card, Button, Breadcrumb } from '$lib/components/ui';

	let { data, form } = $props();
	let tarefa = $derived(form?.values ?? data.tarefa);
	let confirmDelete = $state(false);
</script>

<Breadcrumb items={[{ label: 'Tarefas', href: '/tarefas' }, { label: data.tarefa.titulo }]} />

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Tarefa salva com sucesso.</div>
{/if}

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">{data.tarefa.titulo}</h1>
	<TarefaForm
		{tarefa}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</Card>

<Comentarios entidadeTipo="tarefa" entidadeId={data.tarefa.id} />

<Card class="mt-6">
	<h2 class="text-base font-semibold text-brand-danger mb-3">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3 text-sm text-slate">Excluir esta tarefa?</p>
			<div class="flex gap-2">
				<Button variant="danger" type="submit">Sim, excluir</Button>
				<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
			</div>
		</form>
	{:else}
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir tarefa</Button>
	{/if}
</Card>
