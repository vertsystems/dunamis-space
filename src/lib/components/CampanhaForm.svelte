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
	{#if error}<div class="notification is-danger is-light">{error}</div>{/if}

	<div class="columns is-multiline">
		<div class="column is-6">
			<div class="field">
				<label class="label" for="nome">Nome da campanha *</label>
				<div class="control"><input id="nome" class="input" name="nome" required value={v('nome')} placeholder="Operação Fecha Mês" /></div>
			</div>
		</div>
		<div class="column is-6">
			<div class="field">
				<label class="label" for="cliente_id">Cliente *</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="cliente_id" name="cliente_id" required value={campanha?.cliente_id ?? ''}>
							<option value="" disabled>Selecione um cliente</option>
							{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-3">
			<div class="field">
				<label class="label" for="data_inicio">Início</label>
				<div class="control"><input id="data_inicio" class="input" type="date" name="data_inicio" value={v('data_inicio')} /></div>
			</div>
		</div>
		<div class="column is-3">
			<div class="field">
				<label class="label" for="data_fim">Fim</label>
				<div class="control"><input id="data_fim" class="input" type="date" name="data_fim" value={v('data_fim')} /></div>
			</div>
		</div>
		<div class="column is-12">
			<div class="field">
				<label class="label" for="descricao">Descrição</label>
				<div class="control"><textarea id="descricao" class="textarea" name="descricao" rows="2">{v('descricao')}</textarea></div>
			</div>
		</div>
	</div>

	<div class="field is-grouped mt-2">
		<div class="control"><button class="button is-primary" class:is-loading={saving} type="submit">{submitLabel}</button></div>
		<div class="control"><a class="button is-light" href="/campanhas">Cancelar</a></div>
	</div>
</form>
