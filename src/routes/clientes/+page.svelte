<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { formatBRL } from '$lib/clientes';
	import { Button, Input, Modal } from '$lib/components/ui';
	import ClienteForm from '$lib/components/ClienteForm.svelte';
	import { toast } from '$lib/toast.svelte';
	import { autoanimate } from '$lib/autoAnimate';

	let { data, form } = $props();
	// O form vem de actions de outras rotas (/clientes/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);

	type Cliente = (typeof data.clientes)[number];
	let novoAberto = $state(false);
	let editando = $state<Cliente | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Cliente criado');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Cliente salvo');
		invalidateAll();
	}

	// Colunas do quadro (rótulos a pedido: "Ativo" aparece como "Fixos").
	const COLUNAS = [
		{ status: 'lead', label: 'Leads', dot: 'bg-brand-amber' },
		{ status: 'ativo', label: 'Fixos', dot: 'bg-brand-green' },
		{ status: 'pausado', label: 'Pausados', dot: 'bg-grey' },
		{ status: 'cancelado', label: 'Cancelados', dot: 'bg-brand-danger' }
	] as const;

	let q = $state(data.q);
	// Re-sincroniza o campo com a URL (ex.: back/forward do navegador).
	$effect(() => {
		q = data.q;
	});

	// Cópia local reativa (re-sincroniza quando o servidor devolve dados novos).
	let cards = $state(data.clientes.map((c) => ({ ...c })));
	$effect(() => {
		cards = data.clientes.map((c) => ({ ...c }));
	});

	let dragId: string | null = $state(null);
	let overCol: string | null = $state(null);

	const daColuna = $derived((status: string) => cards.filter((c) => c.status === status));
	const mrrDaColuna = $derived((status: string) =>
		daColuna(status).reduce((s, c) => s + Number(c.mrr ?? 0), 0)
	);

	async function persist(id: string, status: string, prev: string, card: { status: string }) {
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
			// Reverte o card (proxy reativo → volta de coluna e recalcula o MRR).
			card.status = prev;
			toast.error('Não foi possível mover o cliente.');
		}
	}

	function onDrop(status: string) {
		overCol = null;
		const card = cards.find((c) => c.id === dragId);
		if (card && card.status !== status) {
			const prev = card.status;
			card.status = status; // otimista
			persist(card.id, status, prev, card);
		}
		dragId = null;
	}
</script>

<div class="mb-4">
	<h1 class="text-xl font-bold text-navy">Clientes</h1>
	<p class="text-sm text-grey">Pipeline de clientes por status — arraste os cartões entre as colunas.</p>
</div>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<form class="flex items-end gap-2" method="GET">
		<Input type="search" name="q" placeholder="Buscar por nome" bind:value={q} wrapperClass="w-56" />
		<Button variant="secondary" type="submit">Buscar</Button>
	</form>
	<Button onclick={() => (novoAberto = true)}>+ Novo cliente</Button>
</div>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
		Erro ao carregar: {data.loadError}
	</div>
{/if}

<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
	{#each COLUNAS as col (col.status)}
		{@const lista = daColuna(col.status)}
		{@const mrr = mrrDaColuna(col.status)}
		<div
			class="rounded-[var(--radius-lg)] bg-bg p-3 min-h-50 transition-colors {overCol === col.status
				? 'outline-2 outline-dashed outline-brand bg-grey-200/40'
				: ''}"
			role="list"
			use:autoanimate
			ondragover={(e) => {
				e.preventDefault();
				overCol = col.status;
			}}
			ondragleave={() => (overCol === col.status ? (overCol = null) : null)}
			ondrop={() => onDrop(col.status)}
		>
			<div class="flex items-center justify-between gap-2 mb-3 px-1">
				<div class="flex items-center gap-2 font-semibold text-navy">
					<span class="size-2.5 rounded-full {col.dot}"></span>
					{col.label}
				</div>
				<span class="rounded-full bg-surface px-2 text-xs text-grey">{lista.length}</span>
			</div>
			{#if mrr > 0}
				<div class="px-1 mb-2 text-xs text-grey">{formatBRL(mrr)}/mês</div>
			{/if}

			{#each lista as c (c.id)}
				<div
					class="bg-surface border border-grey-200 rounded-[var(--radius)] px-3 py-2.5 mb-2.5 cursor-grab active:cursor-grabbing hover:border-grey"
					draggable="true"
					role="listitem"
					ondragstart={() => (dragId = c.id)}
					onclick={() => (editando = c)}
				>
					<div class="font-medium text-navy">{c.nome}</div>
					{#if c.contato_email}<div class="text-xs text-grey truncate">{c.contato_email}</div>{/if}
					<div class="flex items-center justify-between gap-2 mt-1.5">
						<span class="text-xs text-grey truncate">
							{c.segmento ?? '—'}{c.responsavel_nome ? ` · ${c.responsavel_nome}` : ''}
						</span>
						{#if Number(c.mrr ?? 0) > 0}
							<span class="text-xs font-medium text-navy tabular-nums whitespace-nowrap">{formatBRL(c.mrr)}</span>
						{/if}
					</div>
					<a
						class="mt-1.5 inline-block text-xs text-brand hover:underline"
						href={`/clientes/${c.id}`}
						onclick={(e) => e.stopPropagation()}
					>
						Abrir
					</a>
				</div>
			{:else}
				<p class="px-1 py-2 text-sm text-grey">Nenhum cliente.</p>
			{/each}
		</div>
	{/each}
</div>

<Modal open={novoAberto} title="Novo cliente" size="lg" onClose={() => (novoAberto = false)}>
	<ClienteForm
		action="/clientes/novo"
		submitLabel="Criar cliente"
		colaboradores={data.colaboradores}
		cliente={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar cliente" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<ClienteForm
			action={`/clientes/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			colaboradores={data.colaboradores}
			cliente={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
