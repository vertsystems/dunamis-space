<script lang="ts">
	// Formulário da ficha de um serviço/ferramenta do cliente (criar/editar em
	// modal). Os logins de cada unidade não estão aqui: são cadastrados um a um
	// dentro do serviço, pelo ServicoAcessoForm.
	import { Input, Textarea, FormShell } from '$lib/components/ui';
	import ResponsavelPicker from '$lib/components/ResponsavelPicker.svelte';
	import { SERVICO_CATEGORIAS } from '$lib/servicos';
	import type { ServicoItem } from '$lib/servicos';
	import { VALOR_MASCARA } from '$lib/valores';

	let {
		item = null,
		colaboradores = [],
		podeValores = false,
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone
	}: {
		item?: ServicoItem | Record<string, unknown> | null;
		colaboradores?: {
			id: string;
			nome: string;
			avatar_url?: string | null;
			funcao?: string | null;
			funcoes?: string[] | null;
		}[];
		podeValores?: boolean;
		error?: string | null;
		submitLabel?: string;
		action?: string;
		onCancel?: () => void;
		onDone?: () => void;
	} = $props();

	const v = (k: string) => (item?.[k as keyof typeof item] as string | null) ?? '';
</script>

<FormShell {action} {error} {submitLabel} {onCancel} {onDone} footerClass="mt-5">
	{#if item?.id}
		<input type="hidden" name="id" value={item.id as string} />
	{/if}

	<div class="grid grid-cols-1 gap-4 md:grid-cols-12">
		<Input
			label="Serviço / ferramenta *"
			name="nome"
			required
			placeholder="Rádio Indoor, Sistema PDV, Telefonia…"
			value={v('nome')}
			wrapperClass="md:col-span-7"
		/>
		<Input
			label="Categoria"
			name="categoria"
			list="servico-categorias"
			value={v('categoria')}
			wrapperClass="md:col-span-5"
		/>
		<datalist id="servico-categorias">
			{#each SERVICO_CATEGORIAS as c (c)}<option value={c}></option>{/each}
		</datalist>

		<Input
			label="Endereço de acesso (URL)"
			name="url"
			placeholder="painel.radioindoor.com.br"
			value={v('url')}
			wrapperClass="md:col-span-12"
		/>

		<Input
			label="Fornecedor"
			name="fornecedor"
			placeholder="Quem fornece o serviço"
			value={v('fornecedor')}
			wrapperClass="md:col-span-6"
		/>
		<Input
			label="Contato do suporte"
			name="suporte_contato"
			placeholder="(00) 00000-0000 ou suporte@empresa.com"
			value={v('suporte_contato')}
			wrapperClass="md:col-span-6"
		/>

		<!-- Mesmo tratamento do MRR do cliente: sem o módulo 'valores' o campo não
		     tem `name`, então não entra no FormData — e a action ainda descarta a
		     coluna. Duas travas, de propósito. -->
		{#if podeValores}
			<Input
				label="Custo mensal (R$)"
				type="number"
				step="0.01"
				name="custo_mensal"
				placeholder="0.00"
				value={v('custo_mensal')}
				wrapperClass="md:col-span-4"
			/>
		{:else}
			<Input
				label="Custo mensal (R$)"
				value={VALOR_MASCARA}
				disabled
				readonly
				title="Só quem tem os valores liberados vê este campo"
				wrapperClass="md:col-span-4"
			/>
		{/if}

		<Textarea
			label="Observações"
			name="observacoes"
			rows={3}
			placeholder="Contrato, particularidades, o que fazer quando cai…"
			value={v('observacoes')}
			wrapperClass="md:col-span-12"
		/>

		<ResponsavelPicker
			{colaboradores}
			name="responsavel_id"
			label="Quem cuida deste serviço"
			value={(item?.responsavel_id as string | null) ?? null}
			wrapperClass="md:col-span-12"
		/>
	</div>
</FormShell>
