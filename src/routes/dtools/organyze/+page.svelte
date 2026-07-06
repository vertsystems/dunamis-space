<script lang="ts">
	import { organyze, toISODate } from '$lib/organyze/store.svelte';
	import {
		corPrioridade,
		proximaPrioridade,
		prazoOrdem,
		urgencia,
		STATUS_ORDEM,
		PRIORIDADES
	} from '$lib/organyze/types';
	import type { Status, Tarefa } from '$lib/organyze/types';
	import { Button, Modal } from '$lib/components/ui';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import RichText from '$lib/components/organyze/RichText.svelte';
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
	let novoPrazo = $state('');
	let mostrarPrazoNovo = $state(false);
	let dragId = $state<string | null>(null);
	let dragOver = $state<Status | null>(null);

	// Modal de edição
	let modalId = $state<string | null>(null);
	let mTitulo = $state('');
	let novaSub = $state('');
	const modalTarefa = $derived(organyze.tarefas.find((t) => t.id === modalId) ?? null);

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

	const SECAO_META: Record<Status, { label: string; cor: string }> = {
		em_execucao: { label: 'Em execução', cor: 'var(--color-brand)' },
		nao_iniciado: { label: 'Não iniciado', cor: 'var(--color-grey)' },
		concluida: { label: 'Concluídas', cor: 'var(--color-brand-green)' }
	};

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

	// Agrupa por status. Ativas (em execução / não iniciado) ordenadas por urgência;
	// concluídas por posição.
	const grupos = $derived.by(() => {
		const by = (s: Status) => organyze.tarefas.filter((t) => t.status === s);
		const urg = (arr: Tarefa[]) =>
			[...arr].sort((a, b) => prazoOrdem(a) - prazoOrdem(b) || a.posicao - b.posicao);
		return {
			em_execucao: urg(by('em_execucao')),
			nao_iniciado: urg(by('nao_iniciado')),
			concluida: [...by('concluida')].sort((a, b) => a.posicao - b.posicao)
		} as Record<Status, Tarefa[]>;
	});

	function adicionar() {
		if (organyze.addTarefa(novoTitulo, novoPrazo || null)) {
			novoTitulo = '';
			novoPrazo = '';
			mostrarPrazoNovo = false;
		}
	}

	// ---- Modal ----
	function abrirModal(t: Tarefa) {
		modalId = t.id;
		mTitulo = t.titulo;
	}
	function fecharModal() {
		if (modalId && mTitulo.trim() && mTitulo.trim() !== modalTarefa?.titulo) {
			organyze.editTarefa(modalId, mTitulo);
		}
		modalId = null;
	}
	function excluirDoModal() {
		if (modalId) organyze.removeTarefa(modalId);
		modalId = null;
	}

	// ---- Drag & drop entre seções ----
	function moverPara(alvoStatus: Status, alvoId: string | null) {
		const from = dragId;
		dragId = null;
		dragOver = null;
		if (!from) return;
		// Lista completa (todas as seções, na ordem visível) sem a tarefa arrastada.
		const lista = STATUS_ORDEM.flatMap((s) =>
			grupos[s].filter((t) => t.id !== from).map((t) => ({ id: t.id, status: s }))
		);
		const item = { id: from, status: alvoStatus };
		if (alvoId && alvoId !== from) {
			const idx = lista.findIndex((x) => x.id === alvoId);
			lista.splice(idx < 0 ? lista.length : idx, 0, item);
		} else {
			// Soltou na seção (sem tarefa específica): coloca ao final do grupo.
			const last = lista.map((x) => x.status).lastIndexOf(alvoStatus);
			if (last >= 0) lista.splice(last + 1, 0, item);
			else {
				const oi = STATUS_ORDEM.indexOf(alvoStatus);
				let at = lista.length;
				for (let i = 0; i < lista.length; i++) {
					if (STATUS_ORDEM.indexOf(lista[i].status) > oi) {
						at = i;
						break;
					}
				}
				lista.splice(at, 0, item);
			}
		}
		organyze.aplicarQuadro(lista);
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
	<div class="max-w-2xl space-y-4">
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

		<!-- Adicionar tarefa (com opção de prazo) -->
		<div class="space-y-2">
			<div class="flex gap-2">
				<input
					class="h-11 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-4 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
					placeholder="O que precisa ser feito?"
					bind:value={novoTitulo}
					onkeydown={(e) => e.key === 'Enter' && adicionar()}
				/>
				<button
					class="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] border transition-colors"
					class:border-grey-200={!mostrarPrazoNovo && !novoPrazo}
					class:text-grey={!mostrarPrazoNovo && !novoPrazo}
					class:border-brand={mostrarPrazoNovo || novoPrazo}
					class:text-brand={mostrarPrazoNovo || novoPrazo}
					class:bg-brand={false}
					title="Definir prazo de entrega (opcional)"
					aria-label="Definir prazo de entrega"
					onclick={() => (mostrarPrazoNovo = !mostrarPrazoNovo)}
				>
					<CalendarClock size={18} />
				</button>
				<Button onclick={adicionar} disabled={!novoTitulo.trim()}>
					<Plus size={18} /> Adicionar
				</Button>
			</div>
			{#if mostrarPrazoNovo}
				<div class="flex items-center gap-2 px-1">
					<span class="text-xs font-medium text-grey">Prazo de entrega:</span>
					<input
						type="date"
						bind:value={novoPrazo}
						class="h-8 rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-xs text-navy outline-none focus-visible:border-brand [color-scheme:light]"
					/>
					{#if novoPrazo}
						<button
							class="text-xs font-medium text-grey hover:text-brand-danger"
							onclick={() => (novoPrazo = '')}>limpar</button
						>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Snippet de card de tarefa -->
		{#snippet taskRow(t: Tarefa)}
			{@const u = urgencia(t.prazo, hojeStr)}
			<li
				draggable="true"
				ondragstart={() => (dragId = t.id)}
				ondragover={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
				ondrop={(e) => {
					e.stopPropagation();
					moverPara(t.status, t.id);
				}}
				class="group flex items-start gap-2.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-3 shadow-xs transition-colors hover:border-grey"
				class:opacity-60={t.status === 'concluida'}
			>
				<span
					class="mt-0.5 cursor-grab text-grey/50 hover:text-grey active:cursor-grabbing"
					aria-hidden="true"
				>
					<GripVertical size={18} />
				</span>

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
					class:border-grey-200={t.status !== 'concluida'}
					class:border-brand={t.status === 'concluida'}
					class:bg-brand={t.status === 'concluida'}
					class:text-white={t.status === 'concluida'}
					aria-label={t.status === 'concluida' ? 'Reabrir tarefa' : 'Concluir tarefa'}
					onclick={() => organyze.toggle(t.id)}
				>
					{#if t.status === 'concluida'}<Check size={13} strokeWidth={3} />{/if}
				</button>

				<!-- Conteúdo (clique abre modal) -->
				<button class="min-w-0 flex-1 text-left" onclick={() => abrirModal(t)}>
					<span
						class="block text-sm transition-colors"
						class:text-navy={t.status !== 'concluida'}
						class:text-grey={t.status === 'concluida'}
						class:line-through={t.status === 'concluida'}
					>
						{t.titulo}
					</span>
					{#if t.prazo || t.subtarefas.length}
						<span class="mt-1.5 flex flex-wrap items-center gap-1.5">
							{#if t.prazo}
								<span
									class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
									style="border-color: {u ? u.cor + '66' : 'var(--color-grey-200)'}; color: {u
										? u.cor
										: 'var(--color-grey)'}"
								>
									<CalendarClock size={12} />
									{u ? u.label : t.prazo}
								</span>
							{/if}
							{#if t.subtarefas.length}
								<span
									class="inline-flex items-center gap-1 rounded-full border border-grey-200 px-2 py-0.5 text-[11px] font-medium text-grey"
								>
									<Check size={11} />
									{t.subtarefas.filter((s) => s.feita).length}/{t.subtarefas.length}
								</span>
							{/if}
						</span>
					{/if}
				</button>

				<!-- Excluir rápido -->
				<button
					class="grid size-8 shrink-0 place-items-center rounded-md text-grey opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover:opacity-100"
					aria-label="Excluir tarefa"
					onclick={() => organyze.removeTarefa(t.id)}
				>
					<Trash2 size={16} />
				</button>
			</li>
		{/snippet}

		<!-- Lista / quadro -->
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
			{#each STATUS_ORDEM as s (s)}
				<section
					class="space-y-2 rounded-[var(--radius-lg)] p-1 transition-colors"
					class:bg-brand-50={dragOver === s}
					style={dragOver === s ? 'background: rgba(59,110,246,0.06)' : ''}
					ondragover={(e) => {
						e.preventDefault();
						dragOver = s;
					}}
					ondragleave={() => dragOver === s && (dragOver = null)}
					ondrop={() => moverPara(s, null)}
					role="list"
				>
					<div class="flex items-center gap-2 px-2 pt-1">
						<span class="size-2 rounded-full" style="background: {SECAO_META[s].cor}"></span>
						<h2 class="text-xs font-semibold uppercase tracking-wider text-grey">
							{SECAO_META[s].label}
							<span class="text-grey/70 tabular-nums">({grupos[s].length})</span>
						</h2>
						{#if s === 'concluida' && grupos[s].length}
							<button
								class="ml-auto text-xs font-semibold text-grey hover:text-brand-danger transition-colors"
								onclick={() => organyze.limparConcluidas()}
							>
								Limpar
							</button>
						{/if}
					</div>

					{#if grupos[s].length}
						<ul class="space-y-2">
							{#each grupos[s] as t (t.id)}
								{@render taskRow(t)}
							{/each}
						</ul>
					{:else}
						<div
							class="rounded-[var(--radius)] border border-dashed border-grey-200 py-4 text-center text-[11px] text-grey/80"
						>
							Arraste tarefas para cá
						</div>
					{/if}
				</section>
			{/each}
		{/if}
	</div>
{/if}

<!-- ===== Modal de edição da tarefa ===== -->
<Modal open={modalId !== null} title="Editar tarefa" size="md" onClose={fecharModal}>
	{#if modalTarefa}
		{@const u = urgencia(modalTarefa.prazo, hojeStr)}
		<div class="space-y-5">
			<!-- Título -->
			<div>
				<label for="m-titulo" class="mb-1.5 block text-sm font-medium text-navy">Título</label>
				<input
					id="m-titulo"
					class="h-11 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
					bind:value={mTitulo}
					onblur={() => modalId && mTitulo.trim() && organyze.editTarefa(modalId, mTitulo)}
				/>
			</div>

			<!-- Situação -->
			<div>
				<span class="mb-1.5 block text-sm font-medium text-navy">Situação</span>
				<div class="grid grid-cols-3 gap-2">
					{#each STATUS_ORDEM as s (s)}
						<button
							class="rounded-[var(--radius)] border px-2 py-2 text-xs font-semibold transition-colors"
							class:border-grey-200={modalTarefa.status !== s}
							class:text-slate={modalTarefa.status !== s}
							class:bg-bg={modalTarefa.status !== s}
							style={modalTarefa.status === s
								? `border-color:${SECAO_META[s].cor}; color:${SECAO_META[s].cor}; background:${SECAO_META[s].cor}14`
								: ''}
							onclick={() => modalId && organyze.setStatus(modalId, s)}
						>
							{SECAO_META[s].label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Prioridade -->
			<div>
				<span class="mb-1.5 block text-sm font-medium text-navy">Prioridade</span>
				<div class="grid grid-cols-3 gap-2">
					{#each PRIORIDADES as p (p.valor)}
						<button
							class="flex items-center justify-center gap-2 rounded-[var(--radius)] border px-2 py-2 text-xs font-semibold transition-colors"
							class:border-grey-200={modalTarefa.prioridade !== p.valor}
							class:text-slate={modalTarefa.prioridade !== p.valor}
							class:bg-bg={modalTarefa.prioridade !== p.valor}
							style={modalTarefa.prioridade === p.valor
								? `border-color:${p.cor}; color:${p.cor}; background:${p.cor}14`
								: ''}
							onclick={() => modalId && organyze.setPrioridade(modalId, p.valor)}
						>
							<span class="size-2.5 rounded-full" style="background: {p.cor}"></span>
							{p.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Prazo -->
			<div>
				<span class="mb-1.5 block text-sm font-medium text-navy">Prazo de entrega</span>
				<div class="flex items-center gap-2">
					<div
						class="inline-flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2"
						style="border-color: {u ? u.cor + '66' : 'var(--color-grey-200)'}"
					>
						<CalendarClock size={16} style="color: {u ? u.cor : 'var(--color-grey)'}" />
						<input
							type="date"
							value={modalTarefa.prazo ?? ''}
							onchange={(e) => modalId && organyze.setPrazo(modalId, e.currentTarget.value || null)}
							class="bg-transparent text-sm text-navy outline-none [color-scheme:light]"
						/>
					</div>
					{#if u && u.status !== 'futura'}
						<span class="text-xs font-semibold" style="color: {u.cor}">{u.label}</span>
					{/if}
					{#if modalTarefa.prazo}
						<button
							class="text-xs font-medium text-grey hover:text-brand-danger"
							onclick={() => modalId && organyze.setPrazo(modalId, null)}>remover</button
						>
					{/if}
				</div>
			</div>

			<!-- Descrição (editor leve) -->
			<div>
				<span class="mb-1.5 block text-sm font-medium text-navy">Descrição</span>
				{#key modalTarefa.id}
					<RichText
						value={modalTarefa.descricao}
						onSave={(html) => modalId && organyze.setDescricao(modalId, html)}
					/>
				{/key}
			</div>

			<!-- Subtarefas -->
			<div>
				<div class="mb-1.5 flex items-center justify-between">
					<span class="text-sm font-medium text-navy">Subtarefas</span>
					{#if modalTarefa.subtarefas.length}
						<span class="text-xs text-grey tabular-nums">
							{modalTarefa.subtarefas.filter((s) => s.feita).length}/{modalTarefa.subtarefas.length}
						</span>
					{/if}
				</div>

				{#if modalTarefa.subtarefas.length}
					<ul class="mb-2 space-y-1.5">
						{#each modalTarefa.subtarefas as s (s.id)}
							<li
								class="group/sub flex items-center gap-2.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-2"
							>
								<button
									class="grid size-4 shrink-0 place-items-center rounded border-2 transition-colors"
									class:border-grey-200={!s.feita}
									class:border-brand={s.feita}
									class:bg-brand={s.feita}
									class:text-white={s.feita}
									aria-label={s.feita ? 'Desmarcar subtarefa' : 'Concluir subtarefa'}
									onclick={() => modalId && organyze.toggleSubtarefa(modalId, s.id)}
								>
									{#if s.feita}<Check size={10} strokeWidth={3} />{/if}
								</button>
								<input
									class="flex-1 bg-transparent text-sm outline-none"
									class:text-grey={s.feita}
									class:line-through={s.feita}
									class:text-navy={!s.feita}
									value={s.titulo}
									onchange={(e) =>
										modalId && organyze.editSubtarefa(modalId, s.id, e.currentTarget.value)}
								/>
								<button
									class="grid size-7 shrink-0 place-items-center rounded-md text-grey opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover/sub:opacity-100"
									aria-label="Excluir subtarefa"
									onclick={() => modalId && organyze.removeSubtarefa(modalId, s.id)}
								>
									<Trash2 size={14} />
								</button>
							</li>
						{/each}
					</ul>
				{/if}

				<div class="flex gap-2">
					<input
						class="h-9 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy-900 outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
						placeholder="Adicionar subtarefa…"
						bind:value={novaSub}
						onkeydown={(e) => {
							if (e.key === 'Enter' && modalId && novaSub.trim()) {
								organyze.addSubtarefa(modalId, novaSub);
								novaSub = '';
							}
						}}
					/>
					<button
						class="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] bg-brand text-white transition-all hover:brightness-105 active:scale-95 disabled:opacity-50"
						aria-label="Adicionar subtarefa"
						disabled={!novaSub.trim()}
						onclick={() => {
							if (modalId && novaSub.trim()) {
								organyze.addSubtarefa(modalId, novaSub);
								novaSub = '';
							}
						}}
					>
						<Plus size={16} />
					</button>
				</div>
			</div>

			<!-- Ações -->
			<div class="flex items-center justify-between border-t border-grey-200 pt-4">
				<Button variant="danger" size="sm" onclick={excluirDoModal}>
					<Trash2 size={15} /> Excluir
				</Button>
				<Button variant="secondary" size="sm" onclick={fecharModal}>Concluir edição</Button>
			</div>
		</div>
	{/if}
</Modal>

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
