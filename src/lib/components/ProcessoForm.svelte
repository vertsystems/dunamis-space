<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { PROCESSO_ETAPAS, PROCESSO_SITUACAO, ETAPA_STATUS } from '$lib/processos';
	import { Button, Input, Select } from '$lib/components/ui';

	let {
		processo = null,
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		processo?: Record<string, any> | null;
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => processo?.[k] ?? '';
	const etapaAtual = (key: string) => processo?.etapas?.[key] ?? 'pendente';
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
		<Input label="Nome do processo *" name="nome" required value={v('nome')} placeholder="Aquisição de…" wrapperClass="md:col-span-7" />
		<Input label="Número" name="numero" value={v('numero')} placeholder="001/2026" wrapperClass="md:col-span-2" />
		<Select label="Situação" name="situacao" value={processo?.situacao ?? 'ativo'} wrapperClass="md:col-span-3">
			{#each PROCESSO_SITUACAO as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
		</Select>

		<Input label="Secretaria" name="secretaria" value={v('secretaria')} placeholder="ADM, CUL, EDU, OBR…" wrapperClass="md:col-span-4" />
		<Input label="Responsável" name="responsavel" value={v('responsavel')} wrapperClass="md:col-span-5" />
		<Input label="Prazo" type="date" name="prazo" value={v('prazo')} wrapperClass="md:col-span-3" />
	</div>

	<h2 class="text-base font-semibold text-navy mt-6 mb-3">Etapas</h2>
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		{#each PROCESSO_ETAPAS as e (e.key)}
			<Select label={e.label} name={`etapa_${e.key}`} value={etapaAtual(e.key)}>
				{#each ETAPA_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</Select>
		{/each}
	</div>

	<div class="flex gap-2 mt-6">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => goto('/processos')}>Cancelar</Button>
	</div>
</form>
