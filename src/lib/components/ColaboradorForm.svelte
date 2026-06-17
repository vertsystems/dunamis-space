<script lang="ts">
	import { enhance } from '$app/forms';
	import { FUNCAO } from '$lib/equipe';

	let {
		colaborador = null,
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		colaborador?: Record<string, any> | null;
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => colaborador?.[k] ?? '';
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
				<label class="label" for="nome">Nome *</label>
				<div class="control"><input id="nome" class="input" name="nome" required value={v('nome')} /></div>
			</div>
		</div>
		<div class="column is-6">
			<div class="field">
				<label class="label" for="email">E-mail *</label>
				<div class="control"><input id="email" class="input" type="email" name="email" required value={v('email')} /></div>
			</div>
		</div>

		<div class="column is-6">
			<div class="field">
				<label class="label" for="funcao">Função</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="funcao" name="funcao" value={colaborador?.funcao ?? 'social_media'}>
							{#each FUNCAO as f (f.value)}<option value={f.value}>{f.label}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-6">
			<div class="field">
				<label class="label" for="custo_hora">Custo por hora (R$)</label>
				<div class="control"><input id="custo_hora" class="input" type="number" step="0.01" name="custo_hora" value={v('custo_hora')} /></div>
			</div>
		</div>

		<div class="column is-12">
			<label class="checkbox">
				<input type="checkbox" name="ativo" checked={colaborador ? !!colaborador.ativo : true} />
				Ativo
			</label>
		</div>
	</div>

	<div class="field is-grouped mt-2">
		<div class="control"><button class="button is-primary" class:is-loading={saving} type="submit">{submitLabel}</button></div>
		<div class="control"><a class="button is-light" href="/equipe">Cancelar</a></div>
	</div>
</form>
