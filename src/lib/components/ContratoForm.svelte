<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { CONTRATO_STATUS } from '$lib/contratos';
	import { Button, Input, Select, Checkbox } from '$lib/components/ui';

	let {
		contrato = null,
		clientes = [],
		planos = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		contrato?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		planos?: { id: string; nome: string; valor_mensal: number }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	let planoId = $state(contrato?.plano_id ?? '');
	let valor = $state(contrato?.valor_mensal ?? '');

	function onPlanoChange() {
		const p = planos.find((x) => x.id === planoId);
		if (p && (valor === '' || Number(valor) === 0)) valor = String(p.valor_mensal);
	}
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
		<Select label="Cliente *" name="cliente_id" required value={contrato?.cliente_id ?? ''} wrapperClass="md:col-span-6">
			<option value="" disabled>Selecione um cliente</option>
			{#each clientes as c (c.id)}
				<option value={c.id}>{c.nome}</option>
			{/each}
		</Select>
		<Select label="Plano" name="plano_id" bind:value={planoId} onchange={onPlanoChange} wrapperClass="md:col-span-6">
			<option value="">— sem plano —</option>
			{#each planos as p (p.id)}
				<option value={p.id}>{p.nome}</option>
			{/each}
		</Select>

		<Input label="Valor mensal (R$)" type="number" step="0.01" name="valor_mensal" bind:value={valor} wrapperClass="md:col-span-4" />
		<Input label="Início" type="date" name="data_inicio" value={contrato?.data_inicio ?? ''} wrapperClass="md:col-span-4" />
		<Input label="Fim" type="date" name="data_fim" value={contrato?.data_fim ?? ''} wrapperClass="md:col-span-4" />

		<Select label="Status" name="status" value={contrato?.status ?? 'ativo'} wrapperClass="md:col-span-4">
			{#each CONTRATO_STATUS as s (s.value)}
				<option value={s.value}>{s.label}</option>
			{/each}
		</Select>
		<div class="md:col-span-8 flex items-end">
			<Checkbox label="Renovação automática" name="renovacao_automatica" checked={!!contrato?.renovacao_automatica} />
		</div>
	</div>

	<div class="flex gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => goto('/contratos')}>Cancelar</Button>
	</div>
</form>
