<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { tagsToText } from '$lib/kb';
	import { Button, Input, Select, Textarea } from '$lib/components/ui';

	let {
		artigo = null,
		clientes = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		artigo?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => artigo?.[k] ?? '';
	const tags = artigo?.tags ? tagsToText(artigo.tags) : '';
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
		<Input label="Título *" name="titulo" required value={v('titulo')} wrapperClass="md:col-span-8" />
		<Input label="Categoria" name="categoria" value={v('categoria')} placeholder="Processos, Padrões…" wrapperClass="md:col-span-4" />

		<Select label="Cliente (opcional)" name="cliente_id" value={artigo?.cliente_id ?? ''} wrapperClass="md:col-span-6">
			<option value="">— geral —</option>
			{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>
		<Input label="Tags (separadas por vírgula)" name="tags" value={tags} placeholder="instagram, legenda, bazzar" wrapperClass="md:col-span-6" />

		<Textarea label="Conteúdo" name="conteudo" rows={10} value={v('conteudo')} wrapperClass="md:col-span-12" />
	</div>

	<div class="flex gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => goto('/base-conhecimento')}>Cancelar</Button>
	</div>
</form>
