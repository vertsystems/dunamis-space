<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { TAREFA_STATUS, PRIORIDADE } from '$lib/tarefas';
	import { Button, Input, Select, Textarea } from '$lib/components/ui';

	let {
		tarefa = null,
		projetos = [],
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		tarefa?: Record<string, any> | null;
		projetos?: { id: string; nome: string }[];
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => tarefa?.[k] ?? '';
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
		};
	}}
>
	{#if error}
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">{error}</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
		<Input label="Título *" name="titulo" required value={v('titulo')} wrapperClass="md:col-span-8" />
		<Select label="Prioridade" name="prioridade" value={tarefa?.prioridade ?? 'media'} wrapperClass="md:col-span-4">
			{#each PRIORIDADE as p (p.value)}<option value={p.value}>{p.label}</option>{/each}
		</Select>

		<Select label="Projeto" name="projeto_id" value={tarefa?.projeto_id ?? ''} wrapperClass="md:col-span-4">
			<option value="">—</option>
			{#each projetos as p (p.id)}<option value={p.id}>{p.nome}</option>{/each}
		</Select>
		<Select label="Responsável" name="responsavel_id" value={tarefa?.responsavel_id ?? ''} wrapperClass="md:col-span-4">
			<option value="">—</option>
			{#each colaboradores as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>
		<Select label="Status" name="status" value={tarefa?.status ?? 'backlog'} wrapperClass="md:col-span-4">
			{#each TAREFA_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
		</Select>

		<Input label="Prazo" type="date" name="prazo" value={v('prazo')} wrapperClass="md:col-span-4" />
		<Input label="Tempo estimado (h)" type="number" step="0.5" name="tempo_estimado" value={v('tempo_estimado')} wrapperClass="md:col-span-4" />
		<Input label="Tempo gasto (h)" type="number" step="0.5" name="tempo_gasto" value={v('tempo_gasto')} wrapperClass="md:col-span-4" />

		<Textarea label="Descrição" name="descricao" rows={3} value={v('descricao')} wrapperClass="md:col-span-12" />
	</div>

	<div class="flex gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => goto('/tarefas')}>Cancelar</Button>
	</div>
</form>
