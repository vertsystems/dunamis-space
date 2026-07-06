<script lang="ts">
	import { organyze, toISODate } from '$lib/organyze/store.svelte';
	import { corPrioridade, proximaPrioridade, prazoOrdem, urgencia } from '$lib/organyze/types';
	import type { Tarefa } from '$lib/organyze/types';
	import { Button } from '$lib/components/ui';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import {
		ChevronLeft,
		ChevronRight,
		Plus,
		Trash2,
		Check,
		GripVertical,
		CalendarClock,
		LogOut
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let novoTitulo = $state('');
	let editandoId = $state<string | null>(null);
	let editTexto = $state('');
	let dragId = $state<string | null>(null);

	$effect(() => {
		if (data.supabase) organyze.init(data.supabase);
	});

	const hojeStr = $derived(toISODate(new Date()));

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

	const rotuloDia = $derived.by(() => {
		const [y, m, d] = organyze.dia.split('-').map(Number);
		const alvo = new Date(y, m - 1, d);
		const hoje = new Date();
		hoje.setHours(0, 0, 0, 0);
		const diff = Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
		const rel = diff === 0 ? 'Hoje' : diff === -1 ? 'Ontem' : diff === 1 ? 'Amanhã' : null;
		const ext = alvo.toLocaleDateString('pt-BR', {
			weekday: 'short',
			day: '2-digit',
			month: 'long'
		});
		return { rel, ext };
	});

	const progresso = $derived(
		organyze.total ? Math.round((organyze.concluidas / organyze.total) * 100) : 0
	);

	// Em execução: ordenadas por urgência (prazo mais próximo primeiro; sem prazo por
	// último), com a ordem manual (posição) como desempate. Concluídas: por posição.
	const pendentes = $derived(
		organyze.tarefas
			.filter((t) => !t.concluida)
			.sort((a, b) => prazoOrdem(a) - prazoOrdem(b) || a.posicao - b.posicao)
	);
	const feitas = $derived(organyze.tarefas.filter((t) => t.concluida));

	function adicionar() {
		if (organyze.addTarefa(novoTitulo)) novoTitulo = '';
	}
	function confirmarEdicao() {
		if (editandoId) {
			organyze.editTarefa(editandoId, editTexto);
			editandoId = null;
		}
	}
	function focar(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function onDrop(alvoId: string) {
		const from = dragId;
		dragId = null;
		if (!from || from === alvoId) return;
		// Reordena manualmente dentro das em execução (desempate); concluídas ao final.
		const pend = pendentes.map((t) => t.id);
		const done = feitas.map((t) => t.id);
		const fromIdx = pend.indexOf(from);
		const toIdx = pend.indexOf(alvoId);
		if (fromIdx < 0 || toIdx < 0) return;
		pend.splice(toIdx, 0, pend.splice(fromIdx, 1)[0]);
		organyze.reordenar([...pend, ...done]);
	}
</script>

<svelte:head>
	<title>Organyze | Dunamis Space</title>
</svelte:head>

{#if organyze.loading}
	<div class="flex flex-col items-center justify-center py-24 text-grey">
		<span class="size-8 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
		<p class="mt-3 text-sm">Carregando…</p>
	</div>
{:else if organyze.error && !organyze.colaboradorId}
	<div class="flex flex-col items-center justify-center py-24 text-center">
		<p class="text-brand-danger mb-3">{organyze.error}</p>
		<Button variant="secondary" onclick={() => organyze.load()}>Tentar novamente</Button>
	</div>
{:else if !organyze.colaboradorId}
	<!-- ===== Tela 1: seleção de perfil ===== -->
	<div class="mx-auto flex max-w-3xl flex-col items-center px-4 py-10">
		<div class="mb-10 text-center">
			<h1 class="text-3xl font-bold text-navy">Quem é você?</h1>
			<p class="mt-2 text-slate">Escolha seu perfil para ver as suas tarefas.</p>
		</div>

		{#if organyze.colaboradores.length === 0}
			<p class="text-sm text-grey">Nenhum colaborador ativo encontrado.</p>
		{:else}
			<div class="flex flex-wrap items-start justify-center gap-x-6 gap-y-8">
				{#each organyze.colaboradores as c (c.id)}
					<button
						class="avatar-btn flex w-24 flex-col items-center gap-2.5"
						onclick={() => organyze.selecionarColaborador(c.id)}
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
							<!-- Bandeira do cargo (CEO = selo dourado) -->
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
	<!-- ===== Tela 2: tarefas do colaborador ===== -->
	{@const c = organyze.colaborador}
	<div class="mx-auto max-w-2xl space-y-4">
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
				<div class="text-xs text-grey">Tarefas do dia</div>
			</div>
			<Button variant="secondary" size="sm" onclick={() => organyze.sair()}>
				<LogOut size={15} /> Trocar
			</Button>
		</div>

		<!-- Dia + progresso -->
		<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-5 shadow-xs">
			<div class="flex items-center justify-between gap-3">
				<div class="text-sm font-semibold text-grey">Agenda do dia</div>
				<div class="flex items-center gap-1">
					<button
						class="grid size-8 place-items-center rounded-full text-grey hover:bg-bg hover:text-navy transition-colors"
						aria-label="Dia anterior"
						onclick={() => organyze.passarDia(-1)}
					>
						<ChevronLeft size={18} />
					</button>
					<div class="min-w-[8.5rem] text-center">
						<div class="text-sm font-semibold text-navy leading-tight capitalize">
							{rotuloDia.rel ?? rotuloDia.ext}
						</div>
						{#if rotuloDia.rel}
							<div class="text-[11px] text-grey capitalize">{rotuloDia.ext}</div>
						{/if}
					</div>
					<button
						class="grid size-8 place-items-center rounded-full text-grey hover:bg-bg hover:text-navy transition-colors"
						aria-label="Próximo dia"
						onclick={() => organyze.passarDia(1)}
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{#if !organyze.ehHoje}
				<button
					class="mt-3 text-xs font-semibold text-brand hover:underline"
					onclick={() => organyze.irParaHoje()}
				>
					← Voltar para hoje
				</button>
			{/if}

			{#if organyze.total > 0}
				<div class="mt-4">
					<div class="flex items-center justify-between text-xs text-grey mb-1.5">
						<span class="font-medium">
							{organyze.concluidas} de {organyze.total} concluída{organyze.total === 1 ? '' : 's'}
						</span>
						<span class="tabular-nums font-semibold text-navy">{progresso}%</span>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-bg">
						<div
							class="h-full rounded-full bg-brand transition-all duration-300"
							class:!bg-brand-green={organyze.tudoFeito}
							style="width: {progresso}%"
						></div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Adicionar tarefa -->
		<div class="flex gap-2">
			<input
				class="h-11 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-4 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
				placeholder="O que precisa ser feito?"
				bind:value={novoTitulo}
				onkeydown={(e) => e.key === 'Enter' && adicionar()}
			/>
			<Button onclick={adicionar} disabled={!novoTitulo.trim()}>
				<Plus size={18} /> Adicionar
			</Button>
		</div>

		<!-- Snippet de linha de tarefa -->
		{#snippet taskRow(t: Tarefa, arrastar: boolean)}
			{@const u = urgencia(t.prazo, hojeStr)}
			<li
				draggable={arrastar}
				ondragstart={() => arrastar && (dragId = t.id)}
				ondragover={(e) => arrastar && e.preventDefault()}
				ondrop={() => arrastar && onDrop(t.id)}
				class="group flex items-start gap-2.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-3 shadow-xs transition-colors hover:border-grey"
				class:opacity-60={t.concluida}
			>
				{#if arrastar}
					<span
						class="mt-0.5 cursor-grab text-grey/50 hover:text-grey active:cursor-grabbing"
						aria-hidden="true"
					>
						<GripVertical size={18} />
					</span>
				{:else}
					<span class="mt-0.5 w-[18px] shrink-0" aria-hidden="true"></span>
				{/if}

				<!-- Prioridade (clique cicla) -->
				<button
					class="mt-1 size-3 shrink-0 rounded-full ring-2 ring-transparent transition-all hover:ring-grey-200"
					style="background: {corPrioridade(t.prioridade)}"
					title="Prioridade: {t.prioridade}"
					aria-label="Prioridade {t.prioridade}, clique para alterar"
					onclick={() => organyze.setPrioridade(t.id, proximaPrioridade(t.prioridade))}
				></button>

				<!-- Checkbox -->
				<button
					class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors"
					class:border-grey-200={!t.concluida}
					class:border-brand={t.concluida}
					class:bg-brand={t.concluida}
					class:text-white={t.concluida}
					aria-label={t.concluida ? 'Desmarcar tarefa' : 'Concluir tarefa'}
					onclick={() => organyze.toggle(t.id)}
				>
					{#if t.concluida}<Check size={13} strokeWidth={3} />{/if}
				</button>

				<!-- Conteúdo -->
				<div class="min-w-0 flex-1">
					{#if editandoId === t.id}
						<input
							class="h-8 w-full rounded-md border border-brand bg-surface px-2 text-sm text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
							bind:value={editTexto}
							onkeydown={(e) => {
								if (e.key === 'Enter') confirmarEdicao();
								if (e.key === 'Escape') editandoId = null;
							}}
							onblur={confirmarEdicao}
							use:focar
						/>
					{:else}
						<button
							class="block w-full text-left text-sm transition-colors"
							class:text-navy={!t.concluida}
							class:text-grey={t.concluida}
							class:line-through={t.concluida}
							ondblclick={() => {
								editandoId = t.id;
								editTexto = t.titulo;
							}}
							onclick={() => organyze.toggle(t.id)}
						>
							{t.titulo}
						</button>
					{/if}

					<!-- Prazo de entrega -->
					<div class="mt-1.5 flex flex-wrap items-center gap-2">
						<span
							class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors"
							style="border-color: {u ? u.cor + '66' : 'var(--color-grey-200)'}"
						>
							<CalendarClock size={12} style="color: {u ? u.cor : 'var(--color-grey)'}" />
							<input
								type="date"
								value={t.prazo ?? ''}
								onchange={(e) => organyze.setPrazo(t.id, e.currentTarget.value || null)}
								class="bg-transparent text-[11px] font-medium text-navy outline-none [color-scheme:light]"
								aria-label="Prazo de entrega"
							/>
						</span>
						{#if u && u.status !== 'futura'}
							<span class="text-[11px] font-semibold" style="color: {u.cor}">{u.label}</span>
						{/if}
					</div>
				</div>

				<!-- Excluir -->
				<button
					class="grid size-8 shrink-0 place-items-center rounded-md text-grey opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover:opacity-100"
					aria-label="Excluir tarefa"
					onclick={() => organyze.removeTarefa(t.id)}
				>
					<Trash2 size={16} />
				</button>
			</li>
		{/snippet}

		<!-- Lista -->
		{#if organyze.loadingTarefas}
			<div class="flex justify-center py-16 text-grey">
				<span class="size-7 rounded-full border-2 border-grey-200 border-t-brand animate-spin"
				></span>
			</div>
		{:else if organyze.total === 0}
			<div
				class="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-grey-200 py-16 text-center"
			>
				<div class="grid size-12 place-items-center rounded-full bg-bg text-grey mb-3">
					<Check size={22} />
				</div>
				<p class="text-sm font-medium text-navy">
					Nenhuma tarefa {organyze.ehHoje ? 'para hoje' : 'nesse dia'}
				</p>
				<p class="text-xs text-grey mt-1">Adicione a primeira tarefa acima.</p>
			</div>
		{:else}
			{#if pendentes.length}
				<section class="space-y-2">
					<h2 class="px-1 text-xs font-semibold uppercase tracking-wider text-grey">
						Em execução <span class="text-grey/70 tabular-nums">({pendentes.length})</span>
					</h2>
					<ul class="space-y-2">
						{#each pendentes as t (t.id)}
							{@render taskRow(t, true)}
						{/each}
					</ul>
				</section>
			{/if}

			{#if feitas.length}
				<section class="space-y-2 pt-3">
					<div class="flex items-center justify-between px-1">
						<h2 class="text-xs font-semibold uppercase tracking-wider text-grey">
							Concluídas <span class="text-grey/70 tabular-nums">({feitas.length})</span>
						</h2>
						<button
							class="text-xs font-semibold text-grey hover:text-brand-danger transition-colors"
							onclick={() => organyze.limparConcluidas()}
						>
							Limpar
						</button>
					</div>
					<ul class="space-y-2">
						{#each feitas as t (t.id)}
							{@render taskRow(t, false)}
						{/each}
					</ul>
				</section>
			{/if}
		{/if}
	</div>
{/if}

<style>
	/* Hover no perfil: cresce 15% e volta ao sair. */
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
