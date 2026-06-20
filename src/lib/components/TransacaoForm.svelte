<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { TRANSACAO_TIPO, TRANSACAO_STATUS } from '$lib/financeiro';
	import { Button, Input, Select, Checkbox } from '$lib/components/ui';

	let {
		transacao = null,
		clientes = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		transacao?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => transacao?.[k] ?? '';
	const today = new Date().toISOString().slice(0, 10);
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
		<Select label="Tipo *" name="tipo" value={transacao?.tipo ?? 'receita'} wrapperClass="md:col-span-4">
			{#each TRANSACAO_TIPO as t (t.value)}
				<option value={t.value}>{t.label}</option>
			{/each}
		</Select>
		<Input label="Valor (R$) *" type="number" step="0.01" name="valor" required value={v('valor')} wrapperClass="md:col-span-4" />
		<Select label="Status" name="status" value={transacao?.status ?? 'previsto'} wrapperClass="md:col-span-4">
			{#each TRANSACAO_STATUS as s (s.value)}
				<option value={s.value}>{s.label}</option>
			{/each}
		</Select>

		<Input label="Descrição" name="descricao" value={v('descricao')} wrapperClass="md:col-span-8" />
		<Input label="Categoria" name="categoria" value={v('categoria')} placeholder="Mensalidade, Tráfego…" wrapperClass="md:col-span-4" />

		<Select label="Cliente" name="cliente_id" value={transacao?.cliente_id ?? ''} wrapperClass="md:col-span-4">
			<option value="">— nenhum —</option>
			{#each clientes as c (c.id)}
				<option value={c.id}>{c.nome}</option>
			{/each}
		</Select>
		<Input label="Competência" type="date" name="data_competencia" value={transacao?.data_competencia ?? today} wrapperClass="md:col-span-4" />
		<Input label="Pagamento" type="date" name="data_pagamento" value={v('data_pagamento')} wrapperClass="md:col-span-4" />

		<div class="md:col-span-12">
			<Checkbox label="Recorrente (se repete todo mês)" name="recorrente" checked={!!transacao?.recorrente} />
		</div>
	</div>

	<div class="flex gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => goto('/financeiro')}>Cancelar</Button>
	</div>
</form>
