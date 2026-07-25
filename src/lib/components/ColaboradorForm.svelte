<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { FUNCAO } from '$lib/equipe';
	import { Button, Input, Select, Checkbox } from '$lib/components/ui';

	let {
		colaborador = null,
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone
	}: {
		colaborador?: Record<string, any> | null;
		error?: string | null;
		submitLabel?: string;
		action?: string;
		/** Modo modal: chamado ao cancelar (em vez de navegar). */
		onCancel?: () => void;
		/** Modo modal: chamado ao salvar com sucesso (em vez de navegar/recarregar). */
		onDone?: () => void;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => colaborador?.[k] ?? '';
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
		<Input label="Nome *" name="nome" required value={v('nome')} wrapperClass="md:col-span-6" />
		<Input label="E-mail *" type="email" name="email" required value={v('email')} wrapperClass="md:col-span-6" />

		<Input label="Custo por hora (R$)" type="number" step="0.01" name="custo_hora" value={v('custo_hora')} wrapperClass="md:col-span-6" />

		<div class="md:col-span-12">
			<span class="block text-sm font-medium text-navy mb-1.5">Funções</span>
			<div class="flex flex-wrap gap-1.5">
				{#each FUNCAO as f (f.value)}
					<label class="cursor-pointer">
						<input
							type="checkbox"
							name="funcoes"
							value={f.value}
							checked={(colaborador?.funcoes ?? (colaborador?.funcao ? [colaborador.funcao] : [])).includes(f.value)}
							class="peer sr-only"
						/>
						<span
							class="inline-flex rounded-full bg-bg px-3.5 py-1.5 text-sm font-medium text-slate transition-colors hover:bg-grey-200/70 peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30"
							>{f.label}</span
						>
					</label>
				{/each}
			</div>
		</div>

		<div class="md:col-span-12">
			<Checkbox label="Ativo" name="ativo" checked={colaborador ? !!colaborador.ativo : true} />
		</div>
	</div>

	<div class="flex gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => (onCancel ? onCancel() : goto('/equipe'))}>Cancelar</Button>
	</div>
</form>
