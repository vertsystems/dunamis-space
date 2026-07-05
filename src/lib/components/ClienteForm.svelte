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
		action = '',
		onCancel,
		onDone
	}: {
		cliente?: Record<string, any> | null;
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
		/** Modo modal: chamado ao cancelar (em vez de navegar). */
		onCancel?: () => void;
		/** Modo modal: chamado ao salvar com sucesso (em vez de navegar/recarregar). */
		onDone?: () => void;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => cliente?.[k] ?? '';
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
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			{error}
		</div>
	{/if}

	<div class="space-y-5">
		<section>
			<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Geral</h3>
			<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
				<Input label="Nome *" name="nome" required value={v('nome')} wrapperClass="md:col-span-8" />
				<Select label="Status" name="status" value={cliente?.status ?? 'lead'} wrapperClass="md:col-span-4">
					{#each CLIENTE_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
				</Select>
				<Input label="Razão social" name="razao_social" value={v('razao_social')} wrapperClass="md:col-span-6" />
				<Input label="CNPJ / CPF" name="cnpj_cpf" value={v('cnpj_cpf')} wrapperClass="md:col-span-6" />
				<Input label="Segmento" name="segmento" value={v('segmento')} wrapperClass="md:col-span-4" />
				<Select label="Responsável" name="responsavel_id" value={cliente?.responsavel_id ?? ''} wrapperClass="md:col-span-4">
					<option value="">—</option>
					{#each colaboradores as col (col.id)}<option value={col.id}>{col.nome}</option>{/each}
				</Select>
				<Input label="Cliente desde" type="date" name="data_inicio" value={v('data_inicio')} wrapperClass="md:col-span-4" />
			</div>
		</section>

		<section>
			<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Contato</h3>
			<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
				<Input label="Contato" name="contato_nome" value={v('contato_nome')} wrapperClass="md:col-span-3" />
				<Input label="E-mail" type="email" name="contato_email" value={v('contato_email')} wrapperClass="md:col-span-3" />
				<Input label="WhatsApp" name="contato_whatsapp" value={v('contato_whatsapp')} wrapperClass="md:col-span-3" />
				<Input label="Contato financeiro" name="contato_financeiro" value={v('contato_financeiro')} placeholder="Nome / e-mail / tel." wrapperClass="md:col-span-3" />
			</div>
		</section>

		<section>
			<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Endereço</h3>
			<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
				<Input label="Endereço" name="endereco" value={v('endereco')} wrapperClass="md:col-span-6" />
				<Input label="Cidade" name="cidade" value={v('cidade')} wrapperClass="md:col-span-3" />
				<Input label="UF" name="estado" maxlength={2} placeholder="UF" value={v('estado')} wrapperClass="md:col-span-1" />
				<Input label="CEP" name="cep" value={v('cep')} wrapperClass="md:col-span-2" />
			</div>
		</section>

		<section>
			<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Financeiro</h3>
			<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
				<Input label="Plano" name="plano_ref" value={v('plano_ref')} wrapperClass="md:col-span-4" />
				<Input label="Valor mensal (R$)" type="number" step="0.01" name="mrr" value={v('mrr')} placeholder="0.00" wrapperClass="md:col-span-3" />
				<Input label="Dia de venc." type="number" min="1" max="31" name="dia_vencimento" value={v('dia_vencimento')} wrapperClass="md:col-span-2" />
				<Input label="Forma de pagamento" name="forma_pagamento" value={v('forma_pagamento')} placeholder="Boleto, Pix, Cartão" wrapperClass="md:col-span-3" />
			</div>
		</section>

		<Textarea label="Observações" name="observacoes" rows={3} value={v('observacoes')} />
	</div>

	<div class="flex gap-2 mt-5">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => (onCancel ? onCancel() : goto('/cadastro'))}>Cancelar</Button>
	</div>
</form>
