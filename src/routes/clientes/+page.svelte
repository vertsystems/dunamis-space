<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatBRL } from '$lib/clientes';
	import { Button, Input } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';

	let { data } = $props();

	// Colunas do quadro (rótulos a pedido: "Ativo" aparece como "Fixos").
	const COLUNAS = [
		{ status: 'lead', label: 'Leads', dot: 'bg-brand-amber' },
		{ status: 'ativo', label: 'Fixos', dot: 'bg-brand-green' },
		{ status: 'pausado', label: 'Pausados', dot: 'bg-grey' },
		{ status: 'cancelado', label: 'Cancelados', dot: 'bg-brand-danger' }
	] as const;

	let q = $state(data.q);

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

	async function persist(id: string, status: string) {
		const fd = new FormData();
		fd.set('id', id);
		fd.set('status', status);
		const res = await fetch('?/move', {
			method: 'POST',
			body: fd,
			headers: { 'x-sveltekit-action': 'true' }
		});
		if (!res.ok) toast.error('Não foi possível mover o cliente.');
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
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<form class="flex items-end gap-2" method="GET">
		<Input type="search" name="q" placeholder="Buscar por nome" bind:value={q} wrapperClass="w-56" />
		<Button variant="secondary" type="submit">Buscar</Button>
	</form>
	<Button onclick={() => goto('/clientes/novo')}>+ Novo cliente</Button>
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
				>
					<a class="font-medium text-navy hover:text-brand" href={`/clientes/${c.id}`}>{c.nome}</a>
					{#if c.contato_email}<div class="text-xs text-grey truncate">{c.contato_email}</div>{/if}
					<div class="flex items-center justify-between gap-2 mt-1.5">
						<span class="text-xs text-grey truncate">
							{c.segmento ?? '—'}{c.responsavel_nome ? ` · ${c.responsavel_nome}` : ''}
						</span>
						{#if Number(c.mrr ?? 0) > 0}
							<span class="text-xs font-medium text-navy tabular-nums whitespace-nowrap">{formatBRL(c.mrr)}</span>
						{/if}
					</div>
				</div>
			{:else}
				<p class="px-1 py-2 text-sm text-grey">Nenhum cliente.</p>
			{/each}
		</div>
	{/each}
</div>
