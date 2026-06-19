<script lang="ts">
	import { enhance } from '$app/forms';
	import { CONTEUDO_TIPO, CONTEUDO_STATUS } from '$lib/conteudo';

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
	{#if error}<div class="alert alert-danger">{error}</div>{/if}

	<div class="row g-3">
		<div class="col-md-6">
			<label class="form-label" for="cliente_id">Cliente *</label>
			<select class="form-select" id="cliente_id" name="cliente_id" required value={conteudo?.cliente_id ?? ''}>
				<option value="" disabled>Selecione um cliente</option>
				{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
			</select>
		</div>
		<div class="col-md-3">
			<label class="form-label" for="tipo">Tipo</label>
			<select class="form-select" id="tipo" name="tipo" value={conteudo?.tipo ?? 'feed'}>
				{#each CONTEUDO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
			</select>
		</div>
		<div class="col-md-3">
			<label class="form-label" for="status">Status</label>
			<select class="form-select" id="status" name="status" value={conteudo?.status ?? 'rascunho'}>
				{#each CONTEUDO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</select>
		</div>

		<div class="col-md-6">
			<label class="form-label" for="titulo">Título</label>
			<input id="titulo" class="form-control" name="titulo" value={v('titulo')} />
		</div>
		<div class="col-md-6">
			<label class="form-label" for="data_publicacao">Data de publicação</label>
			<input id="data_publicacao" class="form-control" type="datetime-local" name="data_publicacao" value={dataPub} />
		</div>

		<div class="col-md-4">
			<label class="form-label" for="projeto_id">Projeto</label>
			<select class="form-select" id="projeto_id" name="projeto_id" value={conteudo?.projeto_id ?? ''}>
				<option value="">—</option>
				{#each projetos as p (p.id)}<option value={p.id}>{p.nome}</option>{/each}
			</select>
		</div>
		<div class="col-md-4">
			<label class="form-label" for="responsavel_id">Responsável</label>
			<select class="form-select" id="responsavel_id" name="responsavel_id" value={conteudo?.responsavel_id ?? ''}>
				<option value="">—</option>
				{#each colaboradores as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
			</select>
		</div>
		<div class="col-md-4">
			<label class="form-label" for="arte_url">URL da arte</label>
			<input id="arte_url" class="form-control" name="arte_url" value={v('arte_url')} placeholder="link do Drive/imagem" />
		</div>

		<div class="col-12">
			<label class="form-label" for="legenda">Legenda</label>
			<textarea id="legenda" class="form-control" name="legenda" rows="4">{v('legenda')}</textarea>
		</div>

		<div class="col-12">
			<div class="form-check">
				<input class="form-check-input" type="checkbox" id="publicado_manual" name="publicado_manual" checked={!!conteudo?.publicado_manual} />
				<label class="form-check-label" for="publicado_manual">Postado manualmente</label>
			</div>
		</div>
	</div>

	<div class="d-flex gap-2 mt-3">
		<button class="btn btn-primary" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
		<a class="btn btn-light" href="/conteudo">Cancelar</a>
	</div>
</form>
