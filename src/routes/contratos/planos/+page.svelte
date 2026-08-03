<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { valorBRL } from '$lib/valores';
	import { Card, Badge, Button, Breadcrumb, EmptyState, DataTable, Modal } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	import PlanoForm from '$lib/components/PlanoForm.svelte';
	import { toast } from '$lib/toast.svelte';
	import { page } from '$app/state';
	import { podeEditar } from '$lib/permissoes';

	let { data, form } = $props();
	const perms = $derived(page.data.permissoes);
	// O form vem de actions de outras rotas (/contratos/planos/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);
	const lim = (n: number | null) => (n == null ? '—' : n);

	type Plano = (typeof data.planos)[number];
	const columns: ColumnDef<Plano>[] = [
		{ id: 'nome', accessorFn: (p) => p.nome ?? '', meta: { label: 'Plano' } },
		{ id: 'valor', accessorFn: (p) => p.valor_mensal ?? 0, meta: { label: 'Valor mensal', thClass: 'text-right' } },
		{ id: 'posts', accessorFn: (p) => p.limite_posts ?? 0, meta: { label: 'Posts', thClass: 'text-center' } },
		{ id: 'stories', accessorFn: (p) => p.limite_stories ?? 0, meta: { label: 'Stories', thClass: 'text-center' } },
		{ id: 'reels', accessorFn: (p) => p.limite_reels ?? 0, meta: { label: 'Reels', thClass: 'text-center' } },
		{ id: 'status', accessorFn: (p) => (p.ativo ? 1 : 0), meta: { label: 'Status' } },
		{ id: 'acoes', accessorFn: () => '', meta: { label: '' } }
	];

	let novoAberto = $state(false);
	let editando = $state<Plano | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Plano criado');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Plano salvo');
		invalidateAll();
	}
</script>

<Breadcrumb items={[{ label: 'Contratos', href: '/contratos' }, { label: 'Planos' }]} />

<div class="flex items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-base font-semibold text-navy">Planos</h1>
		<p class="text-sm text-grey">Planos de serviço oferecidos aos clientes.</p>
	</div>
	{#if podeEditar(perms, 'contratos')}<Button onclick={() => (novoAberto = true)}>+ Novo plano</Button>{/if}
</div>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.planos} initialSort={[{ id: 'nome', desc: false }]}>
		{#snippet row(r)}
			{@const p = r.original}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => podeEditar(perms, 'contratos') && (editando = p)}>
				<td class="px-4 py-3 font-medium text-navy">{p.nome}</td>
				<td class="px-4 py-3 text-right tabular-nums">{valorBRL(p.valor_mensal, data.podeValores)}</td>
				<td class="px-4 py-3 text-center">{lim(p.limite_posts)}</td>
				<td class="px-4 py-3 text-center">{lim(p.limite_stories)}</td>
				<td class="px-4 py-3 text-center">{lim(p.limite_reels)}</td>
				<td class="px-4 py-3">
					<Badge tone={p.ativo ? 'success' : 'neutral'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
				</td>
				<td class="px-4 py-3 text-right">
					<a class="text-sm text-brand hover:underline" href={`/contratos/planos/${p.id}`} onclick={(e) => e.stopPropagation()}>Abrir</a>
				</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="7" class="px-2"><EmptyState icon="tag" title="Nenhum plano ainda" description="Crie os planos oferecidos pela agência." /></td></tr>
		{/snippet}
	</DataTable>
</Card>

<Modal open={novoAberto} title="Novo plano" size="lg" onClose={() => (novoAberto = false)}>
	<PlanoForm
		action="/contratos/planos/novo"
		submitLabel="Criar plano"
		plano={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar plano" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<PlanoForm
			action={`/contratos/planos/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			plano={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
