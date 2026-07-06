<script lang="ts">
	import { organyze } from '$lib/organyze/store.svelte';
	import { metaPct, metaConcluida } from '$lib/organyze/types';
	import type { Meta } from '$lib/organyze/types';
	import { Button, Card } from '$lib/components/ui';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { ChevronLeft, ChevronRight, Plus, Minus, Trash2, Check, Pencil, LogOut } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let novoTitulo = $state('');
	let novoAlvo = $state(1);
	let editId = $state<string | null>(null);
	let eTitulo = $state('');
	let eAlvo = $state(1);
	let eUnidade = $state('');

	// Inicializa (colaboradores) e recarrega metas quando muda perfil ou mês.
	$effect(() => {
		if (data.supabase) organyze.init(data.supabase);
	});
	$effect(() => {
		// deps: perfil + mês
		void organyze.colaboradorId;
		void organyze.mesMeta;
		if (organyze.supabase && organyze.colaboradorId) organyze.carregarMetas();
	});

	function iniciais(nome: string): string {
		const p = nome.trim().split(/\s+/);
		return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
	}
	const CORES = ['#3b6ef6', '#17b26a', '#f5a524', '#f04438', '#8b5cf6', '#ec4899', '#0ea5e9'];
	function corAvatar(id: string): string {
		let h = 0;
		for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
		return CORES[h % CORES.length];
	}

	const mesAtualStr = (() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	})();

	// Resumo do mês
	const totalMetas = $derived(organyze.metas.length);
	const metasFeitas = $derived(organyze.metas.filter((m) => metaConcluida(m)).length);
	const pctGeral = $derived(totalMetas ? Math.round((metasFeitas / totalMetas) * 100) : 0);

	function adicionar() {
		if (organyze.addMeta(novoTitulo, novoAlvo)) {
			novoTitulo = '';
			novoAlvo = 1;
		}
	}
	function abrirEdicao(m: Meta) {
		editId = m.id;
		eTitulo = m.titulo;
		eAlvo = m.alvo;
		eUnidade = m.unidade;
	}
	function salvarEdicao() {
		if (editId) organyze.editMeta(editId, { titulo: eTitulo, alvo: eAlvo, unidade: eUnidade });
		editId = null;
	}
</script>

<svelte:head>
	<title>Metas do Mês | Organyze</title>
</svelte:head>

