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
	{#if error}<div class="notification is-danger is-light">{error}</div>{/if}

	<div class="columns is-multiline">
		<div class="column is-8">
			<div class="field">
				<label class="label" for="titulo">Título *</label>
				<div class="control"><input id="titulo" class="input" name="titulo" required value={v('titulo')} /></div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="categoria">Categoria</label>
				<div class="control"><input id="categoria" class="input" name="categoria" value={v('categoria')} placeholder="Processos, Padrões…" /></div>
			</div>
		</div>

		<div class="column is-6">
			<div class="field">
				<label class="label" for="cliente_id">Cliente (opcional)</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="cliente_id" name="cliente_id" value={artigo?.cliente_id ?? ''}>
							<option value="">— geral —</option>
							{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-6">
			<div class="field">
				<label class="label" for="tags">Tags (separadas por vírgula)</label>
				<div class="control"><input id="tags" class="input" name="tags" value={tags} placeholder="instagram, legenda, bazzar" /></div>
			</div>
		</div>

		<div class="column is-12">
			<div class="field">
				<label class="label" for="conteudo">Conteúdo</label>
				<div class="control"><textarea id="conteudo" class="textarea" name="conteudo" rows="10">{v('conteudo')}</textarea></div>
			</div>
		</div>
	</div>

	<div class="field is-grouped mt-2">
		<div class="control"><button class="button is-primary" class:is-loading={saving} type="submit">{submitLabel}</button></div>
		<div class="control"><a class="button is-light" href="/base-conhecimento">Cancelar</a></div>
	</div>
</form>
