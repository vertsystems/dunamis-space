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
		// Preenche o valor com o do plano (sobrescreve se vazio ou zero).
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
	{#if error}<div class="notification is-danger is-light">{error}</div>{/if}

	<div class="columns is-multiline">
		<div class="column is-6">
			<div class="field">
				<label class="label" for="cliente_id">Cliente *</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="cliente_id" name="cliente_id" required value={contrato?.cliente_id ?? ''}>
							<option value="" disabled>Selecione um cliente</option>
							{#each clientes as c (c.id)}
								<option value={c.id}>{c.nome}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-6">
			<div class="field">
				<label class="label" for="plano_id">Plano</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="plano_id" name="plano_id" bind:value={planoId} onchange={onPlanoChange}>
							<option value="">— sem plano —</option>
							{#each planos as p (p.id)}
								<option value={p.id}>{p.nome}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="field">
				<label class="label" for="valor_mensal">Valor mensal (R$)</label>
				<div class="control">
					<input id="valor_mensal" class="input" type="number" step="0.01" name="valor_mensal" bind:value={valor} />
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="data_inicio">Início</label>
				<div class="control">
					<input id="data_inicio" class="input" type="date" name="data_inicio" value={contrato?.data_inicio ?? ''} />
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="data_fim">Fim</label>
				<div class="control">
					<input id="data_fim" class="input" type="date" name="data_fim" value={contrato?.data_fim ?? ''} />
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="field">
				<label class="label" for="status">Status</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="status" name="status" value={contrato?.status ?? 'ativo'}>
							{#each CONTRATO_STATUS as s (s.value)}
								<option value={s.value}>{s.label}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-8">
			<label class="label">&nbsp;</label>
			<label class="checkbox">
				<input
					type="checkbox"
					name="renovacao_automatica"
					checked={!!contrato?.renovacao_automatica}
				/>
				Renovação automática
			</label>
		</div>
	</div>

	<div class="field is-grouped mt-2">
		<div class="control">
			<button class="button is-primary" class:is-loading={saving} type="submit">{submitLabel}</button>
		</div>
		<div class="control"><a class="button is-light" href="/contratos">Cancelar</a></div>
	</div>
</form>