{#if organyze.loading}
	<div class="flex flex-col items-center justify-center py-24 text-grey">
		<span class="size-8 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
		<p class="mt-3 text-sm">Carregando…</p>
	</div>
{:else if !organyze.colaboradorId}
	<!-- Seleção de perfil (compartilhada com Tarefas) -->
	<div class="mx-auto flex max-w-3xl flex-col items-center px-4 py-10">
		<div class="mb-10 text-center">
			<h1 class="text-3xl font-bold text-navy">Quem é você?</h1>
			<p class="mt-2 text-slate">Escolha seu perfil para ver as metas do mês.</p>
		</div>
		{#if organyze.colaboradores.length === 0}
			<p class="text-sm text-grey">Nenhum colaborador ativo encontrado.</p>
		{:else}
			<div class="flex flex-wrap items-start justify-center gap-x-6 gap-y-8">
				{#each organyze.colaboradores as c (c.id)}
					<button
						class="avatar-btn flex w-24 flex-col items-center gap-2.5"
						onclick={() => organyze.selecionarParaMetas(c.id)}
					>
						<span class="avatar-ring relative rounded-full">
							{#if c.avatarUrl}
								<img src={c.avatarUrl} alt={c.nome} class="size-20 rounded-full object-cover" />
							{:else}
								<span
									class="grid size-20 place-items-center rounded-full text-2xl font-semibold text-white"
									style="background: {corAvatar(c.id)}"
								>
									{iniciais(c.nome)}
								</span>
							{/if}
							<span class="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
								<CargoBadge funcao={c.funcao} />
							</span>
						</span>
						<span class="line-clamp-1 text-sm font-semibold text-navy">{c.nome}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	{@const c = organyze.colaborador}
	<div class="max-w-4xl space-y-5">
		<!-- Cabeçalho: perfil + trocar -->
		<div class="flex items-center gap-3">
			<span class="relative inline-block">
				{#if c?.avatarUrl}
					<img src={c.avatarUrl} alt={c.nome} class="size-11 rounded-full object-cover" />
				{:else if c}
					<span
						class="grid size-11 place-items-center rounded-full text-sm font-semibold text-white"
						style="background: {corAvatar(c.id)}"
					>
						{iniciais(c.nome)}
					</span>
				{/if}
				{#if c}
					<span class="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
						<CargoBadge funcao={c.funcao} />
					</span>
				{/if}
			</span>
			<div class="flex-1">
				<div class="text-lg font-bold leading-tight text-navy">{c?.nome}</div>
				<div class="text-xs text-grey">Metas do mês</div>
			</div>
			<Button variant="secondary" size="sm" onclick={() => organyze.sair()}>
				<LogOut size={15} /> Trocar
			</Button>
		</div>

		<!-- Mês + resumo -->
		<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-5 shadow-xs">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-2 text-brand">
					<Icon name="chart" size={18} />
					<span class="text-sm font-semibold text-grey">Metas de</span>
				</div>
				<div class="flex items-center gap-1">
					<button
						class="grid size-8 place-items-center rounded-full text-grey hover:bg-bg hover:text-navy transition-colors"
						aria-label="Mês anterior"
						onclick={() => organyze.passarMes(-1)}
					>
						<ChevronLeft size={18} />
					</button>
					<div class="min-w-[9.5rem] text-center text-sm font-semibold text-navy capitalize">
						{organyze.mesMetaLabel}
					</div>
					<button
						class="grid size-8 place-items-center rounded-full text-grey hover:bg-bg hover:text-navy transition-colors"
						aria-label="Próximo mês"
						onclick={() => organyze.passarMes(1)}
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{#if organyze.mesMeta !== mesAtualStr}
				<button
					class="mt-3 text-xs font-semibold text-brand hover:underline"
					onclick={() => organyze.setMesMeta(mesAtualStr)}
				>
					← Voltar para o mês atual
				</button>
			{/if}

			{#if totalMetas > 0}
				<div class="mt-4">
					<div class="flex items-center justify-between text-xs text-grey mb-1.5">
						<span class="font-medium">{metasFeitas} de {totalMetas} concluída{totalMetas === 1 ? '' : 's'}</span>
						<span class="tabular-nums font-semibold text-navy">{pctGeral}%</span>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-bg">
						<div
							class="h-full rounded-full bg-brand transition-all duration-300"
							class:!bg-brand-green={metasFeitas === totalMetas}
							style="width: {pctGeral}%"
						></div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Adicionar meta -->
		<div class="flex flex-wrap gap-2">
			<input
				class="h-11 min-w-[12rem] flex-1 rounded-[var(--radius)] border border-grey-200 bg-surface px-4 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
				placeholder="Nova meta do mês…"
				bind:value={novoTitulo}
				onkeydown={(e) => e.key === 'Enter' && adicionar()}
			/>
			<div class="flex items-center gap-1.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-3">
				<span class="text-xs font-medium text-grey">Alvo</span>
				<input
					type="number"
					min="1"
					bind:value={novoAlvo}
					class="h-11 w-14 bg-transparent text-sm text-navy outline-none"
				/>
			</div>
			<Button onclick={adicionar} disabled={!novoTitulo.trim()}>
				<Plus size={18} /> Adicionar
			</Button>
		</div>

		<!-- Lista de metas -->
		{#if organyze.loadingMetas}
			<div class="flex justify-center py-16 text-grey">
				<span class="size-7 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
			</div>
		{:else if totalMetas === 0}
			<div
				class="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-grey-200 py-16 text-center"
			>
				<div class="grid size-12 place-items-center rounded-full bg-bg text-grey mb-3">
					<Icon name="chart" size={22} />
				</div>
				<p class="text-sm font-medium text-navy">Nenhuma meta neste mês</p>
				<p class="text-xs text-grey mt-1">Adicione a primeira meta acima.</p>
			</div>
		{:else}
			<ul class="space-y-2">
				{#each organyze.metas as m (m.id)}
					{@const feita = metaConcluida(m)}
					<li
						class="group rounded-[var(--radius-lg)] border border-grey-200 bg-surface px-4 py-3 shadow-xs transition-colors hover:border-grey"
					>
						{#if editId === m.id}
							<!-- Edição inline -->
							<div class="flex flex-wrap items-center gap-2">
								<input
									class="h-9 min-w-[10rem] flex-1 rounded-[var(--radius)] border border-brand bg-surface px-3 text-sm text-navy-900 outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
									bind:value={eTitulo}
									onkeydown={(e) => e.key === 'Enter' && salvarEdicao()}
								/>
								<div class="flex items-center gap-1.5 rounded-[var(--radius)] border border-grey-200 px-2">
									<span class="text-[11px] text-grey">Alvo</span>
									<input type="number" min="1" bind:value={eAlvo} class="h-9 w-12 bg-transparent text-sm text-navy outline-none" />
								</div>
								<input
									class="h-9 w-24 rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-sm text-navy outline-none focus-visible:border-brand"
									placeholder="unidade"
									bind:value={eUnidade}
								/>
								<Button size="sm" onclick={salvarEdicao}>Salvar</Button>
								<button class="text-xs font-medium text-grey hover:text-navy" onclick={() => (editId = null)}>Cancelar</button>
							</div>
						{:else}
							<div class="flex items-center gap-3">
								<!-- Toggle concluída -->
								<button
									class="grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors"
									class:border-grey-200={!feita}
									class:border-brand-green={feita}
									class:bg-brand-green={feita}
									class:text-white={feita}
									aria-label={feita ? 'Reabrir meta' : 'Concluir meta'}
									onclick={() => organyze.toggleMeta(m.id)}
								>
									{#if feita}<Check size={14} strokeWidth={3} />{/if}
								</button>

								<div class="min-w-0 flex-1">
									<div class="flex items-center justify-between gap-2">
										<span
											class="truncate text-sm font-medium"
											class:text-navy={!feita}
											class:text-grey={feita}
											class:line-through={feita}>{m.titulo}</span
										>
										<span class="shrink-0 text-xs tabular-nums text-grey">
											{m.atual}/{m.alvo}{m.unidade ? ` ${m.unidade}` : ''}
										</span>
									</div>
									<div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg">
										<div
											class="h-full rounded-full transition-all duration-300"
											style="width: {metaPct(m)}%; background: {feita
												? 'var(--color-brand-green)'
												: 'var(--color-brand)'}"
										></div>
									</div>
								</div>

								<!-- Controles -->
								<div class="flex shrink-0 items-center gap-1">
									<button
										class="grid size-7 place-items-center rounded-md border border-grey-200 text-grey hover:bg-bg hover:text-navy transition-colors disabled:opacity-40"
										aria-label="Diminuir"
										disabled={m.atual <= 0}
										onclick={() => organyze.incMeta(m.id, -1)}
									>
										<Minus size={14} />
									</button>
									<button
										class="grid size-7 place-items-center rounded-md border border-grey-200 text-grey hover:bg-bg hover:text-navy transition-colors disabled:opacity-40"
										aria-label="Aumentar"
										disabled={m.atual >= m.alvo}
										onclick={() => organyze.incMeta(m.id, 1)}
									>
										<Plus size={14} />
									</button>
									<button
										class="grid size-7 place-items-center rounded-md text-grey opacity-0 transition-all hover:bg-bg hover:text-navy group-hover:opacity-100"
										aria-label="Editar meta"
										onclick={() => abrirEdicao(m)}
									>
										<Pencil size={14} />
									</button>
									<button
										class="grid size-7 place-items-center rounded-md text-grey opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover:opacity-100"
										aria-label="Excluir meta"
										onclick={() => organyze.removeMeta(m.id)}
									>
										<Trash2 size={14} />
									</button>
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Habit Tracker (embutido) -->
		<Card>
			<div class="mb-1 flex items-center gap-2">
				<Icon name="clipboard" size={16} class="text-brand" />
				<h2 class="text-sm font-semibold text-navy">Habit Tracker</h2>
			</div>
			<p class="mb-1 text-xs text-grey">Acompanhe a constância dos seus hábitos ao longo do mês.</p>
			<div class="flex flex-col items-center justify-center py-10 text-center">
				<span class="grid size-12 place-items-center rounded-full bg-bg text-grey mb-3">
					<Icon name="check" size={22} />
				</span>
				<p class="text-sm font-medium text-navy">Em construção</p>
				<p class="mt-1 max-w-md text-sm text-grey">
					Em breve: cadastre hábitos, marque cada dia e veja sua sequência (streak) no mês.
				</p>
			</div>
		</Card>
	</div>
{/if}

<style>
	.avatar-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
	}
	.avatar-ring {
		display: inline-block;
		transition: transform 0.18s ease;
		outline: 2px solid transparent;
		outline-offset: 2px;
		border-radius: 9999px;
	}
	.avatar-btn:hover .avatar-ring {
		transform: scale(1.15);
		outline-color: var(--color-brand);
	}
</style>
