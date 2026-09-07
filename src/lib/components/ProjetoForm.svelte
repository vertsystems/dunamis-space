<script lang="ts">
	// Formulário do projeto próprio, em duas faixas: em cima a identificação e os
	// endereços de "onde está" (o que ele procura de relance quando volta ao
	// projeto), embaixo a Descrição com o editor formatado — é ali que entram as
	// anotações longas, inclusive senhas e credenciais.
	import { PROJETO_STATUS, PROJETO_ONDE } from '$lib/projetos';
	import { Input, Select, FormShell, RichText } from '$lib/components/ui';
	import ResponsavelPicker from '$lib/components/ResponsavelPicker.svelte';

	let {
		projeto = null,
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone
	}: {
		projeto?: Record<string, any> | null;
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
		/** Modo modal: chamado ao cancelar (em vez de navegar). */
		onCancel?: () => void;
		/** Modo modal: chamado ao salvar com sucesso (em vez de navegar/recarregar). */
		onDone?: () => void;
	} = $props();

	const v = (k: string) => projeto?.[k] ?? '';

	// O editor é contenteditable: o HTML viaja num campo escondido para a action
	// receber `descricao` como qualquer outro campo do formulário.
	let descricao = $state(((projeto?.descricao as string | null) ?? '') as string);
</script>

<FormShell {action} {error} {submitLabel} {onCancel} {onDone} cancelHref="/projetos">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-12">
		<Input label="Nome do projeto *" name="nome" required value={v('nome')} wrapperClass="md:col-span-5" />
		<Select label="Status" name="status" value={projeto?.status ?? 'em_construcao'} wrapperClass="md:col-span-3">
			{#each PROJETO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
		</Select>
		<ResponsavelPicker {colaboradores} value={projeto?.responsavel_id ?? null} wrapperClass="md:col-span-4" />

		<!-- Onde o projeto está: os quatro endereços que ele sempre reprocura. -->
		{#each PROJETO_ONDE as c (c.campo)}
			<Input
				label={c.label}
				name={c.campo}
				value={v(c.campo)}
				placeholder={c.placeholder}
				wrapperClass="md:col-span-3"
			/>
		{/each}

		<div class="md:col-span-12">
			<span class="mb-1.5 block text-sm font-medium text-navy">Descrição</span>
			<RichText
				value={(projeto?.descricao as string | null) ?? ''}
				placeholder="Credenciais, variáveis de ambiente, como subir, o que falta fazer…"
				minHeight={260}
				alturaColapsada={460}
				onSave={(html) => (descricao = html)}
			/>
			<input type="hidden" name="descricao" value={descricao} />
		</div>
	</div>
</FormShell>
