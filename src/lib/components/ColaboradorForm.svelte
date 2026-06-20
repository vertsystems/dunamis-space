<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { FUNCAO } from '$lib/equipe';
	import { Button, Input, Select, Checkbox } from '$lib/components/ui';

	let {
		colaborador = null,
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		colaborador?: Record<string, any> | null;
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => colaborador?.[k] ?? '';
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
		<Input label="Nome *" name="nome" required value={v('nome')} wrapperClass="md:col-span-6" />
		<Input label="E-mail *" type="email" name="email" required value={v('email')} wrapperClass="md:col-span-6" />

		<Select label="Função" name="funcao" value={colaborador?.funcao ?? 'social_media'} wrapperClass="md:col-span-6">
			{#each FUNCAO as f (f.value)}<option value={f.value}>{f.label}</option>{/each}
		</Select>
		<Input label="Custo por hora (R$)" type="number" step="0.01" name="custo_hora" value={v('custo_hora')} wrapperClass="md:col-span-6" />

		<div class="md:col-span-12">
			<Checkbox label="Ativo" name="ativo" checked={colaborador ? !!colaborador.ativo : true} />
		</div>
	</div>

	<div class="flex gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => goto('/equipe')}>Cancelar</Button>
	</div>
</form>
