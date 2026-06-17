<script lang="ts">
	import { enhance } from '$app/forms';
	import { CONTEUDO_TIPO, CONTEUDO_STATUS } from '$lib/conteudo';

	let {
		conteudo = null,
		clientes = [],
		projetos = [],
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		conteudo?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		projetos?: { id: string; nome: string }[];
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => conteudo?.[k] ?? '';
	const dataPub = conteudo?.data_publicacao ? String(conteudo.data_publicacao).slice(0, 16) : '';
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
						<select id="cliente_id" name="cliente_id" required value={conteudo?.cliente_id ?? ''}>
							<option value="" disabled>Selecione um cliente</option>
							{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-3">
			<div class="field">
				<label class="label" for="tipo">Tipo</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="tipo" name="tipo" value={conteudo?.tipo ?? 'feed'}>
							{#each CONTEUDO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-3">
			<div class="field">
				<label class="label" for="status">Status</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="status" name="status" value={conteudo?.status ?? 'rascunho'}>
							{#each CONTEUDO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>

		<div class="column is-6">
			<div class="field">
				<label class="label" for="titulo">Título</label>
				<div class="control"><input id="titulo" class="input" name="titulo" value={v('titulo')} /></div>
			</div>
		</div>
		<div class="column is-6">
			<div class="field">
				<label class="label" for="data_publicacao">Data de publicação</label>
				<div class="control"><input id="data_publicacao" class="input" type="datetime-local" name="data_publicacao" value={dataPub} /></div>
			</div>
		</div>

		<div class="column is-4">
			<div class="field">
				<label class="label" for="projeto_id">Projeto</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="projeto_id" name="projeto_id" value={conteudo?.projeto_id ?? ''}>
							<option value="">—</option>
							{#each projetos as p (p.id)}<option value={p.id}>{p.nome}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="responsavel_id">Responsável</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="responsavel_id" name="responsavel_id" value={conteudo?.responsavel_id ?? ''}>
							<option value="">—</option>
							{#each colaboradores as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="arte_url">URL da arte</label>
				<div class="control"><input id="arte_url" class="input" name="arte_url" value={v('arte_url')} placeholder="link do Drive/imagem" /></div>
			</div>
		</div>

		<div class="column is-12">
			<div class="field">
				<label class="label" for="legenda">Legenda</label>
				<div class="control"><textarea id="legenda" class="textarea" name="legenda" rows="4">{v('legenda')}</textarea></div>
			</div>
		</div>

		<div class="column is-12">
			<label class="checkbox">
				<input type="checkbox" name="publicado_manual" checked={!!conteudo?.publicado_manual} />
				Postado manualmente
			</label>
		</div>
	</div>

	<div class="field is-grouped mt-2">
		<div class="control"><button class="button is-primary" class:is-loading={saving} type="submit">{submitLabel}</button></div>
		<div class="control"><a class="button is-light" href="/conteudo">Cancelar</a></div>
	</div>
</form>
