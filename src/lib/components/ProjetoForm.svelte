<script lang="ts">
	import { enhance } from '$app/forms';
	import { PROJETO_TIPO, PROJETO_STATUS } from '$lib/projetos';

	let {
		projeto = null,
		clientes = [],
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		projeto?: Record<string, any> | null;
		clientes?: { id: string; nome: string }[];
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => projeto?.[k] ?? '';
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
				<label class="label" for="nome">Nome do projeto *</label>
				<div class="control"><input id="nome" class="input" name="nome" required value={v('nome')} /></div>
			</div>
		</div>
		<div class="column is-6">
			<div class="field">
				<label class="label" for="cliente_id">Cliente *</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="cliente_id" name="cliente_id" required value={projeto?.cliente_id ?? ''}>
							<option value="" disabled>Selecione um cliente</option>
							{#each clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="field">
				<label class="label" for="tipo">Tipo</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="tipo" name="tipo" value={projeto?.tipo ?? 'social_media'}>
							{#each PROJETO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="status">Status</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="status" name="status" value={projeto?.status ?? 'em_andamento'}>
							{#each PROJETO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
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
						<select id="responsavel_id" name="responsavel_id" value={projeto?.responsavel_id ?? ''}>
							<option value="">—</option>
							{#each colaboradores as col (col.id)}<option value={col.id}>{col.nome}</option>{/each}
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
				<label class="label" for="prazo">Prazo</label>
				<div class="control"><input id="prazo" class="input" type="date" name="prazo" value={v('prazo')} /></div>
			</div>
		</div>
		<div class="column is-3">
			<div class="field">
				<label class="label" for="valor">Valor (R$, se pontual)</label>
				<div class="control"><input id="valor" class="input" type="number" step="0.01" name="valor" value={v('valor')} /></div>
			</div>
		</div>
		<div class="column is-3">
			<label class="label">&nbsp;</label>
			<label class="checkbox">
				<input type="checkbox" name="recorrente" checked={!!projeto?.recorrente} /> Recorrente
			</label>
		</div>

		<div class="column is-12">
			<div class="field">
				<label class="label" for="descricao">Descrição</label>
				<div class="control"><textarea id="descricao" class="textarea" name="descricao" rows="3">{v('descricao')}</textarea></div>
			</div>
		</div>
	</div>

	<div class="field is-grouped mt-2">
		<div class="control"><button class="button is-primary" class:is-loading={saving} type="submit">{submitLabel}</button></div>
		<div class="control"><a class="button is-light" href="/projetos">Cancelar</a></div>
	</div>
</form>
