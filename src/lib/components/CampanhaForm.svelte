<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button, Input, Select, Textarea } from '$lib/components/ui';

	let {
		campanha = null,
		clientes = [],
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone,
		onDelete
	}: {
		campanha?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
		/** Modo modal: chamado ao cancelar (em vez de navegar). */
		onCancel?: () => void;
		/** Modo modal: chamado ao salvar com sucesso (em vez de navegar/recarregar). */
		onDone?: () => void;
		/** Quando presente (edição), mostra o botão Excluir. */
		onDelete?: () => void;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => campanha?.[k] ?? '';
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			if (onDone && (result.type === 'success' || result.type === 'redirect')) {
				saving = false;
				onDone();
				return;
			}
			await update();
			saving = false;
		};
	}}
>
	{#if error}
		<div role="alert" class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">{error}</div>
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

	<div class="flex items-center gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => (onCancel ? onCancel() : goto('/campanhas'))}>Cancelar</Button>
		{#if onDelete}
			<Button variant="danger" onclick={onDelete} class="ml-auto">Excluir</Button>
		{/if}
	</div>
</form>
