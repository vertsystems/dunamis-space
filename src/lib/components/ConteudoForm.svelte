<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { CONTEUDO_TIPO, CONTEUDO_STATUS } from '$lib/conteudo';
	import { Button, Input, Select, Textarea, Checkbox } from '$lib/components/ui';

	let {
		conteudo = null,
		clientes = [],
		projetos = [],
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		conteudo?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		projetos?: { id: string; nome: string }[];
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => conteudo?.[k] ?? '';
	const dataPub = conteudo?.data_publicacao ? String(conteudo.data_publicacao).slice(0, 16) : '';
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
		<Select label="Cliente *" name="cliente_id" required value={conteudo?.cliente_id ?? ''} wrapperClass="md:col-span-6">
			<option value="" disabled>Selecione um cliente</option>
			{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>
		<Select label="Tipo" name="tipo" value={conteudo?.tipo ?? 'feed'} wrapperClass="md:col-span-3">
			{#each CONTEUDO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
		</Select>
		<Select label="Status" name="status" value={conteudo?.status ?? 'rascunho'} wrapperClass="md:col-span-3">
			{#each CONTEUDO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
		</Select>

		<Input label="Título" name="titulo" value={v('titulo')} wrapperClass="md:col-span-6" />
		<Input label="Data de publicação" type="datetime-local" name="data_publicacao" value={dataPub} wrapperClass="md:col-span-6" />

		<Select label="Projeto" name="projeto_id" value={conteudo?.projeto_id ?? ''} wrapperClass="md:col-span-4">
			<option value="">—</option>
			{#each projetos as p (p.id)}<option value={p.id}>{p.nome}</option>{/each}
		</Select>
		<Select label="Responsável" name="responsavel_id" value={conteudo?.responsavel_id ?? ''} wrapperClass="md:col-span-4">
			<option value="">—</option>
			{#each colaboradores as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>
		<Input label="URL da arte" name="arte_url" value={v('arte_url')} placeholder="link do Drive/imagem" wrapperClass="md:col-span-4" />

		<Textarea label="Legenda" name="legenda" rows={4} value={v('legenda')} wrapperClass="md:col-span-12" />

		<div class="md:col-span-12">
			<Checkbox label="Postado manualmente" name="publicado_manual" checked={!!conteudo?.publicado_manual} />
		</div>
	</div>

	<div class="flex gap-2 mt-4">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => goto('/conteudo')}>Cancelar</Button>
	</div>
</form>
