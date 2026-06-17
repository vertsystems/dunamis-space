<script lang="ts">
	import { TAREFA_STATUS, prioridadeStyle, prioridadeLabel } from '$lib/tarefas';

	let { data } = $props();

	let cards = $state(data.tarefas.map((t) => ({ ...t })));
	$effect(() => {
		cards = data.tarefas.map((t) => ({ ...t }));
	});

	let dragId: string | null = $state(null);
	let overCol: string | null = $state(null);

	const byStatus = $derived((s: string) => cards.filter((c) => c.status === s));

	async function persist(id: string, status: string) {
		const fd = new FormData();
		fd.set('id', id);
		fd.set('status', status);
		await fetch('?/move', { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
	}

	function onDrop(status: string) {
		overCol = null;
		const card = cards.find((c) => c.id === dragId);
		if (card && card.status !== status) {
			card.status = status;
			persist(card.id, status);
		}
		dragId = null;
	}

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : null;
	}
</script>

<div class="level mb-4">
	<div class="level-left">
		<div class="level-item">
			{#if data.projetoNome}
				<span class="tag is-light">Projeto: {data.projetoNome}</span>
				<a class="ml-2" href="/tarefas">limpar</a>
			{:else}
				<span class="has-text-grey">Arraste os cartões entre as colunas para mudar o status.</span>
			{/if}
		</div>
	</div>
	<div class="level-right">
		<a class="button is-primary" href="/tarefas/novo">+ Nova tarefa</a>
	</div>
</div>

{#if data.loadError}<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>{/if}

<div class="kanban">
	{#each TAREFA_STATUS as col (col.value)}
		<div
			class="kanban-col"
			class:is-over={overCol === col.value}
			role="list"
			ondragover={(e) => {
				e.preventDefault();
				overCol = col.value;
			}}
			ondragleave={() => (overCol === col.value ? (overCol = null) : null)}
			ondrop={() => onDrop(col.value)}
		>
			<div class="kanban-col-head">
				<span>{col.label}</span>
				<span class="count">{byStatus(col.value).length}</span>
			</div>

			{#each byStatus(col.value) as t (t.id)}
				{@const pr = prioridadeStyle(t.prioridade)}
				{@const prazo = fmtData(t.prazo)}
				<div
					class="kanban-card"
					draggable="true"
					role="listitem"
					ondragstart={() => (dragId = t.id)}
				>
					<a class="card-title" href={`/tarefas/${t.id}`}>{t.titulo}</a>
					{#if t.projeto?.nome}<div class="card-meta">{t.projeto.nome}</div>{/if}
					<div class="card-tags">
						<span class="tag is-small" style={`background:${pr.bg};color:${pr.fg};font-weight:500;`}>
							{prioridadeLabel(t.prioridade)}
						</span>
						{#if t.responsavel?.nome}<span class="card-meta">{t.responsavel.nome}</span>{/if}
						{#if prazo}<span class="card-meta">📅 {prazo}</span>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.kanban {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		align-items: start;
	}
	.kanban-col {
		background: #ececec;
		border-radius: 12px;
		padding: 0.75rem;
		min-height: 200px;
	}
	.kanban-col.is-over {
		outline: 2px dashed var(--ds-orange, #ff6f00);
		background: #e3e3e3;
	}
	.kanban-col-head {
		display: flex;
		justify-content: space-between;
		font-weight: 600;
		color: #333;
		margin-bottom: 0.6rem;
		padding: 0 0.25rem;
	}
	.kanban-col-head .count {
		background: #fff;
		border-radius: 999px;
		padding: 0 0.5rem;
		font-size: 0.8rem;
		color: #777;
	}
	.kanban-card {
		background: #fff;
		border: 1px solid #d9d9d9;
		border-radius: 10px;
		padding: 0.6rem 0.7rem;
		margin-bottom: 0.6rem;
		cursor: grab;
	}
	.kanban-card:active {
		cursor: grabbing;
	}
	.card-title {
		font-weight: 500;
		color: #333;
		display: block;
	}
	.card-meta {
		color: #888;
		font-size: 0.8rem;
	}
	.card-tags {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.4rem;
		flex-wrap: wrap;
	}
</style>
