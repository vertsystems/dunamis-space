<script lang="ts">
	import { TAREFA_STATUS, prioridadeTone, prioridadeLabel } from '$lib/tarefas';
	import { Badge, Button } from '$lib/components/ui';

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

<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
	<div class="flex items-center gap-2 text-sm">
		{#if data.projetoNome}
			<Badge tone="neutral">Projeto: {data.projetoNome}</Badge>
			<a class="text-brand hover:underline" href="/tarefas">limpar</a>
		{:else}
			<span class="text-grey">Arraste os cartões entre as colunas para mudar o status.</span>
		{/if}
	</div>
	<Button onclick={() => location.assign('/tarefas/novo')}>+ Nova tarefa</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
	{#each TAREFA_STATUS as col (col.value)}
		<div
			class="rounded-[var(--radius-lg)] bg-bg p-3 min-h-50 transition-colors {overCol === col.value ? 'outline-2 outline-dashed outline-brand bg-grey-200/40' : ''}"
			role="list"
			ondragover={(e) => {
				e.preventDefault();
				overCol = col.value;
			}}
			ondragleave={() => (overCol === col.value ? (overCol = null) : null)}
			ondrop={() => onDrop(col.value)}
		>
			<div class="flex items-center justify-between font-semibold text-navy mb-3 px-1">
				<span>{col.label}</span>
				<span class="rounded-full bg-surface px-2 text-xs text-grey">{byStatus(col.value).length}</span>
			</div>

			{#each byStatus(col.value) as t (t.id)}
				{@const prazo = fmtData(t.prazo)}
				<div
					class="bg-surface border border-grey-200 rounded-[var(--radius)] px-3 py-2.5 mb-2.5 cursor-grab active:cursor-grabbing"
					draggable="true"
					role="listitem"
					ondragstart={() => (dragId = t.id)}
				>
					<a class="block font-medium text-navy hover:text-brand" href={`/tarefas/${t.id}`}>{t.titulo}</a>
					{#if t.projeto?.nome}<div class="text-xs text-grey">{t.projeto.nome}</div>{/if}
					<div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
						<Badge tone={prioridadeTone(t.prioridade)}>{prioridadeLabel(t.prioridade)}</Badge>
						{#if t.responsavel?.nome}<span class="text-xs text-grey">{t.responsavel.nome}</span>{/if}
						{#if prazo}<span class="text-xs text-grey">📅 {prazo}</span>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/each}
</div>
