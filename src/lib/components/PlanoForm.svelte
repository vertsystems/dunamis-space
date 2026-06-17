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
	{#if error}<div class="notification is-danger is-light">{error}</div>{/if}

	<div class="columns is-multiline">
		<div class="column is-8">
			<div class="field">
				<label class="label" for="nome">Nome do plano *</label>
				<div class="control">
					<input id="nome" class="input" name="nome" required value={v('nome')} placeholder="Starter, Gold, Premium…" />
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="valor_mensal">Valor mensal (R$)</label>
				<div class="control">
					<input id="valor_mensal" class="input" type="number" step="0.01" name="valor_mensal" value={v('valor_mensal')} />
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="field">
				<label class="label" for="limite_posts">Limite de posts</label>
				<div class="control">
					<input id="limite_posts" class="input" type="number" name="limite_posts" value={v('limite_posts')} />
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="limite_stories">Limite de stories</label>
				<div class="control">
					<input id="limite_stories" class="input" type="number" name="limite_stories" value={v('limite_stories')} />
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="limite_reels">Limite de reels</label>
				<div class="control">
					<input id="limite_reels" class="input" type="number" name="limite_reels" value={v('limite_reels')} />
				</div>
			</div>
		</div>

		<div class="column is-12">
			<div class="field">
				<label class="label" for="descricao">Descrição</label>
				<div class="control">
					<textarea id="descricao" class="textarea" name="descricao" rows="2">{v('descricao')}</textarea>
				</div>
			</div>
		</div>

		<div class="column is-12">
			<label class="checkbox">
				<input type="checkbox" name="ativo" checked={plano ? !!plano.ativo : true} />
				Plano ativo (disponível para novos contratos)
			</label>
		</div>
	</div>

	<div class="field is-grouped mt-2">
		<div class="control">
			<button class="button is-primary" class:is-loading={saving} type="submit">{submitLabel}</button>
		</div>
		<div class="control"><a class="button is-light" href="/contratos/planos">Cancelar</a></div>
	</div>
</form>
