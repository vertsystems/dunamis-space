<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Card, Badge, Button, Input, EmptyState, DataTable, Modal } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	import KbForm from '$lib/components/KbForm.svelte';
	import { toast } from '$lib/toast.svelte';

	let { data, form } = $props();
	// O form vem de actions de outras rotas (/base-conhecimento/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);
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
		{ id: 'tags', accessorFn: (a) => (a.tags ?? []).join(', '), meta: { label: 'Tags' } },
		{ id: 'acoes', accessorFn: () => '', meta: { label: '' } }
	];

	let novoAberto = $state(false);
	let editando = $state<Artigo | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Artigo criado');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Artigo salvo');
		invalidateAll();
	}
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
	<Button onclick={() => (novoAberto = true)}>+ Novo artigo</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.artigos} initialSort={[{ id: 'titulo', desc: false }]}>
		{#snippet row(r)}
			{@const a = r.original}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => (editando = a)}>
				<td class="px-4 py-3 font-medium text-navy">{a.titulo}</td>
				<td class="px-4 py-3">{a.categoria ?? '—'}</td>
				<td class="px-4 py-3">{a.cliente?.nome ?? 'Geral'}</td>
				<td class="px-4 py-3">
					<div class="flex flex-wrap gap-1">
						{#each a.tags ?? [] as t (t)}<Badge tone="neutral">{t}</Badge>{/each}
					</div>
				</td>
				<td class="px-4 py-3 text-right">
					<a class="text-sm text-brand hover:underline" href={`/base-conhecimento/${a.id}`} onclick={(e) => e.stopPropagation()}>Abrir</a>
				</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="5" class="px-2"><EmptyState icon="book" title="Base de conhecimento vazia" description="Documente processos e padrões da agência aqui." /></td></tr>
		{/snippet}
	</DataTable>
</Card>

<Modal open={novoAberto} title="Novo artigo" size="lg" onClose={() => (novoAberto = false)}>
	<KbForm
		action="/base-conhecimento/novo"
		submitLabel="Criar artigo"
		clientes={data.clientes}
		artigo={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar artigo" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<KbForm
			action={`/base-conhecimento/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			clientes={data.clientes}
			artigo={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
