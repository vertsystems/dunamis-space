<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Input, Select, Textarea } from '$lib/components/ui';
	import ResponsavelPicker from '$lib/components/ResponsavelPicker.svelte';
	import { toast } from '$lib/toast.svelte';
	import { type Negocio, type Stage, type ContatoLite, type Colaborador } from '$lib/crm';

	let {
		negocio = null,
		stages = [],
		contatos = [],
		colaboradores = [],
		pipelineId = null,
		initialStageId = null,
		error = null,
		submitLabel = 'Salvar',
		action = '?/negocio_criar',
		onSuccess,
		onCancel
	}: {
		negocio?: Negocio | null;
		stages?: Stage[];
		contatos?: ContatoLite[];
		colaboradores?: Colaborador[];
		pipelineId?: string | null;
		initialStageId?: string | null;
		error?: string | null;
		submitLabel?: string;
		action?: string;
		onSuccess?: () => void;
		onCancel?: () => void;
	} = $props();

	let saving = $state(false);

	const valorStr = $derived(
		negocio && negocio.valor
			? negocio.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
			: ''
	);
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			await update();
			saving = false;
			if (result.type === 'success') onSuccess?.();
			else if (result.type === 'failure')
				toast.error((result.data as { error?: string })?.error ?? 'Não foi possível salvar.');
		};
	}}
	class="grid grid-cols-1 md:grid-cols-12 gap-3"
>
	{#if negocio}<input type="hidden" name="id" value={negocio.id} />{/if}
	{#if pipelineId}<input type="hidden" name="pipeline_id" value={pipelineId} />{/if}

	{#if error}
		<div
			class="md:col-span-12 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger"
		>
			{error}
		</div>
	{/if}

	<Input
		label="Título do negócio *"
		name="titulo"
		required
		value={negocio?.titulo ?? ''}
		wrapperClass="md:col-span-12"
		placeholder="Ex.: Plano Social Media — Loja X"
	/>

	<Select
		label="Contato"
		name="contato_id"
		value={negocio?.contato_id ?? ''}
		wrapperClass="md:col-span-6"
	>
		<option value="">— sem contato —</option>
		{#each contatos as c (c.id)}
			<option value={c.id}>{c.nome}{c.empresa ? ` · ${c.empresa}` : ''}</option>
		{/each}
	</Select>

	<Select
		label="Etapa"
		name="stage_id"
		value={negocio?.stage_id ?? initialStageId ?? stages[0]?.id ?? ''}
		wrapperClass="md:col-span-6"
	>
		{#each stages as s (s.id)}
			<option value={s.id}>{s.nome}</option>
		{/each}
	</Select>

	<Input
		label="Valor (R$)"
		name="valor"
		value={valorStr}
		wrapperClass="md:col-span-4"
		placeholder="0,00"
		inputmode="decimal"
	/>

	<ResponsavelPicker {colaboradores} value={negocio?.responsavel_id ?? null} wrapperClass="md:col-span-12" />

	<Input
		label="Previsão de fechamento"
		name="previsao_fechamento"
		type="date"
		value={negocio?.previsao_fechamento ?? ''}
		wrapperClass="md:col-span-4"
	/>

	<Textarea
		label="Observações"
		name="observacoes"
		value={negocio?.observacoes ?? ''}
		rows={2}
		wrapperClass="md:col-span-12"
	/>

	<div class="md:col-span-12 flex items-center gap-2 pt-1">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		{#if onCancel}
			<Button variant="secondary" type="button" onclick={onCancel}>Cancelar</Button>
		{/if}
	</div>
</form>
