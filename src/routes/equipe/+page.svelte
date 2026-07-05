<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { funcaoLabel } from '$lib/equipe';
	import { formatBRL } from '$lib/clientes';
	import { Card, Badge, Button, EmptyState, DataTable, Modal } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	import ColaboradorForm from '$lib/components/ColaboradorForm.svelte';
	import { toast } from '$lib/toast.svelte';

	let { data, form } = $props();
	// O form vem de actions de outras rotas (/equipe/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);

	type Colaborador = (typeof data.colaboradores)[number];
	const columns: ColumnDef<Colaborador>[] = [
		{ id: 'nome', accessorFn: (c) => c.nome ?? '', meta: { label: 'Nome' } },
		{ id: 'email', accessorFn: (c) => c.email ?? '', meta: { label: 'E-mail' } },
		{ id: 'funcao', accessorFn: (c) => funcaoLabel(c.funcao), meta: { label: 'Função' } },
		{ id: 'custo_hora', accessorFn: (c) => c.custo_hora ?? 0, meta: { label: 'Custo/hora', thClass: 'text-right' } },
		{ id: 'status', accessorFn: (c) => (c.ativo ? 'Ativo' : 'Inativo'), meta: { label: 'Status' } },
		{ id: 'acoes', accessorFn: () => '', meta: { label: '' } }
	];

	let novoAberto = $state(false);
	let editando = $state<Colaborador | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Colaborador criado');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Colaborador salvo');
		invalidateAll();
	}
</script>

<div class="flex items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-base font-semibold text-navy">Equipe</h1>
		<p class="text-sm text-grey">Time da agência e custos por hora.</p>
	</div>
	<Button onclick={() => (novoAberto = true)}>+ Novo colaborador</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.colaboradores} initialSort={[{ id: 'nome', desc: false }]}>
		{#snippet row(r)}
			{@const c = r.original}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => (editando = c)}>
				<td class="px-4 py-3 font-medium text-navy">{c.nome}</td>
				<td class="px-4 py-3">{c.email}</td>
				<td class="px-4 py-3">{funcaoLabel(c.funcao)}</td>
				<td class="px-4 py-3 text-right tabular-nums">{c.custo_hora != null ? formatBRL(c.custo_hora) : '—'}</td>
				<td class="px-4 py-3"><Badge tone={c.ativo ? 'success' : 'neutral'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
				<td class="px-4 py-3 text-right">
					<a class="text-sm text-brand hover:underline" href={`/equipe/${c.id}`} onclick={(e) => e.stopPropagation()}>Abrir</a>
				</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="6" class="px-2"><EmptyState icon="users" title="Nenhum colaborador ainda" description="Cadastre o time da agência." /></td></tr>
		{/snippet}
	</DataTable>
</Card>

<Modal open={novoAberto} title="Novo colaborador" size="lg" onClose={() => (novoAberto = false)}>
	<ColaboradorForm
		action="/equipe/novo"
		submitLabel="Criar colaborador"
		colaborador={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar colaborador" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<ColaboradorForm
			action={`/equipe/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			colaborador={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
