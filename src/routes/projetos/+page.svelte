<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import {
		PROJETO_STATUS,
		projetoStatusTone,
		projetoStatusLabel,
		projetoTipoLabel
	} from '$lib/projetos';
	import { valorBRL } from '$lib/valores';
	import { iniciais } from '$lib/crm';
	import { Card, Badge, Button, Input, Select, EmptyState, Modal } from '$lib/components/ui';
	import ProjetoForm from '$lib/components/ProjetoForm.svelte';
	import { toast } from '$lib/toast.svelte';
	import { podeEditar } from '$lib/permissoes';

	let { data, form } = $props();

	const perms = $derived(page.data.permissoes);
	// O form vem de actions de outras rotas (/projetos/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);

	type Projeto = (typeof data.projetos)[number];

	// Filtros: espelham a URL, e o back/forward do navegador re-sincroniza.
	let status = $state(data.status);
	let cliente = $state(data.cliente);
	let q = $state(data.q);
	$effect(() => {
		status = data.status;
		cliente = data.cliente;
		q = data.q;
	});

	// Cor determinística a partir do nome — mesma paleta da lista de clientes.
	const AVATAR_CORES = ['bg-navy', 'bg-brand', 'bg-brand-green', 'bg-brand-danger', 'bg-slate'];
	function corAvatar(nome: string): string {
		let h = 0;
		for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
		return AVATAR_CORES[h % AVATAR_CORES.length];
	}

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}

	/** Dias até o prazo — negativo é atraso. Null quando não há prazo ou já acabou. */
	function diasAteOPrazo(p: Projeto): number | null {
		if (!p.prazo || p.status === 'finalizado') return null;
		const hoje = new Date();
		hoje.setHours(0, 0, 0, 0);
		return Math.round(
			(new Date(p.prazo + 'T00:00:00').getTime() - hoje.getTime()) / 86_400_000
		);
	}

	let novoAberto = $state(false);
	let editando = $state<Projeto | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Projeto criado');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Projeto salvo');
		invalidateAll();
	}
</script>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-base font-semibold text-navy">Projetos</h1>
		<p class="text-sm text-grey">Ficha, prazos e acessos de cada projeto dos clientes</p>
	</div>
	<div class="flex flex-wrap items-end gap-2">
		<!-- Um formulário só: buscar e filtrar mandam tudo junto, senão filtrar
		     apagaria a busca (e vice-versa). -->
		<form class="flex flex-wrap items-end gap-2" method="GET">
			<Input
				type="search"
				name="q"
				placeholder="Buscar por nome"
				aria-label="Buscar projeto por nome"
				bind:value={q}
				wrapperClass="w-48"
			/>
			<Select name="cliente" bind:value={cliente} aria-label="Filtrar por cliente" wrapperClass="w-44">
				<option value="">Todos os clientes</option>
				{#each data.clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
			</Select>
			<Select name="status" bind:value={status} aria-label="Filtrar por status" wrapperClass="w-44">
				<option value="">Todos os status</option>
				{#each PROJETO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</Select>
			<Button variant="secondary" type="submit">Filtrar</Button>
		</form>
		{#if podeEditar(perms, 'projetos')}
			<Button onclick={() => (novoAberto = true)}>+ Novo projeto</Button>
		{/if}
	</div>
</div>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
		Erro ao carregar: {data.loadError}
	</div>
{/if}

{#if data.projetos.length}
	<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		{#each data.projetos as p (p.id)}
			{@const dias = diasAteOPrazo(p)}
			<Card class="flex flex-col gap-3 transition-shadow hover:shadow-md">
				<!-- Cabeçalho: logo do cliente à esquerda, projeto à direita. -->
				<div class="flex items-start gap-3">
					{#if p.cliente?.logo_url}
						<img
							src={p.cliente.logo_url}
							alt={p.cliente.nome}
							class="size-12 shrink-0 rounded-full object-cover shadow-sm"
						/>
					{:else}
						<span
							class="grid size-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-sm {corAvatar(
								p.nome
							)}">{iniciais(p.nome)}</span
						>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
							<a
								href={`/projetos/${p.id}`}
								class="truncate font-semibold text-navy no-underline hover:text-brand"
								>{p.nome}</a
							>
							<Badge tone={projetoStatusTone(p.status)}>{projetoStatusLabel(p.status)}</Badge>
						</div>
						<p class="truncate text-xs text-grey">{p.cliente?.nome ?? 'Sem cliente'}</p>
					</div>
				</div>

				<!-- Dados de referência. Rótulo em cima do valor, como na lista de clientes. -->
				<dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
					<div class="min-w-0">
						<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-grey">Tipo</dt>
						<dd class="truncate text-slate">{projetoTipoLabel(p.tipo)}</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-grey">Início</dt>
						<dd class="truncate text-slate">{fmtData(p.data_inicio)}</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-grey">Prazo</dt>
						<dd class="flex items-center gap-1.5 truncate text-slate">
							{fmtData(p.prazo)}
							{#if dias != null && dias < 0}
								<Badge tone="danger">{-dias}d</Badge>
							{:else if dias != null && dias <= 7}
								<Badge tone="warning">{dias}d</Badge>
							{/if}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-grey">
							{p.recorrente ? 'Valor (recorrente)' : 'Valor'}
						</dt>
						<dd class="truncate font-medium tabular-nums text-navy">
							{valorBRL(p.valor, data.podeValores)}
						</dd>
					</div>
				</dl>

				<!-- Rodapé colado embaixo: cartões da mesma linha têm alturas diferentes. -->
				<div
					class="mt-auto flex items-center justify-between gap-2 border-t border-grey-200/60 pt-2.5"
				>
					<div class="flex items-center gap-1">
						{#if p.responsavel}
							{#if p.responsavel.avatar_url}
								<img
									src={p.responsavel.avatar_url}
									alt={p.responsavel.nome}
									title={p.responsavel.nome}
									class="size-6 rounded-full object-cover shadow-sm"
								/>
							{:else}
								<span
									title={p.responsavel.nome}
									class="grid size-6 place-items-center rounded-full text-[0.6rem] font-semibold text-white {corAvatar(
										p.responsavel.nome
									)}">{iniciais(p.responsavel.nome)}</span
								>
							{/if}
						{/if}
					</div>
					<div class="flex items-center gap-3">
						{#if podeEditar(perms, 'projetos')}
							<button
								type="button"
								class="text-sm text-slate hover:text-navy"
								onclick={() => (editando = p)}>Editar</button
							>
						{/if}
						<a
							class="text-sm font-medium text-brand no-underline hover:underline"
							href={`/projetos/${p.id}`}>Abrir</a
						>
					</div>
				</div>
			</Card>
		{/each}
	</div>
{:else}
	<Card>
		<EmptyState
			icon="folder"
			title="Nenhum projeto encontrado"
			description="Cada projeto ganha aqui a sua página, com ficha, prazos e cofre de acessos."
		/>
	</Card>
{/if}

<Modal open={novoAberto} title="Novo projeto" size="lg" onClose={() => (novoAberto = false)}>
	<ProjetoForm
		action="/projetos/novo"
		submitLabel="Criar projeto"
		clientes={data.clientes}
		colaboradores={data.colaboradores}
		projeto={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar projeto" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<ProjetoForm
			action={`/projetos/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			clientes={data.clientes}
			colaboradores={data.colaboradores}
			projeto={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
