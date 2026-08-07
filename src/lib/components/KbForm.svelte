<script lang="ts">
	import { tagsToText } from '$lib/kb';
	import { Input, Select, Textarea, FormShell } from '$lib/components/ui';

	let {
		artigo = null,
		clientes = [],
		error = null,
		submitLabel = 'Salvar',
		action = '',
		onCancel,
		onDone
	}: {
		artigo?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
		/** Modo modal: chamado ao cancelar (em vez de navegar). */
		onCancel?: () => void;
		/** Modo modal: chamado ao salvar com sucesso (em vez de navegar/recarregar). */
		onDone?: () => void;
	} = $props();

	const v = (k: string) => artigo?.[k] ?? '';
	const tags = artigo?.tags ? tagsToText(artigo.tags) : '';
</script>

<FormShell {action} {error} {submitLabel} {onCancel} {onDone} cancelHref="/base-conhecimento">
	<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
		<Input label="Título *" name="titulo" required value={v('titulo')} wrapperClass="md:col-span-8" />
		<Input label="Categoria" name="categoria" value={v('categoria')} placeholder="Processos, Padrões…" wrapperClass="md:col-span-4" />

		<Select label="Cliente (opcional)" name="cliente_id" value={artigo?.cliente_id ?? ''} wrapperClass="md:col-span-6">
			<option value="">— geral —</option>
			{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>
		<Input label="Tags (separadas por vírgula)" name="tags" value={tags} placeholder="instagram, legenda, bazzar" wrapperClass="md:col-span-6" />

		<Textarea label="Conteúdo" name="conteudo" rows={10} value={v('conteudo')} wrapperClass="md:col-span-12" />
	</div>
</FormShell>
