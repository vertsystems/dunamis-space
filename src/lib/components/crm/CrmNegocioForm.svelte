<script lang="ts">
	import { enhance } from '$app/forms';
	import { ACTIONS } from '$lib/comercial.svelte';
	import { Button, Input, Select, Textarea } from '$lib/components/ui';
	import ResponsavelPicker from '$lib/components/ResponsavelPicker.svelte';
	import AutosaveStatus from '$lib/components/AutosaveStatus.svelte';
	import { autosave, type AutosaveStatus as SaveStatus } from '$lib/actions/autosave';
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
		action = `${ACTIONS}?/negocio_criar`,
		podeEditar = true,
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
		/** Sem permissão de edição o autosave fica desligado — senão cada tecla
		    digitada vira um 403 vindo da action. */
		podeEditar?: boolean;
		onSuccess?: () => void;
		onCancel?: () => void;
	} = $props();

	let saving = $state(false);
	// Auto-save só na edição (registro já existente).
	const editando = $derived(!!negocio);
	let saveStatus = $state<SaveStatus>('idle');
	// Contato rápido: digitar o nome de um novo contato direto aqui (sem abrir a
	// janela de novo contato). O nome é criado como contato e pode ser editado depois.
	let modoNovoContato = $state(false);
	let novoContatoNome = $state('');

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
	use:autosave={{ enabled: editando && podeEditar, onStatus: (s) => (saveStatus = s) }}
	class="grid grid-cols-1 md:grid-cols-12 gap-3"
>
	{#if negocio}<input type="hidden" name="id" value={negocio.id} />{/if}
	{#if pipelineId}<input type="hidden" name="pipeline_id" value={pipelineId} />{/if}

	{#if error}
		<div
			role="alert"
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

	<div class="md:col-span-6">
		{#if modoNovoContato}
			<label for="novo-contato" class="mb-1.5 block text-sm font-medium text-navy">Novo contato</label>
			<input
				id="novo-contato"
				name="novo_contato_nome"
				bind:value={novoContatoNome}
				placeholder="Nome do contato"
				class="h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
			/>
			<button
				type="button"
				class="mt-1.5 text-xs font-medium text-brand hover:underline"
				onclick={() => (modoNovoContato = false)}
			>
				escolher um contato existente
			</button>
		{:else}
			<Select label="Contato" name="contato_id" value={negocio?.contato_id ?? ''}>
				<option value="">— sem contato —</option>
				{#each contatos as c (c.id)}
					<option value={c.id}>{c.nome}{c.empresa ? ` · ${c.empresa}` : ''}</option>
				{/each}
			</Select>
			{#if !editando}
				<button
					type="button"
					class="mt-1.5 text-xs font-medium text-brand hover:underline"
					onclick={() => (modoNovoContato = true)}
				>
					+ adicionar novo contato
				</button>
			{/if}
		{/if}
	</div>

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
		{#if editando}
			<AutosaveStatus status={saveStatus} />
			<div class="flex-1"></div>
			{#if onCancel}
				<Button variant="secondary" type="button" onclick={onCancel}>Fechar</Button>
			{/if}
		{:else}
			<Button type="submit" loading={saving}>{submitLabel}</Button>
			{#if onCancel}
				<Button variant="secondary" type="button" onclick={onCancel}>Cancelar</Button>
			{/if}
		{/if}
	</div>
</form>
