<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { podeEditar } from '$lib/permissoes';
	import { valorBRL } from '$lib/valores';
	import { Button, Card, Input, EmptyState, DataTable, Modal } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	import ClienteForm from '$lib/components/ClienteForm.svelte';
	import { toast } from '$lib/toast.svelte';

	let { data, form } = $props();
	const perms = $derived(page.data.permissoes);
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

	const columns: ColumnDef<Cliente>[] = [
		{ id: 'nome', accessorFn: (c) => c.nome ?? '', meta: { label: 'Nome' } },
		{ id: 'cnpj_cpf', accessorFn: (c) => c.cnpj_cpf ?? '', meta: { label: 'CNPJ/CPF' } },
		{ id: 'cidade', accessorFn: (c) => c.cidade ?? '', meta: { label: 'Cidade/UF' } },
		{ id: 'plano', accessorFn: (c) => c.plano_ref ?? '', meta: { label: 'Plano' } },
		{ id: 'mrr', accessorFn: (c) => c.mrr ?? 0, meta: { label: 'Valor ref.', thClass: 'text-right' } },
		{
			id: 'dia_vencimento',
			accessorFn: (c) => c.dia_vencimento ?? 0,
			meta: { label: 'Venc.', thClass: 'text-right' }
		},
		{ id: 'acoes', accessorFn: () => '', meta: { label: '' } }
	];

	let q = $state(data.q);
	// Re-sincroniza o campo com a URL (ex.: back/forward do navegador).
	$effect(() => {
		q = data.q;
	});
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-base font-semibold text-navy">Clientes</h1>
		<p class="text-sm text-grey">Ficha cadastral e dados de referência dos clientes</p>
	</div>
	<div class="flex flex-wrap items-end gap-2">
		<form class="flex items-end gap-2" method="GET">
			<Input
				type="search"
				name="q"
				placeholder="Buscar por nome"
				aria-label="Buscar cliente por nome"
				bind:value={q}
				wrapperClass="w-56"
			/>
			<Button variant="secondary" type="submit">Buscar</Button>
		</form>
		{#if podeEditar(perms, 'clientes')}
			<Button onclick={() => (novoAberto = true)}>+ Novo cliente</Button>
		{/if}
	</div>
</div>

{#if data.pendente}
	<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
		Módulo ainda não ativado. Aplique a migration
		<code class="font-mono">supabase/migrations/0006_administrativo.sql</code> no SQL Editor do Supabase.
	</div>
{:else}
	{#if data.loadError}
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			Erro ao carregar: {data.loadError}
		</div>
	{/if}

	<Card padding="none" class="overflow-hidden">
		<DataTable {columns} data={data.clientes} initialSort={[{ id: 'nome', desc: false }]}>
			{#snippet row(r)}
				{@const c = r.original}
				<tr
					class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
					onclick={() => goto(`/cadastro/${c.id}`)}
				>
					<td class="px-4 py-3 font-medium text-navy">{c.nome}</td>
					<td class="px-4 py-3 text-slate">{c.cnpj_cpf ?? '—'}</td>
					<td class="px-4 py-3 text-slate">
						{c.cidade ?? '—'}{c.estado ? ` / ${c.estado}` : ''}
					</td>
					<td class="px-4 py-3 text-slate">{c.plano_ref ?? '—'}</td>
					<td class="px-4 py-3 text-right tabular-nums text-navy">{valorBRL(c.mrr, data.podeValores)}</td>
					<td class="px-4 py-3 text-right tabular-nums text-slate">
						{c.dia_vencimento ?? '—'}
					</td>
					<td class="px-4 py-3 text-right">
						<a class="text-sm text-brand hover:underline" href={`/cadastro/${c.id}`} onclick={(e) => e.stopPropagation()}>Abrir</a>
					</td>
				</tr>
			{/snippet}
			{#snippet empty()}
				<tr><td colspan="7" class="px-2"><EmptyState icon="file" title="Nenhum cliente encontrado" description="Os clientes cadastrados aparecem aqui." /></td></tr>
			{/snippet}
		</DataTable>
	</Card>
{/if}

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
			action={`/cadastro/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			colaboradores={data.colaboradores}
			cliente={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
