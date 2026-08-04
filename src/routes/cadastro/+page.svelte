<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { podeEditar } from '$lib/permissoes';
	import { statusLabel, statusTone } from '$lib/clientes';
	import { valorBRL } from '$lib/valores';
	import { Badge, Button, Card, Input, EmptyState, Modal } from '$lib/components/ui';
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

	// Cor determinística a partir do nome, para quem ainda não tem logo — mesma
	// ideia (e mesma paleta) das bolinhas da Visão Geral.
	const AVATAR_CORES = ['bg-navy', 'bg-brand', 'bg-brand-green', 'bg-brand-danger', 'bg-slate'];
	function corAvatar(nome: string): string {
		let h = 0;
		for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
		return AVATAR_CORES[h % AVATAR_CORES.length];
	}
	function iniciais(nome: string): string {
		const p = (nome ?? '').trim().split(/\s+/).filter(Boolean);
		return ((p.length >= 2 ? p[0][0] + p[1][0] : (nome ?? '?').slice(0, 2)) || '?').toUpperCase();
	}

	/** Responsáveis do cliente, na ordem gravada, resolvidos pelo lookup do load. */
	function responsaveisDe(c: Cliente) {
		const ids: string[] = c.responsaveis_ids?.length
			? c.responsaveis_ids
			: c.responsavel_id
				? [c.responsavel_id]
				: [];
		return ids
			.map((id) => data.colaboradores.find((k) => k.id === id))
			.filter((k): k is NonNullable<typeof k> => !!k);
	}

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

	{#if data.clientes.length}
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
			{#each data.clientes as c (c.id)}
				<Card class="flex flex-col gap-3 transition-shadow hover:shadow-md">
					<!-- Cabeçalho: logo à esquerda, identificação à direita. -->
					<div class="flex items-start gap-3">
						{#if c.logo_url}
							<img src={c.logo_url} alt={c.nome} class="size-12 shrink-0 rounded-full object-cover shadow-sm" />
						{:else}
							<span class="grid size-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-sm {corAvatar(c.nome)}">
								{iniciais(c.nome)}
							</span>
						{/if}
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
								<a href={`/cadastro/${c.id}`} class="truncate font-semibold text-navy no-underline hover:text-brand">{c.nome}</a>
								<Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
							</div>
							<p class="truncate text-xs text-grey">{c.segmento || c.razao_social || '—'}</p>
						</div>
					</div>

					<!-- Dados de referência. Rótulo em cima do valor: com duas colunas
					     estreitas, rótulo ao lado quebraria o valor em duas linhas. -->
					<dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
						<div class="min-w-0">
							<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-grey">CNPJ / CPF</dt>
							<dd class="truncate text-slate">{c.cnpj_cpf ?? '—'}</dd>
						</div>
						<div class="min-w-0">
							<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-grey">Cidade / UF</dt>
							<dd class="truncate text-slate">{c.cidade ?? '—'}{c.estado ? ` / ${c.estado}` : ''}</dd>
						</div>
						<div class="min-w-0">
							<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-grey">Plano</dt>
							<dd class="truncate text-slate">{c.plano_ref ?? '—'}</dd>
						</div>
						<div class="min-w-0">
							<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-grey">
								Valor ref.{c.dia_vencimento != null ? ` · venc. ${c.dia_vencimento}` : ''}
							</dt>
							<dd class="truncate font-medium tabular-nums text-navy">{valorBRL(c.mrr, data.podeValores)}</dd>
						</div>
					</dl>

					<!-- Rodapé colado embaixo (mt-auto): cartões da mesma linha têm
					     alturas diferentes conforme o conteúdo. -->
					<div class="mt-auto flex items-center justify-between gap-2 border-t border-grey-200/60 pt-2.5">
						<div class="flex items-center gap-1">
							{#each responsaveisDe(c) as r (r.id)}
								{#if r.avatar_url}
									<img src={r.avatar_url} alt={r.nome} title={r.nome} class="size-6 rounded-full object-cover shadow-sm" />
								{:else}
									<span title={r.nome} class="grid size-6 place-items-center rounded-full text-[0.6rem] font-semibold text-white {corAvatar(r.nome)}">{iniciais(r.nome)}</span>
								{/if}
							{/each}
						</div>
						<div class="flex items-center gap-3">
							{#if podeEditar(perms, 'clientes')}
								<button type="button" class="text-sm text-slate hover:text-navy" onclick={() => (editando = c)}>Editar</button>
							{/if}
							<a class="text-sm font-medium text-brand no-underline hover:underline" href={`/cadastro/${c.id}`}>Abrir</a>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{:else}
		<Card><EmptyState icon="file" title="Nenhum cliente encontrado" description="Os clientes cadastrados aparecem aqui." /></Card>
	{/if}
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
