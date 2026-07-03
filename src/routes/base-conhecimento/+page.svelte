<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, Badge, Button, Input, EmptyState, DataTable } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	let { data } = $props();
	let q = $state(data.q);
	// Re-sincroniza o campo com a URL (ex.: back/forward do navegador).
	$effect(() => {
		q = data.q;
	});

	type Artigo = (typeof data.artigos)[number];
	const columns: ColumnDef<Artigo>[] = [
		{ id: 'titulo', accessorFn: (a) => a.titulo ?? '', meta: { label: 'Título' } },
		{ id: 'categoria', accessorFn: (a) => a.categoria ?? '', meta: { label: 'Categoria' } },
		{ id: 'cliente', accessorFn: (a) => a.cliente?.nome ?? 'Geral', meta: { label: 'Cliente' } },
		{ id: 'tags', accessorFn: (a) => (a.tags ?? []).join(', '), meta: { label: 'Tags' } }
	];
</script>

<div class="mb-4">
	<h1 class="text-xl font-bold text-navy">Base de Conhecimento</h1>
	<p class="text-sm text-grey">Processos e padrões da agência.</p>
</div>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<form class="flex items-end gap-2" method="GET">
		<Input type="search" name="q" placeholder="Buscar por título" bind:value={q} wrapperClass="w-64" />
		<Button variant="secondary" type="submit">Buscar</Button>
	</form>
	<Button onclick={() => goto('/base-conhecimento/novo')}>+ Novo artigo</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.artigos} initialSort={[{ id: 'titulo', desc: false }]}>
		{#snippet row(r)}
			{@const a = r.original}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/base-conhecimento/${a.id}`)}>
				<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/base-conhecimento/${a.id}`}>{a.titulo}</a></td>
				<td class="px-4 py-3">{a.categoria ?? '—'}</td>
				<td class="px-4 py-3">{a.cliente?.nome ?? 'Geral'}</td>
				<td class="px-4 py-3">
					<div class="flex flex-wrap gap-1">
						{#each a.tags ?? [] as t (t)}<Badge tone="neutral">{t}</Badge>{/each}
					</div>
				</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="4" class="px-2"><EmptyState icon="book" title="Base de conhecimento vazia" description="Documente processos e padrões da agência aqui." /></td></tr>
		{/snippet}
	</DataTable>
</Card>
