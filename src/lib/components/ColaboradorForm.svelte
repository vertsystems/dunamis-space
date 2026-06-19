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
	{#if error}<div class="alert alert-danger">{error}</div>{/if}

	<div class="row g-3">
		<div class="col-md-6">
			<label class="form-label" for="nome">Nome *</label>
			<input id="nome" class="form-control" name="nome" required value={v('nome')} />
		</div>
		<div class="col-md-6">
			<label class="form-label" for="email">E-mail *</label>
			<input id="email" class="form-control" type="email" name="email" required value={v('email')} />
		</div>

		<div class="col-md-6">
			<label class="form-label" for="funcao">Função</label>
			<select class="form-select" id="funcao" name="funcao" value={colaborador?.funcao ?? 'social_media'}>
				{#each FUNCAO as f (f.value)}<option value={f.value}>{f.label}</option>{/each}
			</select>
		</div>
		<div class="col-md-6">
			<label class="form-label" for="custo_hora">Custo por hora (R$)</label>
			<input id="custo_hora" class="form-control" type="number" step="0.01" name="custo_hora" value={v('custo_hora')} />
		</div>

		<div class="col-12">
			<div class="form-check">
				<input class="form-check-input" type="checkbox" id="ativo" name="ativo" checked={colaborador ? !!colaborador.ativo : true} />
				<label class="form-check-label" for="ativo">Ativo</label>
			</div>
		</div>
	</div>

	<div class="d-flex gap-2 mt-3">
		<button class="btn btn-primary" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
		<a class="btn btn-light" href="/equipe">Cancelar</a>
	</div>
</form>
