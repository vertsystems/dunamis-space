<script lang="ts">
	import {
		CONTEUDO_STATUS_GRUPOS,
		CONTEUDO_TIPO,
		conteudoStatusTone,
		conteudoStatusLabel,
		conteudoTipoLabel
	} from '$lib/conteudo';
	import { invalidateAll } from '$app/navigation';
	import { Card, Badge, Button, Select, SegmentedNav, EmptyState, DataTable, Modal } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	import ConteudoForm from '$lib/components/ConteudoForm.svelte';
	import { toast } from '$lib/toast.svelte';

	let { data, form } = $props();
	// O form vem de actions de outras rotas (/conteudo/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);

	type Conteudo = (typeof data.conteudos)[number];
	const columns: ColumnDef<Conteudo>[] = [
		{ id: 'publicacao', accessorFn: (c) => c.data_publicacao ?? '', meta: { label: 'Publicação' } },
		{ id: 'titulo', accessorFn: (c) => c.titulo ?? '', meta: { label: 'Título' } },
		{ id: 'cliente', accessorFn: (c) => c.cliente?.nome ?? '', meta: { label: 'Cliente' } },
		{ id: 'tipo', accessorFn: (c) => conteudoTipoLabel(c.tipo), meta: { label: 'Tipo' } },
		{ id: 'status', accessorFn: (c) => conteudoStatusLabel(c.status), meta: { label: 'Status' } },
		{ id: 'acoes', accessorFn: () => '', meta: { label: '' } }
	];
	let status = $state(data.status);
	let tipo = $state(data.tipo);
	// Re-sincroniza os filtros com a URL (back/forward do navegador).
	$effect(() => {
		status = data.status;
		tipo = data.tipo;
	});

	const segs = [
		{ label: 'Lista', href: '/conteudo' },
		{ label: 'Calendário', href: '/conteudo/calendario' },
		{ label: 'Aprovações', href: '/conteudo/aprovacoes' }
	];

	function fmt(d: string | null) {
		return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
	}

	let novoAberto = $state(false);
	let editando = $state<Conteudo | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Conteúdo criado');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Conteúdo salvo');
		invalidateAll();
	}
</script>

<div class="mb-4">
	<h1 class="text-base font-semibold text-navy">Conteúdo</h1>
	<p class="text-sm text-grey">Planejamento e aprovação de publicações.</p>
</div>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<div class="flex flex-wrap items-end gap-2">
		<SegmentedNav items={segs} current="Lista" />
		<form class="flex gap-2" method="GET">
			<Select name="status" bind:value={status} wrapperClass="w-40">
				<option value="">Todos os status</option>
				{#each CONTEUDO_STATUS_GRUPOS as g (g.grupo)}
					<optgroup label={g.grupo}>
						{#each g.itens as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
					</optgroup>
				{/each}
			</Select>
			<Select name="tipo" bind:value={tipo} wrapperClass="w-40">
				<option value="">Todos os tipos</option>
				{#each CONTEUDO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
			</Select>
			<Button variant="secondary" type="submit">Filtrar</Button>
		</form>
	</div>
	<Button onclick={() => (novoAberto = true)}>+ Novo conteúdo</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.conteudos} initialSort={[{ id: 'publicacao', desc: true }]}>
		{#snippet row(r)}
			{@const c = r.original}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => (editando = c)}>
				<td class="px-4 py-3 whitespace-nowrap">{fmt(c.data_publicacao)}</td>
				<td class="px-4 py-3 font-medium text-navy">{c.titulo ?? '(sem título)'}</td>
				<td class="px-4 py-3">{c.cliente?.nome ?? '—'}</td>
				<td class="px-4 py-3">{conteudoTipoLabel(c.tipo)}</td>
				<td class="px-4 py-3"><Badge tone={conteudoStatusTone(c.status)}>{conteudoStatusLabel(c.status)}</Badge></td>
				<td class="px-4 py-3 text-right">
					<a class="text-sm text-brand hover:underline" href={`/conteudo/${c.id}`} onclick={(e) => e.stopPropagation()}>Abrir</a>
				</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="6" class="px-2"><EmptyState icon="edit" title="Nenhum conteúdo ainda" description="Planeje as publicações dos clientes." /></td></tr>
		{/snippet}
	</DataTable>
</Card>

<Modal open={novoAberto} title="Novo conteúdo" size="lg" onClose={() => (novoAberto = false)}>
	<ConteudoForm
		action="/conteudo/novo"
		submitLabel="Criar conteúdo"
		clientes={data.clientes}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		campanhas={data.campanhas ?? []}
		conteudo={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar conteúdo" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<ConteudoForm
			action={`/conteudo/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			clientes={data.clientes}
			projetos={data.projetos}
			colaboradores={data.colaboradores}
			campanhas={data.campanhas ?? []}
			conteudo={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
