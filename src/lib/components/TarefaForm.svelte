<script lang="ts">
	import { enhance } from '$app/forms';
	import { TAREFA_STATUS, PRIORIDADE } from '$lib/tarefas';

	let {
		tarefa = null,
		projetos = [],
		colaboradores = [],
		error = null,
		submitLabel = 'Salvar',
		action = ''
	}: {
		tarefa?: Record<string, any> | null;
		projetos?: { id: string; nome: string }[];
		colaboradores?: { id: string; nome: string }[];
		error?: string | null;
		submitLabel?: string;
		action?: string;
	} = $props();

	let saving = $state(false);
	const v = (k: string) => tarefa?.[k] ?? '';
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
				<label class="label" for="titulo">Título *</label>
				<div class="control"><input id="titulo" class="input" name="titulo" required value={v('titulo')} /></div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="prioridade">Prioridade</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="prioridade" name="prioridade" value={tarefa?.prioridade ?? 'media'}>
							{#each PRIORIDADE as p (p.value)}<option value={p.value}>{p.label}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="field">
				<label class="label" for="projeto_id">Projeto</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select id="projeto_id" name="projeto_id" value={tarefa?.projeto_id ?? ''}>
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
						<select id="responsavel_id" name="responsavel_id" value={tarefa?.responsavel_id ?? ''}>
							<option value="">—</option>
							{#each colaboradores as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
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
						<select id="status" name="status" value={tarefa?.status ?? 'backlog'}>
							{#each TAREFA_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="field">
				<label class="label" for="prazo">Prazo</label>
				<div class="control"><input id="prazo" class="input" type="date" name="prazo" value={v('prazo')} /></div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="tempo_estimado">Tempo estimado (h)</label>
				<div class="control"><input id="tempo_estimado" class="input" type="number" step="0.5" name="tempo_estimado" value={v('tempo_estimado')} /></div>
			</div>
		</div>
		<div class="column is-4">
			<div class="field">
				<label class="label" for="tempo_gasto">Tempo gasto (h)</label>
				<div class="control"><input id="tempo_gasto" class="input" type="number" step="0.5" name="tempo_gasto" value={v('tempo_gasto')} /></div>
			</div>
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
		<div class="control"><a class="button is-light" href="/tarefas">Cancelar</a></div>
	</div>
</form>
