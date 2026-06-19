<script lang="ts">
	import { enhance } from '$app/forms';
	import { tagsToText } from '$lib/kb';

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
	{#if error}<div class="alert alert-danger">{error}</div>{/if}

	<div class="row g-3">
		<div class="col-md-8">
			<label class="form-label" for="titulo">Título *</label>
			<input id="titulo" class="form-control" name="titulo" required value={v('titulo')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="categoria">Categoria</label>
			<input id="categoria" class="form-control" name="categoria" value={v('categoria')} placeholder="Processos, Padrões…" />
		</div>

		<div class="col-md-6">
			<label class="form-label" for="cliente_id">Cliente (opcional)</label>
			<select class="form-select" id="cliente_id" name="cliente_id" value={artigo?.cliente_id ?? ''}>
				<option value="">— geral —</option>
				{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
			</select>
		</div>
		<div class="col-md-6">
			<label class="form-label" for="tags">Tags (separadas por vírgula)</label>
			<input id="tags" class="form-control" name="tags" value={tags} placeholder="instagram, legenda, bazzar" />
		</div>

		<div class="col-12">
			<label class="form-label" for="conteudo">Conteúdo</label>
			<textarea id="conteudo" class="form-control" name="conteudo" rows="10">{v('conteudo')}</textarea>
		</div>
	</div>

	<div class="d-flex gap-2 mt-3">
		<button class="btn btn-primary" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
		<a class="btn btn-light" href="/base-conhecimento">Cancelar</a>
	</div>
</form>
