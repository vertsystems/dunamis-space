<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		campanha = null,
		clientes = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		campanha?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => campanha?.[k] ?? '';
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
			<label class="form-label" for="nome">Nome da campanha *</label>
			<input id="nome" class="form-control" name="nome" required value={v('nome')} placeholder="Operação Fecha Mês" />
		</div>
		<div class="col-md-6">
			<label class="form-label" for="cliente_id">Cliente *</label>
			<select class="form-select" id="cliente_id" name="cliente_id" required value={campanha?.cliente_id ?? ''}>
				<option value="" disabled>Selecione um cliente</option>
				{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
			</select>
		</div>
		<div class="col-md-3">
			<label class="form-label" for="data_inicio">Início</label>
			<input id="data_inicio" class="form-control" type="date" name="data_inicio" value={v('data_inicio')} />
		</div>
		<div class="col-md-3">
			<label class="form-label" for="data_fim">Fim</label>
			<input id="data_fim" class="form-control" type="date" name="data_fim" value={v('data_fim')} />
		</div>
		<div class="col-12">
			<label class="form-label" for="descricao">Descrição</label>
			<textarea id="descricao" class="form-control" name="descricao" rows="2">{v('descricao')}</textarea>
		</div>
	</div>

	<div class="d-flex gap-2 mt-3">
		<button class="btn btn-primary" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
		<a class="btn btn-light" href="/campanhas">Cancelar</a>
	</div>
</form>
