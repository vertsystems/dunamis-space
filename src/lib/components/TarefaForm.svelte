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
	{#if error}<div class="alert alert-danger">{error}</div>{/if}

	<div class="row g-3">
		<div class="col-md-8">
			<label class="form-label" for="titulo">Título *</label>
			<input id="titulo" class="form-control" name="titulo" required value={v('titulo')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="prioridade">Prioridade</label>
			<select class="form-select" id="prioridade" name="prioridade" value={tarefa?.prioridade ?? 'media'}>
				{#each PRIORIDADE as p (p.value)}<option value={p.value}>{p.label}</option>{/each}
			</select>
		</div>

		<div class="col-md-4">
			<label class="form-label" for="projeto_id">Projeto</label>
			<select class="form-select" id="projeto_id" name="projeto_id" value={tarefa?.projeto_id ?? ''}>
				<option value="">—</option>
				{#each projetos as p (p.id)}<option value={p.id}>{p.nome}</option>{/each}
			</select>
		</div>
		<div class="col-md-4">
			<label class="form-label" for="responsavel_id">Responsável</label>
			<select class="form-select" id="responsavel_id" name="responsavel_id" value={tarefa?.responsavel_id ?? ''}>
				<option value="">—</option>
				{#each colaboradores as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
			</select>
		</div>
		<div class="col-md-4">
			<label class="form-label" for="status">Status</label>
			<select class="form-select" id="status" name="status" value={tarefa?.status ?? 'backlog'}>
				{#each TAREFA_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</select>
		</div>

		<div class="col-md-4">
			<label class="form-label" for="prazo">Prazo</label>
			<input id="prazo" class="form-control" type="date" name="prazo" value={v('prazo')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="tempo_estimado">Tempo estimado (h)</label>
			<input id="tempo_estimado" class="form-control" type="number" step="0.5" name="tempo_estimado" value={v('tempo_estimado')} />
		</div>
		<div class="col-md-4">
			<label class="form-label" for="tempo_gasto">Tempo gasto (h)</label>
			<input id="tempo_gasto" class="form-control" type="number" step="0.5" name="tempo_gasto" value={v('tempo_gasto')} />
		</div>

		<div class="col-12">
			<label class="form-label" for="descricao">Descrição</label>
			<textarea id="descricao" class="form-control" name="descricao" rows="3">{v('descricao')}</textarea>
		</div>
	</div>

	<div class="d-flex gap-2 mt-3">
		<button class="btn btn-primary" type="submit" disabled={saving}>
			{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
		<a class="btn btn-light" href="/tarefas">Cancelar</a>
	</div>
</form>
