<script lang="ts">
	import { PROJETO_TIPO, PROJETO_STATUS } from '$lib/projetos';
	import { Input, Select, Textarea, Checkbox, FormShell } from '$lib/components/ui';
	import ResponsavelPicker from '$lib/components/ResponsavelPicker.svelte';

	let {
		projeto = null,
		clientes = [],
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone
	}: {
		projeto?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
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
</script>

<FormShell {action} {error} {submitLabel} {onCancel} {onDone} cancelHref="/projetos">
	<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
		<Input label="Nome do projeto *" name="nome" required value={v('nome')} wrapperClass="md:col-span-6" />
		<Select label="Cliente *" name="cliente_id" required value={projeto?.cliente_id ?? ''} wrapperClass="md:col-span-6">
			<option value="" disabled>Selecione um cliente</option>
			{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>

		<Select label="Tipo" name="tipo" value={projeto?.tipo ?? 'social_media'} wrapperClass="md:col-span-4">
			{#each PROJETO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
		</Select>
		<Select label="Status" name="status" value={projeto?.status ?? 'em_andamento'} wrapperClass="md:col-span-4">
			{#each PROJETO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
		</Select>
		<ResponsavelPicker {colaboradores} value={projeto?.responsavel_id ?? null} wrapperClass="md:col-span-12" />

		<Input label="Início" type="date" name="data_inicio" value={v('data_inicio')} wrapperClass="md:col-span-3" />
		<Input label="Prazo" type="date" name="prazo" value={v('prazo')} wrapperClass="md:col-span-3" />
		<Input label="Valor (R$, se pontual)" type="number" step="0.01" name="valor" value={v('valor')} wrapperClass="md:col-span-3" />
		<div class="md:col-span-3 flex items-end">
			<Checkbox label="Recorrente" name="recorrente" checked={!!projeto?.recorrente} />
		</div>

		<Textarea label="Descrição" name="descricao" rows={3} value={v('descricao')} wrapperClass="md:col-span-12" />
	</div>
</FormShell>
