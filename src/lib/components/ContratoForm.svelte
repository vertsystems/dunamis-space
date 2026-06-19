<script lang="ts">
	import { enhance } from '$app/forms';
	import { CONTRATO_STATUS } from '$lib/contratos';

	let {
		contrato = null,
		clientes = [],
		planos = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		contrato?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		planos?: { id: string; nome: string; valor_mensal: number }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	let planoId = $state(contrato?.plano_id ?? '');
	let valor = $state(contrato?.valor_mensal ?? '');

	function onPlanoChange() {
		const p = planos.find((x) => x.id === planoId);
		if (p && (valor === '' || Number(valor) === 0)) valor = String(p.valor_mensal);
	}
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
			<select class="form-select" id="cliente_id" name="cliente_id" required value={contrato?.cliente_id ?? ''}>
				<option value="" disabled>Selecione um cliente</option>
				{#each clientes as c (c.id)}
					<option value={c.id}>{c.nome}</option>
				{/each}
			</select>
		</div>
		<div class="col-md-6">
			<label class="form-label" for="plano_id">Plano</label>
			<select class="form-select" id="plano_id" name="plano_id" bind:value={planoId} onchange={onPlanoChange}>
				<option value="">— sem plano —</option>
				{#each planos as p (p.id)}
					<option value={p.id}>{p.nome}</option>
				{/each}
			</select>
		</div>

		<div class="col-md-4">
			<label class="form-label" for="valor_mensal">Valor mensal (R$)</label>
			<input id="valor_mensal" class="form-control" type="number" step="0.01" name="valor_mensal" bind:value={valor} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="data_inicio">Início</label>
			<input id="data_inicio" class="form-control" type="date" name="data_inicio" value={contrato?.data_inicio ?? ''} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="data_fim">Fim</label>
			<input id="data_fim" class="form-control" type="date" name="data_fim" value={contrato?.data_fim ?? ''} />
		</div>

		<div class="col-md-4">
			<label class="form-label" for="status">Status</label>
			<select class="form-select" id="status" name="status" value={contrato?.status ?? 'ativo'}>
				{#each CONTRATO_STATUS as s (s.value)}
					<option value={s.value}>{s.label}</option>
				{/each}
			</select>
		</div>
		<div class="col-md-8 d-flex align-items-end">
			<div class="form-check">
				<input
					class="form-check-input"
					type="checkbox"
					id="renovacao_automatica"
					name="renovacao_automatica"
					checked={!!contrato?.renovacao_automatica}
				/>
				<label class="form-check-label" for="renovacao_automatica">Renovação automática</label>
			</div>
		</div>
	</div>

	<div class="d-flex gap-2 mt-3">
		<button class="btn btn-primary" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
		<a class="btn btn-light" href="/contratos">Cancelar</a>
	</div>
</form>
