<script lang="ts">
	// Formulário do projeto próprio. O peso da tela é a Descrição: é ali que ele
	// registra banco de dados, hospedagem e o resto do "onde as coisas estão" —
	// por isso ela ganha o editor formatado e a maior parte da altura, enquanto a
	// identificação (nome, status, responsável) ocupa uma faixa só, no topo.
	import { PROJETO_STATUS } from '$lib/projetos';
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

		<div class="md:col-span-12">
			<span class="mb-1.5 block text-sm font-medium text-navy">Descrição</span>
			<RichText
				value={(projeto?.descricao as string | null) ?? ''}
				placeholder="Onde está hospedado, qual banco de dados, domínio, variáveis de ambiente, o que falta fazer…"
				minHeight={260}
				alturaColapsada={460}
				onSave={(html) => (descricao = html)}
			/>
			<input type="hidden" name="descricao" value={descricao} />
		</div>
	</div>
</FormShell>
