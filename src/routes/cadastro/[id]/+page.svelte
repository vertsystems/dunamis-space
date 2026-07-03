<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/toast.svelte';
	import { Button, Card, Breadcrumb, Input, Select, Textarea } from '$lib/components/ui';

	let { data, form } = $props();

	// Em caso de falha na action, reidrata com os valores enviados.
	const cliente = $derived(form?.values ?? data.cliente);

	// Valor mensal de referência exibido sem símbolo de moeda (ex.: 1.500,00).
	const mrrValor = $derived(
		cliente.mrr != null
			? Number(cliente.mrr).toLocaleString('pt-BR', {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				})
			: ''
	);

	let saving = $state(false);
</script>

<Breadcrumb items={[{ label: 'Cadastro', href: '/cadastro' }, { label: data.cliente.nome }]} />

<div class="mb-4">
	<h1 class="text-xl font-bold text-navy">{data.cliente.nome}</h1>
	<p class="text-sm text-grey">Ficha cadastral e dados de referência</p>
</div>

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
		Ficha salva.
	</div>
{:else if form?.error}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
		{form.error}
	</div>
{/if}

<Card>
	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				await update();
				saving = false;
				if (result.type === 'success') toast.success('Ficha salva.');
				else if (result.type === 'failure')
					toast.error((result.data as { error?: string })?.error ?? 'Erro ao salvar.');
			};
		}}
	>
		<div class="grid grid-cols-12 gap-3">
			<Input
				label="Razão social"
				name="razao_social"
				value={cliente.razao_social ?? ''}
				wrapperClass="col-span-12 md:col-span-8"
			/>
			<Input
				label="CNPJ/CPF"
				name="cnpj_cpf"
				value={cliente.cnpj_cpf ?? ''}
				wrapperClass="col-span-12 md:col-span-4"
			/>

			<Input
				label="Plano"
				name="plano_ref"
				value={cliente.plano_ref ?? ''}
				wrapperClass="col-span-12 md:col-span-4"
			/>
			<Input
				label="Valor mensal ref. (R$)"
				name="mrr"
				inputmode="decimal"
				placeholder="0,00"
				value={mrrValor}
				wrapperClass="col-span-6 md:col-span-3"
			/>
			<Input
				label="Dia de vencimento"
				name="dia_vencimento"
				type="number"
				min="1"
				max="31"
				value={cliente.dia_vencimento ?? ''}
				wrapperClass="col-span-6 md:col-span-2"
			/>
			<Input
				label="Forma de pagamento"
				name="forma_pagamento"
				placeholder="Ex.: Boleto, Pix, Cartão"
				value={cliente.forma_pagamento ?? ''}
				wrapperClass="col-span-12 md:col-span-3"
			/>

			<Input
				label="Endereço"
				name="endereco"
				value={cliente.endereco ?? ''}
				wrapperClass="col-span-12"
			/>
			<Input
				label="Cidade"
				name="cidade"
				value={cliente.cidade ?? ''}
				wrapperClass="col-span-12 md:col-span-5"
			/>
			<Input
				label="Estado (UF)"
				name="estado"
				maxlength={2}
				placeholder="UF"
				value={cliente.estado ?? ''}
				wrapperClass="col-span-6 md:col-span-3"
			/>
			<Input
				label="CEP"
				name="cep"
				value={cliente.cep ?? ''}
				wrapperClass="col-span-6 md:col-span-4"
			/>

			<Input
				label="Contato financeiro"
				name="contato_financeiro"
				placeholder="Nome / e-mail / telefone"
				value={cliente.contato_financeiro ?? ''}
				wrapperClass="col-span-12 md:col-span-6"
			/>

			<Textarea
				label="Observações"
				name="observacoes"
				rows={4}
				value={cliente.observacoes ?? ''}
				wrapperClass="col-span-12"
			/>
		</div>

		<div class="mt-5 flex flex-wrap items-center gap-2">
			<Button type="submit" loading={saving}>Salvar</Button>
			<Button variant="secondary" onclick={() => goto('/cadastro')}>Cancelar</Button>
		</div>

		<p class="mt-3 text-xs text-grey">
			Dados comerciais (status, segmento, responsável, interações) ficam em
			<a class="text-brand hover:underline" href={'/clientes/' + data.cliente.id}>Clientes (Comercial)</a>.
		</p>
	</form>
</Card>
