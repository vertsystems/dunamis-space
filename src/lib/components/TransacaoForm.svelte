<script lang="ts">
	import { enhance } from '$app/forms';
	import { TRANSACAO_TIPO, TRANSACAO_STATUS } from '$lib/financeiro';

	let {
		transacao = null,
		clientes = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		transacao?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => transacao?.[k] ?? '';
	const today = new Date().toISOString().slice(0, 10);
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
		<div class="col-md-4">
			<label class="form-label" for="tipo">Tipo *</label>
			<select class="form-select" id="tipo" name="tipo" value={transacao?.tipo ?? 'receita'}>
				{#each TRANSACAO_TIPO as t (t.value)}
					<option value={t.value}>{t.label}</option>
				{/each}
			</select>
		</div>
		<div class="col-md-4">
			<label class="form-label" for="valor">Valor (R$) *</label>
			<input id="valor" class="form-control" type="number" step="0.01" name="valor" required value={v('valor')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="status">Status</label>
			<select class="form-select" id="status" name="status" value={transacao?.status ?? 'previsto'}>
				{#each TRANSACAO_STATUS as s (s.value)}
					<option value={s.value}>{s.label}</option>
				{/each}
			</select>
		</div>

		<div class="col-md-8">
			<label class="form-label" for="descricao">Descrição</label>
			<input id="descricao" class="form-control" name="descricao" value={v('descricao')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="categoria">Categoria</label>
			<input id="categoria" class="form-control" name="categoria" value={v('categoria')} placeholder="Mensalidade, Tráfego…" />
		</div>

		<div class="col-md-4">
			<label class="form-label" for="cliente_id">Cliente</label>
			<select class="form-select" id="cliente_id" name="cliente_id" value={transacao?.cliente_id ?? ''}>
				<option value="">— nenhum —</option>
				{#each clientes as c (c.id)}
					<option value={c.id}>{c.nome}</option>
				{/each}
			</select>
		</div>
		<div class="col-md-4">
			<label class="form-label" for="data_competencia">Competência</label>
			<input id="data_competencia" class="form-control" type="date" name="data_competencia" value={transacao?.data_competencia ?? today} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="data_pagamento">Pagamento</label>
			<input id="data_pagamento" class="form-control" type="date" name="data_pagamento" value={v('data_pagamento')} />
		</div>

		<div class="col-12">
			<div class="form-check">
				<input class="form-check-input" type="checkbox" id="recorrente" name="recorrente" checked={!!transacao?.recorrente} />
				<label class="form-check-label" for="recorrente">Recorrente (se repete todo mês)</label>
			</div>
		</div>
	</div>

	<div class="d-flex gap-2 mt-3">
		<button class="btn btn-primary" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
		<a class="btn btn-light" href="/financeiro">Cancelar</a>
	</div>
</form>
