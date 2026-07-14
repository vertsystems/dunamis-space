<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Input, Select, Textarea } from '$lib/components/ui';
	import ResponsavelPicker from '$lib/components/ResponsavelPicker.svelte';
	import AutosaveStatus from '$lib/components/AutosaveStatus.svelte';
	import { autosave, type AutosaveStatus as SaveStatus } from '$lib/actions/autosave';
	import { toast } from '$lib/toast.svelte';
	import { ORIGENS, type Contato, type Colaborador } from '$lib/crm';

	let {
		contato = null,
		colaboradores = [],
		clientes = [],
		error = null,
		submitLabel = 'Salvar',
		action = '?/contato_criar',
		onSuccess,
		onCancel
	}: {
		contato?: Contato | null;
		colaboradores?: Colaborador[];
		clientes?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
		onSuccess?: () => void;
		onCancel?: () => void;
	} = $props();

	let saving = $state(false);
	// Auto-save só na edição (registro já existente).
	const editando = $derived(!!contato);
	let saveStatus = $state<SaveStatus>('idle');

	// Inclui a origem atual mesmo que fora da lista de sugestões.
	const origens = $derived(
		contato?.origem && !ORIGENS.includes(contato.origem as (typeof ORIGENS)[number])
			? [contato.origem, ...ORIGENS]
			: [...ORIGENS]
	);
	const tagsStr = $derived(contato?.tags?.length ? contato.tags.join(', ') : '');
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
	use:autosave={{ enabled: editando, onStatus: (s) => (saveStatus = s) }}
	class="grid grid-cols-1 md:grid-cols-12 gap-3"
>
	{#if contato}<input type="hidden" name="id" value={contato.id} />{/if}

	{#if error}
		<div
			class="md:col-span-12 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger"
		>
			{error}
		</div>
	{/if}

	<Input label="Nome *" name="nome" required value={contato?.nome ?? ''} wrapperClass="md:col-span-7" />
	<Input label="Empresa" name="empresa" value={contato?.empresa ?? ''} wrapperClass="md:col-span-5" />

	<Input label="Cargo" name="cargo" value={contato?.cargo ?? ''} wrapperClass="md:col-span-4" />
	<Input label="E-mail" name="email" type="email" value={contato?.email ?? ''} wrapperClass="md:col-span-4" />
	<Input label="WhatsApp" name="whatsapp" value={contato?.whatsapp ?? ''} wrapperClass="md:col-span-4" />

	<Input label="Telefone" name="telefone" value={contato?.telefone ?? ''} wrapperClass="md:col-span-4" />
	<Input
		label="Instagram"
		name="instagram"
		value={contato?.instagram ?? ''}
		wrapperClass="md:col-span-4"
		placeholder="@usuario ou link"
	/>
	<Input
		label="Site"
		name="site"
		type="url"
		value={contato?.site ?? ''}
		wrapperClass="md:col-span-4"
		placeholder="https://…"
	/>

	<Select label="Origem" name="origem" value={contato?.origem ?? ''} wrapperClass="md:col-span-4">
		<option value="">—</option>
		{#each origens as o (o)}
			<option value={o}>{o}</option>
		{/each}
	</Select>
	<Input label="Segmento" name="segmento" value={contato?.segmento ?? ''} wrapperClass="md:col-span-4" />

	<Input
		label="Tags (separadas por vírgula)"
		name="tags"
		value={tagsStr}
		wrapperClass="md:col-span-6"
		placeholder="quente, indicação, e-commerce"
	/>
	<ResponsavelPicker {colaboradores} value={contato?.responsavel_id ?? null} wrapperClass="md:col-span-6" />

	<Select
		label="Vincular a cliente (opcional)"
		name="cliente_id"
		value={contato?.cliente_id ?? ''}
		wrapperClass="md:col-span-12"
	>
		<option value="">— nenhum —</option>
		{#each clientes as cl (cl.id)}
			<option value={cl.id}>{cl.nome}</option>
		{/each}
	</Select>

	<Textarea
		label="Observações"
		name="observacoes"
		value={contato?.observacoes ?? ''}
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
