<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { CLIENTE_STATUS } from '$lib/clientes';
	import { Button, Input, Select, Textarea } from '$lib/components/ui';

	let {
		cliente = null,
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		cliente?: Record<string, any> | null;
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);

	const v = (k: string) => cliente?.[k] ?? '';
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
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			{error}
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
		<Input label="Nome *" name="nome" required value={v('nome')} wrapperClass="md:col-span-8" />
		<Select
			label="Status"
			name="status"
			value={cliente?.status ?? 'lead'}
			wrapperClass="md:col-span-4"
		>
			{#each CLIENTE_STATUS as s (s.value)}
				<option value={s.value}>{s.label}</option>
			{/each}
		</Select>

		<Input label="Razão social" name="razao_social" value={v('razao_social')} wrapperClass="md:col-span-6" />
		<Input label="CNPJ / CPF" name="cnpj_cpf" value={v('cnpj_cpf')} wrapperClass="md:col-span-6" />

		<Input label="Contato" name="contato_nome" value={v('contato_nome')} wrapperClass="md:col-span-4" />
		<Input label="E-mail do contato" type="email" name="contato_email" value={v('contato_email')} wrapperClass="md:col-span-4" />
		<Input label="WhatsApp" name="contato_whatsapp" value={v('contato_whatsapp')} wrapperClass="md:col-span-4" />

		<Select label="Responsável" name="responsavel_id" value={cliente?.responsavel_id ?? ''} wrapperClass="md:col-span-4">
			<option value="">—</option>
			{#each colaboradores as col (col.id)}
				<option value={col.id}>{col.nome}</option>
			{/each}
		</Select>
		<Input label="Segmento" name="segmento" value={v('segmento')} wrapperClass="md:col-span-4" />
		<Input label="Início" type="date" name="data_inicio" value={v('data_inicio')} wrapperClass="md:col-span-2" />
		<Input label="MRR (R$)" type="number" step="0.01" name="mrr" value={v('mrr')} wrapperClass="md:col-span-2" />

		<Textarea label="Observações" name="observacoes" rows={3} value={v('observacoes')} wrapperClass="md:col-span-12" />
	</div>

	<div class="flex gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => goto('/clientes')}>Cancelar</Button>
	</div>
</form>
