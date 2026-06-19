<script lang="ts">
	import { enhance } from '$app/forms';
	import { PROJETO_TIPO, PROJETO_STATUS } from '$lib/projetos';

	let {
		projeto = null,
		clientes = [],
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		projeto?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => projeto?.[k] ?? '';
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
			<label class="form-label" for="nome">Nome do projeto *</label>
			<input id="nome" class="form-control" name="nome" required value={v('nome')} />
		</div>
		<div class="col-md-6">
			<label class="form-label" for="cliente_id">Cliente *</label>
			<select class="form-select" id="cliente_id" name="cliente_id" required value={projeto?.cliente_id ?? ''}>
				<option value="" disabled>Selecione um cliente</option>
				{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
			</select>
		</div>

		<div class="col-md-4">
			<label class="form-label" for="tipo">Tipo</label>
			<select class="form-select" id="tipo" name="tipo" value={projeto?.tipo ?? 'social_media'}>
				{#each PROJETO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
			</select>
		</div>
		<div class="col-md-4">
			<label class="form-label" for="status">Status</label>
			<select class="form-select" id="status" name="status" value={projeto?.status ?? 'em_andamento'}>
				{#each PROJETO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</select>
		</div>
		<div class="col-md-4">
			<label class="form-label" for="responsavel_id">Responsável</label>
			<select class="form-select" id="responsavel_id" name="responsavel_id" value={projeto?.responsavel_id ?? ''}>
				<option value="">—</option>
				{#each colaboradores as col (col.id)}<option value={col.id}>{col.nome}</option>{/each}
			</select>
		</div>

		<div class="col-md-3">
			<label class="form-label" for="data_inicio">Início</label>
			<input id="data_inicio" class="form-control" type="date" name="data_inicio" value={v('data_inicio')} />
		</div>
		<div class="col-md-3">
			<label class="form-label" for="prazo">Prazo</label>
			<input id="prazo" class="form-control" type="date" name="prazo" value={v('prazo')} />
		</div>
		<div class="col-md-3">
			<label class="form-label" for="valor">Valor (R$, se pontual)</label>
			<input id="valor" class="form-control" type="number" step="0.01" name="valor" value={v('valor')} />
		</div>
		<div class="col-md-3 d-flex align-items-end">
			<div class="form-check">
				<input class="form-check-input" type="checkbox" id="recorrente" name="recorrente" checked={!!projeto?.recorrente} />
				<label class="form-check-label" for="recorrente">Recorrente</label>
			</div>
		</div>

		<div class="col-12">
			<label class="form-label" for="descricao">Descrição</label>
			<textarea id="descricao" class="form-control" name="descricao" rows="3">{v('descricao')}</textarea>
		</div>
	</div>

	<div class="d-flex gap-2 mt-3">
		<button class="btn btn-primary" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
		<a class="btn btn-light" href="/projetos">Cancelar</a>
	</div>
</form>
