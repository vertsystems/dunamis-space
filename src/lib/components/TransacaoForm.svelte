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
	{#if error}<div class="notification is-danger is-light">{error}</div>{/if}

	<div class="columns is-multiline">
		<div class="column is-4">
			<div class="field">
				<label class="label" for="tipo">Tipo *</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="tipo" name="tipo" value={transacao?.tipo ?? 'receita'}>
							{#each TRANSACAO_TIPO as t (t.value)}
								<option value={t.value}>{t.label}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="valor">Valor (R$) *</label>
				<div class="control">
					<input id="valor" class="input" type="number" step="0.01" name="valor" required value={v('valor')} />
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="status">Status</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="status" name="status" value={transacao?.status ?? 'previsto'}>
							{#each TRANSACAO_STATUS as s (s.value)}
								<option value={s.value}>{s.label}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>

		<div class="column is-8">
			<div class="field">
				<label class="label" for="descricao">Descrição</label>
				<div class="control">
					<input id="descricao" class="input" name="descricao" value={v('descricao')} />
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="categoria">Categoria</label>
				<div class="control">
					<input id="categoria" class="input" name="categoria" value={v('categoria')} placeholder="Mensalidade, Tráfego…" />
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="field">
				<label class="label" for="cliente_id">Cliente</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="cliente_id" name="cliente_id" value={transacao?.cliente_id ?? ''}>
							<option value="">— nenhum —</option>
							{#each clientes as c (c.id)}
								<option value={c.id}>{c.nome}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="data_competencia">Competência</label>
				<div class="control">
					<input
						id="data_competencia"
						class="input"
						type="date"
						name="data_competencia"
						value={transacao?.data_competencia ?? today}
					/>
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="data_pagamento">Pagamento</label>
				<div class="control">
					<input id="data_pagamento" class="input" type="date" name="data_pagamento" value={v('data_pagamento')} />
				</div>
			</div>
		</div>

		<div class="column is-12">
			<label class="checkbox">
				<input type="checkbox" name="recorrente" checked={!!transacao?.recorrente} />
				Recorrente (se repete todo mês)
			</label>
		</div>
	</div>

	<div class="field is-grouped mt-2">
		<div class="control">
			<button class="button is-primary" class:is-loading={saving} type="submit">{submitLabel}</button>
		</div>
		<div class="control"><a class="button is-light" href="/financeiro">Cancelar</a></div>
	</div>
</form>
