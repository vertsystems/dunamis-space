<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		plano = null,
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		plano?: Record<string, any> | null;
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => plano?.[k] ?? '';
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
		<div class="col-md-8">
			<label class="form-label" for="nome">Nome do plano *</label>
			<input id="nome" class="form-control" name="nome" required value={v('nome')} placeholder="Starter, Gold, Premium…" />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="valor_mensal">Valor mensal (R$)</label>
			<input id="valor_mensal" class="form-control" type="number" step="0.01" name="valor_mensal" value={v('valor_mensal')} />
		</div>

		<div class="col-md-4">
			<label class="form-label" for="limite_posts">Limite de posts</label>
			<input id="limite_posts" class="form-control" type="number" name="limite_posts" value={v('limite_posts')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="limite_stories">Limite de stories</label>
			<input id="limite_stories" class="form-control" type="number" name="limite_stories" value={v('limite_stories')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="limite_reels">Limite de reels</label>
			<input id="limite_reels" class="form-control" type="number" name="limite_reels" value={v('limite_reels')} />
		</div>

		<div class="col-12">
			<label class="form-label" for="descricao">Descrição</label>
			<textarea id="descricao" class="form-control" name="descricao" rows="2">{v('descricao')}</textarea>
		</div>

		<div class="col-12">
			<div class="form-check">
				<input class="form-check-input" type="checkbox" id="ativo" name="ativo" checked={plano ? !!plano.ativo : true} />
				<label class="form-check-label" for="ativo">Plano ativo (disponível para novos contratos)</label>
			</div>
		</div>
	</div>

	<div class="d-flex gap-2 mt-3">
		<button class="btn btn-primary" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
		<a class="btn btn-light" href="/contratos/planos">Cancelar</a>
	</div>
</form>
