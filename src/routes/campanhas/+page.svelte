<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Card, Button, EmptyState, DataTable, Modal } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import CampanhaForm from '$lib/components/CampanhaForm.svelte';
	import { toast } from '$lib/toast.svelte';

	let { data, form } = $props();
	// O form vem de actions de outras rotas (/campanhas/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);
	function fmt(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}

	type Campanha = (typeof data.campanhas)[number];
	const columns: ColumnDef<Campanha>[] = [
		{ id: 'campanha', accessorFn: (c) => c.nome ?? '', meta: { label: 'Campanha' } },
		{ id: 'cliente', accessorFn: (c) => c.cliente?.nome ?? '', meta: { label: 'Cliente' } },
		{ id: 'periodo', accessorFn: (c) => c.data_inicio ?? '', meta: { label: 'Período' } },
		{ id: 'acoes', accessorFn: () => '', meta: { label: '' } }
	];

	let novoAberto = $state(false);
	let editando = $state<Campanha | null>(null);
	let excluindo = $state<Campanha | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Campanha criada');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Campanha salva');
		invalidateAll();
	}
</script>

<div class="flex items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-xl font-bold text-navy">Campanhas</h1>
		<p class="text-sm text-grey">Campanhas e promoções por cliente.</p>
	</div>
	<Button onclick={() => (novoAberto = true)}>+ Nova campanha</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.campanhas} initialSort={[{ id: 'campanha', desc: false }]}>
		{#snippet row(r)}
			{@const c = r.original}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => (editando = c)}>
				<td class="px-4 py-3 font-medium text-navy">{c.nome}</td>
				<td class="px-4 py-3">{c.cliente?.nome ?? '—'}</td>
				<td class="px-4 py-3 whitespace-nowrap">{fmt(c.data_inicio)} → {fmt(c.data_fim)}</td>
				<td class="px-4 py-3 text-right">
					<div class="flex items-center justify-end gap-3">
						<a class="text-sm text-brand hover:underline" href={`/campanhas/${c.id}`} onclick={(e) => e.stopPropagation()}>Abrir</a>
						<button
							type="button"
							class="grid size-7 place-items-center rounded-[var(--radius)] text-grey transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
							title="Excluir campanha"
							aria-label={`Excluir campanha ${c.nome}`}
							onclick={(e) => {
								e.stopPropagation();
								excluindo = c;
							}}
						>
							<Icon name="trash" size={16} />
						</button>
					</div>
				</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="4" class="px-2"><EmptyState icon="tag" title="Nenhuma campanha ainda" description="Crie campanhas e promoções." /></td></tr>
		{/snippet}
	</DataTable>
</Card>

<Modal open={novoAberto} title="Nova campanha" size="lg" onClose={() => (novoAberto = false)}>
	<CampanhaForm
		action="/campanhas/novo"
		submitLabel="Criar campanha"
		clientes={data.clientes}
		campanha={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar campanha" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<CampanhaForm
			action={`/campanhas/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			clientes={data.clientes}
			campanha={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
			onDelete={() => (excluindo = editando)}
		/>
	{/if}
</Modal>

<Modal open={!!excluindo} title="Excluir campanha" size="sm" onClose={() => (excluindo = null)}>
	{#if excluindo}
		<p class="mb-4 text-sm text-slate">
			Excluir a campanha <strong class="text-navy">{excluindo.nome}</strong>? Esta ação não pode ser
			desfeita.
		</p>
		<form
			method="POST"
			action={`/campanhas/${excluindo.id}?/delete`}
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'redirect' || result.type === 'success') {
						excluindo = null;
						editando = null;
						toast.success('Campanha excluída');
						invalidateAll();
					} else {
						toast.error('Não foi possível excluir a campanha');
					}
				};
			}}
		>
			<div class="flex justify-end gap-2">
				<Button type="button" variant="secondary" onclick={() => (excluindo = null)}>Cancelar</Button>
				<Button type="submit" variant="danger">Sim, excluir</Button>
			</div>
		</form>
	{/if}
</Modal>
