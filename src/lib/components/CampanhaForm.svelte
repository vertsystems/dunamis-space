<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button, Input, Select, Textarea } from '$lib/components/ui';

	let {
		campanha = null,
		clientes = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		campanha?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => campanha?.[k] ?? '';
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
		<Input label="Nome da campanha *" name="nome" required value={v('nome')} placeholder="Operação Fecha Mês" wrapperClass="md:col-span-6" />
		<Select label="Cliente *" name="cliente_id" required value={campanha?.cliente_id ?? ''} wrapperClass="md:col-span-6">
			<option value="" disabled>Selecione um cliente</option>
			{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>
		<Input label="Início" type="date" name="data_inicio" value={v('data_inicio')} wrapperClass="md:col-span-3" />
		<Input label="Fim" type="date" name="data_fim" value={v('data_fim')} wrapperClass="md:col-span-3" />
		<Textarea label="Descrição" name="descricao" rows={2} value={v('descricao')} wrapperClass="md:col-span-12" />
	</div>

	<div class="flex gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => goto('/campanhas')}>Cancelar</Button>
	</div>
</form>
