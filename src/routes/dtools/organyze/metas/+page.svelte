<script lang="ts">
	import { organyze } from '$lib/organyze/store.svelte';
	import { metaPct, metaConcluida, diasNoMes } from '$lib/organyze/types';
	import { Target, Repeat, TrendingUp, CircleCheck } from '@lucide/svelte';
	import type { Meta } from '$lib/organyze/types';
	import { Button } from '$lib/components/ui';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import Abas from '$lib/components/organyze/Abas.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import {
		ChevronLeft,
		ChevronRight,
		Plus,
		Minus,
		Trash2,
		Check,
		Pencil,
		LogOut
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let novoTitulo = $state('');
	let novoAlvo = $state(1);
	let editId = $state<string | null>(null);
	let eTitulo = $state('');
	let eAlvo = $state(1);
	let eUnidade = $state('');

	// Habit Tracker
	let novoHabito = $state('');
	let editHabId = $state<string | null>(null);
	let eHabNome = $state('');

	// Inicializa (colaboradores) e recarrega metas quando muda perfil ou mês.
	$effect(() => {
		if (data.supabase) organyze.init(data.supabase, (data.perfil?.id as string | undefined) ?? null);
	});
	$effect(() => {
		// deps: perfil + mês
		void organyze.colaboradorId;
		void organyze.mesMeta;
		if (organyze.supabase && organyze.colaboradorId) {
			organyze.carregarMetas();
			organyze.carregarHabitos();
		}
	});

	// Dias do mês selecionado + destaque do dia de hoje (se for o mês atual).
	const diasDoMes = $derived(
		Array.from({ length: diasNoMes(organyze.mesMeta) }, (_, i) => i + 1)
	);
	const hojeDia = $derived.by(() => {
		const d = new Date();
		const mesHoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		return organyze.mesMeta === mesHoje ? d.getDate() : null;
	});

	function adicionarHabito() {
		if (organyze.addHabito(novoHabito)) novoHabito = '';
	}
	function abrirEdHabito(id: string, nome: string) {
		editHabId = id;
		eHabNome = nome;
	}
	function salvarHabito() {
		if (editHabId) organyze.editHabito(editHabId, eHabNome);
		editHabId = null;
	}

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

	// ---- Resumo / Dashboard do mês ----
	const totalMetas = $derived(organyze.metas.length);
	const metasFeitas = $derived(organyze.metas.filter((m) => metaConcluida(m)).length);
	const pctGeral = $derived(totalMetas ? Math.round((metasFeitas / totalMetas) * 100) : 0);
	// Progresso médio das metas (considera o avanço parcial de cada uma, não só as 100%).
	const progressoMedio = $derived(
		totalMetas ? Math.round(organyze.metas.reduce((s, m) => s + metaPct(m), 0) / totalMetas) : 0
	);

	// Dias já decorridos do mês selecionado (mês passado = mês inteiro; futuro = 0).
	const diasDecorridos = $derived.by(() => {
		if (organyze.mesMeta < mesAtualStr) return diasNoMes(organyze.mesMeta);
		if (organyze.mesMeta === mesAtualStr) return new Date().getDate();
		return 0;
	});

	// Habit tracker — agregados do mês.
	const totalHabitos = $derived(organyze.habitos.length);
	const habitFeitos = $derived(
		organyze.habitos.reduce((s, h) => s + Object.values(h.dias).filter((v) => v === 'feito').length, 0)
	);
	const habitFalhas = $derived(
		organyze.habitos.reduce((s, h) => s + Object.values(h.dias).filter((v) => v === 'falhou').length, 0)
	);
	const habitCheckins = $derived(habitFeitos + habitFalhas);
	// Taxa de acerto: dos dias marcados, quantos foram "feito".
	const taxaAcerto = $derived(habitCheckins ? Math.round((habitFeitos / habitCheckins) * 100) : 0);
	// Aderência: feitos sobre o total possível (dias decorridos × nº de hábitos).
	const possiveis = $derived(diasDecorridos * totalHabitos);
	const aderencia = $derived(possiveis ? Math.round((habitFeitos / possiveis) * 100) : 0);
	// Estatística por hábito (para as barrinhas).
	const habitStats = $derived(
		organyze.habitos.map((h) => {
			const feitos = Object.values(h.dias).filter((v) => v === 'feito').length;
			return { id: h.id, nome: h.nome, feitos, pct: diasDecorridos ? Math.round((feitos / diasDecorridos) * 100) : 0 };
		})
	);
	const temDashboard = $derived(totalMetas > 0 || totalHabitos > 0);

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
	<div class="flex flex-col items-start py-10">
		<div class="mb-10 text-left">
			<h1 class="text-3xl font-bold text-navy">Quem é você?</h1>
			<p class="mt-2 text-slate">Escolha seu perfil para ver as metas do mês.</p>
		</div>
		{#if organyze.colaboradores.length === 0}
			<p class="text-sm text-grey">Nenhum colaborador ativo encontrado.</p>
		{:else}
			<div class="flex flex-wrap items-start justify-start gap-x-6 gap-y-8">
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
	<!-- Mesma largura das outras telas: quem manda é a coluna do shell. -->
	<div class="space-y-5">
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
			<Abas />
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

		</div>

		<!-- ===== Dashboard do mês ===== -->
		{#if temDashboard}
			{#snippet ring(pct: number, cor: string)}
				<div class="relative grid size-24 shrink-0 place-items-center">
					<svg viewBox="0 0 80 80" class="size-24 -rotate-90">
						<circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-bg)" stroke-width="9" />
						<circle
							cx="40"
							cy="40"
							r="34"
							fill="none"
							stroke={cor}
							stroke-width="9"
							stroke-linecap="round"
							stroke-dasharray={2 * Math.PI * 34}
							stroke-dashoffset={2 * Math.PI * 34 * (1 - pct / 100)}
							class="transition-all duration-500"
						/>
					</svg>
					<span class="absolute text-xl font-bold tabular-nums text-navy">{pct}%</span>
				</div>
			{/snippet}

			<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-5 shadow-xs">
				<h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-navy">
					<Icon name="chart" size={17} /> Resumo do mês
				</h3>

				<!-- KPIs -->
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div class="rounded-[var(--radius)] bg-bg p-3">
						<div class="flex items-center gap-1.5 text-grey"><Target size={14} /><span class="text-xs font-medium">Metas concluídas</span></div>
						<div class="mt-1 text-2xl font-bold tabular-nums text-navy">{metasFeitas}<span class="text-base font-semibold text-grey">/{totalMetas}</span></div>
					</div>
					<div class="rounded-[var(--radius)] bg-bg p-3">
						<div class="flex items-center gap-1.5 text-grey"><TrendingUp size={14} /><span class="text-xs font-medium">Progresso médio</span></div>
						<div class="mt-1 text-2xl font-bold tabular-nums text-navy">{progressoMedio}%</div>
					</div>
					<div class="rounded-[var(--radius)] bg-bg p-3">
						<div class="flex items-center gap-1.5 text-grey"><Repeat size={14} /><span class="text-xs font-medium">Hábitos feitos</span></div>
						<div class="mt-1 text-2xl font-bold tabular-nums text-navy">{habitFeitos}</div>
					</div>
					<div class="rounded-[var(--radius)] bg-bg p-3">
						<div class="flex items-center gap-1.5 text-grey"><CircleCheck size={14} /><span class="text-xs font-medium">Aderência</span></div>
						<div class="mt-1 text-2xl font-bold tabular-nums text-navy">{aderencia}%</div>
					</div>
				</div>

				<!-- Anéis de progresso -->
				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					<div class="flex items-center gap-4 rounded-[var(--radius)] bg-bg/60 p-4">
						{@render ring(pctGeral, totalMetas > 0 && metasFeitas === totalMetas ? 'var(--color-brand-green)' : 'var(--color-brand)')}
						<div class="min-w-0">
							<div class="text-sm font-semibold text-navy">Metas concluídas</div>
							<div class="mt-0.5 text-xs text-grey">
								{#if totalMetas}{metasFeitas} de {totalMetas} · progresso médio {progressoMedio}%{:else}Nenhuma meta neste mês{/if}
							</div>
						</div>
					</div>
					<div class="flex items-center gap-4 rounded-[var(--radius)] bg-bg/60 p-4">
						{@render ring(aderencia, 'var(--color-brand)')}
						<div class="min-w-0">
							<div class="text-sm font-semibold text-navy">Aderência aos hábitos</div>
							<div class="mt-0.5 text-xs text-grey">
								{#if totalHabitos}{habitFeitos} de {possiveis} dias possíveis · {taxaAcerto}% de acerto{:else}Nenhum hábito neste mês{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Por hábito -->
				{#if habitStats.length}
					<div class="mt-4">
						<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Por hábito</div>
						<div class="space-y-2">
							{#each habitStats as h (h.id)}
								<div class="flex items-center gap-3 text-xs">
									<span class="w-32 shrink-0 truncate text-navy" title={h.nome}>{h.nome}</span>
									<div class="h-2 flex-1 overflow-hidden rounded-full bg-bg">
										<div class="h-full rounded-full bg-brand transition-all duration-500" style="width: {h.pct}%"></div>
									</div>
									<span class="w-14 shrink-0 text-right tabular-nums text-grey">{h.feitos}/{diasDecorridos}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

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
									<!-- +/- de progresso só quando o alvo é maior que 1 (senão o
									     círculo de concluir já resolve a meta binária). -->
									{#if m.alvo > 1}
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
									{/if}
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
		<div class="pt-2">
			<div class="mb-3 flex items-center gap-2 border-t border-grey-200 pt-5">
				<Icon name="clipboard" size={18} class="text-brand" />
				<h2 class="text-base font-bold text-navy">Habit Tracker</h2>
				<span class="text-xs text-grey capitalize">— {organyze.mesMetaLabel}</span>
			</div>

			<!-- Adicionar hábito -->
			<div class="mb-3 flex gap-2">
				<input
					class="h-10 w-full max-w-sm rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
					placeholder="Novo hábito (ex.: Bíblia, Água, Treino)…"
					bind:value={novoHabito}
					onkeydown={(e) => e.key === 'Enter' && adicionarHabito()}
				/>
				<Button onclick={adicionarHabito} disabled={!novoHabito.trim()}>
					<Plus size={18} /> Adicionar
				</Button>
			</div>

			{#if organyze.loadingHabitos}
				<div class="flex justify-center py-12 text-grey">
					<span class="size-7 rounded-full border-2 border-grey-200 border-t-brand animate-spin"
					></span>
				</div>
			{:else if organyze.habitos.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-grey-200 py-12 text-center"
				>
					<div class="grid size-11 place-items-center rounded-full bg-bg text-grey mb-3">
						<Icon name="check" size={20} />
					</div>
					<p class="text-sm font-medium text-navy">Nenhum hábito neste mês</p>
					<p class="text-xs text-grey mt-1">Adicione o primeiro hábito acima.</p>
				</div>
			{:else}
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each organyze.habitos as h (h.id)}
						{@const feitos = Object.values(h.dias).filter((v) => v === 'feito').length}
						<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-3 shadow-xs">
							<!-- Cabeçalho do hábito -->
							<div class="mb-2 flex items-center gap-1.5">
								{#if editHabId === h.id}
									<input
										class="h-7 min-w-0 flex-1 rounded-md border border-brand bg-surface px-2 text-sm font-semibold text-navy outline-none"
										bind:value={eHabNome}
										onkeydown={(e) => {
											if (e.key === 'Enter') salvarHabito();
											if (e.key === 'Escape') editHabId = null;
										}}
										onblur={salvarHabito}
									/>
								{:else}
									<h3 class="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wide text-navy">
										{h.nome}
									</h3>
									<span
										class="shrink-0 rounded-full bg-brand-green/12 px-1.5 py-0.5 text-[10px] font-semibold text-brand-green tabular-nums"
										title="Dias feitos"
									>
										{feitos}
									</span>
									<button
										class="grid size-6 shrink-0 place-items-center rounded text-grey hover:bg-bg hover:text-navy transition-colors"
										aria-label="Renomear hábito"
										onclick={() => abrirEdHabito(h.id, h.nome)}
									>
										<Pencil size={13} />
									</button>
									<button
										class="grid size-6 shrink-0 place-items-center rounded text-grey hover:bg-brand-danger/10 hover:text-brand-danger transition-colors"
										aria-label="Excluir hábito"
										onclick={() => organyze.removeHabito(h.id)}
									>
										<Trash2 size={13} />
									</button>
								{/if}
							</div>

							<!-- Grade de dias -->
							<div class="grid grid-cols-7 gap-1">
								{#each diasDoMes as d (d)}
									{@const st = h.dias[String(d)]}
									<button
										class="relative grid aspect-square place-items-center rounded-md border text-[11px] font-semibold tabular-nums transition-colors"
										class:border-grey-200={!st}
										class:bg-surface={!st}
										class:text-slate={!st}
										class:hover:bg-bg={!st}
										class:border-transparent={!!st}
										class:bg-brand-green={st === 'feito'}
										class:bg-brand-danger={st === 'falhou'}
										class:text-white={!!st}
										class:ring-2={hojeDia === d}
										class:ring-brand={hojeDia === d}
										class:ring-offset-1={hojeDia === d}
										title={`Dia ${d}${st ? ` — ${st === 'feito' ? 'feito' : 'não feito'}` : ''}`}
										onclick={() => organyze.marcarDia(h.id, d)}
									>
										{d}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-grey">
					<span class="inline-flex items-center gap-1.5">
						<span class="size-3 rounded bg-brand-green"></span> Feito
					</span>
					<span class="inline-flex items-center gap-1.5">
						<span class="size-3 rounded bg-brand-danger"></span> Não feito
					</span>
					<span>Clique num dia para alternar (vazio → feito → não feito).</span>
				</p>
			{/if}
		</div>
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
