<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { TAREFA_STATUS, prioridadeTone, prioridadeLabel } from '$lib/tarefas';
	import { Badge, Button, Modal } from '$lib/components/ui';
	import TarefaForm from '$lib/components/TarefaForm.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { toast } from '$lib/toast.svelte';
	import { autoanimate } from '$lib/autoAnimate';

	let { data, form } = $props();
	// O form vem de actions de outras rotas (/tarefas/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);

	type Tarefa = (typeof data.tarefas)[number];
	let novoAberto = $state(false);
	let editando = $state<Tarefa | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Tarefa criada');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Tarefa salva');
		invalidateAll();
	}

	let cards = $state(data.tarefas.map((t) => ({ ...t })));
	$effect(() => {
		cards = data.tarefas.map((t) => ({ ...t }));
	});

	let dragId: string | null = $state(null);
	let overCol: string | null = $state(null);
	let confirmandoExcluir: string | null = $state(null);

	const byStatus = $derived((s: string) => cards.filter((c) => c.status === s));

	async function excluir(id: string) {
		const fd = new FormData();
		fd.set('id', id);
		try {
			const res = await fetch('?/excluir', {
				method: 'POST',
				body: fd,
				headers: { 'x-sveltekit-action': 'true' }
			});
			if (!res.ok) throw new Error();
			cards = cards.filter((c) => c.id !== id);
			confirmandoExcluir = null;
			toast.success('Tarefa excluída');
		} catch {
			toast.error('Não foi possível excluir a tarefa.');
		}
	}

	async function persist(id: string, status: string) {
		const anterior = data.tarefas.find((t) => t.id === id)?.status;
		const fd = new FormData();
		fd.set('id', id);
		fd.set('status', status);
		try {
			const res = await fetch('?/move', {
				method: 'POST',
				body: fd,
				headers: { 'x-sveltekit-action': 'true' }
			});
			if (!res.ok) throw new Error();
		} catch {
			const card = cards.find((c) => c.id === id);
			if (card && anterior !== undefined) card.status = anterior; // rollback otimista
			toast.error('Não foi possível mover a tarefa.');
		}
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

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-base font-semibold text-navy">Tarefas</h1>
		<p class="text-sm text-grey">Arraste os cartões entre as colunas para mudar o status.</p>
		{#if data.projetoNome}
			<div class="mt-2 flex items-center gap-2 text-sm">
				<Badge tone="neutral">Projeto: {data.projetoNome}</Badge>
				<a class="text-brand hover:underline" href="/tarefas">limpar</a>
			</div>
		{/if}
	</div>
	<Button onclick={() => (novoAberto = true)}>+ Nova tarefa</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
	{#each TAREFA_STATUS as col (col.value)}
		<div
			class="rounded-[var(--radius-lg)] bg-bg p-3 min-h-50 transition-colors {overCol === col.value ? 'outline-2 outline-dashed outline-brand bg-grey-200/40' : ''}"
			role="list"
			use:autoanimate
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
					class="bg-surface border border-grey-200 rounded-[var(--radius)] px-3 py-2.5 mb-2.5 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
					draggable="true"
					role="button"
					tabindex="0"
					ondragstart={() => (dragId = t.id)}
					onclick={() => (editando = t)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							editando = t;
						}
					}}
				>
					<div class="flex items-start justify-between gap-2">
						<span class="block font-medium text-navy">{t.titulo}</span>
						<div class="flex shrink-0 items-center gap-1.5">
							<a class="text-xs text-brand hover:underline" href={`/tarefas/${t.id}`} onclick={(e) => e.stopPropagation()}>Abrir</a>
							<button
								type="button"
								class="text-grey transition-colors hover:text-brand-danger"
								title="Excluir tarefa"
								aria-label="Excluir tarefa"
								onclick={(e) => {
									e.stopPropagation();
									confirmandoExcluir = t.id;
								}}
							>
								<Icon name="trash" size={13} />
							</button>
						</div>
					</div>
					{#if t.projeto?.nome}<div class="text-xs text-grey">{t.projeto.nome}</div>{/if}
					<div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
						<Badge tone={prioridadeTone(t.prioridade)}>{prioridadeLabel(t.prioridade)}</Badge>
						{#if t.responsavel?.nome}<span class="text-xs text-grey">{t.responsavel.nome}</span>{/if}
						{#if prazo}<span class="inline-flex items-center gap-1 text-xs text-grey"><Icon name="calendar" size={12} />{prazo}</span>{/if}
					</div>

					{#if confirmandoExcluir === t.id}
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<div
							class="mt-2 flex items-center justify-between gap-2 rounded-[var(--radius)] bg-brand-danger/10 px-2.5 py-1.5"
							onclick={(e) => e.stopPropagation()}
						>
							<span class="text-xs font-medium text-brand-danger">Excluir esta tarefa?</span>
							<div class="flex items-center gap-1.5">
								<button
									type="button"
									class="text-xs font-semibold text-brand-danger hover:underline"
									onclick={(e) => {
										e.stopPropagation();
										excluir(t.id);
									}}
								>
									Sim
								</button>
								<button
									type="button"
									class="text-xs font-medium text-slate hover:text-navy"
									onclick={(e) => {
										e.stopPropagation();
										confirmandoExcluir = null;
									}}
								>
									Não
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/each}
</div>

<Modal open={novoAberto} title="Nova tarefa" size="lg" onClose={() => (novoAberto = false)}>
	<TarefaForm
		action="/tarefas/novo"
		submitLabel="Criar tarefa"
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		tarefa={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar tarefa" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<TarefaForm
			action={`/tarefas/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			projetos={data.projetos}
			colaboradores={data.colaboradores}
			tarefa={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
