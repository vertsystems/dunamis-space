<script lang="ts">
	import { browser } from '$app/environment';
	import {
		organyze,
		toISODate,
		inicioSemana,
		fimSemana,
		inicioMes
	} from '$lib/organyze/store.svelte';
	import {
		corPrioridadeEfetiva,
		prazoUrgente,
		proximaPrioridade,
		prazoOrdem,
		urgencia,
		STATUS_ORDEM,
		PRIORIDADES,
		CATEGORIAS,
		CATEGORIA_LABEL,
		CATEGORIA_COR
	} from '$lib/organyze/types';
	import type { Modo } from '$lib/organyze/store.svelte';
	import type { Categoria, Status, Tarefa } from '$lib/organyze/types';
	import { Button, Modal } from '$lib/components/ui';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import RichText from '$lib/components/organyze/RichText.svelte';
	import {
		ChevronLeft,
		ChevronRight,
		Plus,
		Trash2,
		Copy,
		Check,
		GripVertical,
		CalendarClock,
		CalendarDays,
		CalendarRange,
		LayoutGrid,
		LogOut,
		Rows3,
		Columns2
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let novoTitulo = $state('');
	let novoPrazo = $state('');
	let novoLado = $state<Categoria>('empresa');
	let mostrarPrazoNovo = $state(false);
	let dragId = $state<string | null>(null);
	// Destino da solta: lado (coluna) + seção + índice de inserção (onde o slot abre).
	let dropCat = $state<Categoria | null>(null);
	let dropStatus = $state<Status | null>(null);
	let dropIndex = $state<number | null>(null);

	// Modal de edição
	let modalId = $state<string | null>(null);
	let mTitulo = $state('');
	let novaSub = $state('');
	// Drag-and-drop das subtarefas (dentro do modal).
	let subDragId = $state<string | null>(null);
	let subDropIndex = $state<number | null>(null);
	const modalTarefa = $derived(organyze.tarefas.find((t) => t.id === modalId) ?? null);

	// Modo de visualização do modal: 'compacto' (empilhado) | 'amplo' (janela larga, 3 colunas).
	// A escolha do usuário fica salva no localStorage e é lida já na criação do
	// componente (sem "flash"), então o modal sempre reabre no modo escolhido.
	type ModalLayout = 'compacto' | 'amplo';
	const LAYOUT_KEY = 'organyze:modalLayout';
	function lerLayoutSalvo(): ModalLayout {
		if (!browser) return 'compacto';
		return localStorage.getItem(LAYOUT_KEY) === 'amplo' ? 'amplo' : 'compacto';
	}
	let modalLayout = $state<ModalLayout>(lerLayoutSalvo());
	function setModalLayout(l: ModalLayout) {
		modalLayout = l;
		if (browser) localStorage.setItem(LAYOUT_KEY, l);
	}

	$effect(() => {
		if (data.supabase) organyze.init(data.supabase, (data.perfil?.id as string | undefined) ?? null);
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
	function colabById(id: string) {
		return organyze.colaboradores.find((c) => c.id === id) ?? null;
	}

	const SECAO_META: Record<Status, { label: string; cor: string }> = {
		em_execucao: { label: 'Em execução', cor: 'var(--color-brand)' },
		nao_iniciado: { label: 'Não iniciado', cor: 'var(--color-grey)' },
		concluida: { label: 'Concluídas', cor: 'var(--color-brand-green)' }
	};

	// Atalhos de prazo (dias a partir de hoje).
	const PRAZO_ATALHOS = [3, 5, 7, 10];
	function prazoEmDias(n: number): string {
		const d = new Date();
		d.setDate(d.getDate() + n);
		return toISODate(d);
	}

	/** Estilo do botão de situação: tom leve sempre; destaque forte quando selecionado. */
	function situacaoStyle(s: Status, sel: boolean): string {
		const c = SECAO_META[s].cor;
		const mix = (pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
		return sel
			? `border-color:${c}; color:${c}; background:${mix(18)}; box-shadow: inset 0 0 0 1px ${c}`
			: `border-color:${mix(40)}; color:${c}; background:${mix(10)}`;
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

	// ---- Modos de visualização (Dia / Semana / Mês) ----
	const MODOS = [
		{ v: 'dia' as Modo, label: 'Dia', icon: CalendarDays },
		{ v: 'semana' as Modo, label: 'Semana', icon: CalendarRange },
		{ v: 'mes' as Modo, label: 'Mês', icon: LayoutGrid }
	];

	function fmtDiaMes(iso: string): string {
		const [, m, d] = iso.split('-');
		return `${d}/${m}`;
	}
	function parseISO(iso: string): Date {
		const [y, m, d] = iso.split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	const periodoLabel = $derived.by(() => {
		if (organyze.modo === 'semana') {
			return `${fmtDiaMes(inicioSemana(organyze.dia))} – ${fmtDiaMes(fimSemana(organyze.dia))}`;
		}
		if (organyze.modo === 'mes') {
			return parseISO(organyze.dia).toLocaleDateString('pt-BR', {
				month: 'long',
				year: 'numeric'
			});
		}
		return rotuloDia.rel ?? rotuloDia.ext;
	});

	const ordAtivas = (arr: Tarefa[]) =>
		[...arr].sort((a, b) => prazoOrdem(a) - prazoOrdem(b) || a.posicao - b.posicao);

	// Semana: 7 dias com suas tarefas.
	const diasSemana = $derived.by(() => {
		const [y, m, d] = inicioSemana(organyze.dia).split('-').map(Number);
		return Array.from({ length: 7 }, (_, i) => {
			const dt = new Date(y, m - 1, d + i);
			const iso = toISODate(dt);
			return { iso, dt, tarefas: ordAtivas(organyze.tarefas.filter((t) => t.data === iso)) };
		});
	});

	// Mês: grade de semanas (segunda a domingo) cobrindo o mês.
	const semanasMes = $derived.by(() => {
		const mesFoco = Number(organyze.dia.split('-')[1]);
		const [y, m, d] = inicioSemana(inicioMes(organyze.dia)).split('-').map(Number);
		const cells = Array.from({ length: 42 }, (_, i) => {
			const dt = new Date(y, m - 1, d + i);
			const iso = toISODate(dt);
			return {
				iso,
				dia: dt.getDate(),
				noMes: dt.getMonth() + 1 === mesFoco,
				tarefas: organyze.tarefas.filter((t) => t.data === iso)
			};
		});
		const semanas = [];
		for (let i = 0; i < 42; i += 7) semanas.push(cells.slice(i, i + 7));
		return semanas.filter((w) => w.some((c) => c.noMes));
	});

	const DOW = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

	function abrirDia(iso: string) {
		organyze.dia = iso;
		organyze.setModo('dia');
	}

	// Agrupa por lado (categoria) e status. Ordena pela POSIÇÃO manual (o usuário
	// reordena arrastando para cima/baixo, e a ordem "gruda"). O prazo continua
	// visível como etiqueta/urgência, mas não manda mais na ordem. Modo Dia.
	function gruposLado(cat: Categoria): Record<Status, Tarefa[]> {
		const by = (s: Status) =>
			organyze.tarefasDia
				.filter((t) => t.status === s && t.categoria === cat)
				.sort((a, b) => a.posicao - b.posicao);
		return {
			em_execucao: by('em_execucao'),
			nao_iniciado: by('nao_iniciado'),
			concluida: by('concluida')
		} as Record<Status, Tarefa[]>;
	}
	const totalLado = (cat: Categoria) =>
		organyze.tarefasDia.filter((t) => t.categoria === cat).length;

	function adicionar() {
		if (organyze.addTarefa(novoTitulo, novoPrazo || null, novoLado)) {
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
	function duplicarDoModal() {
		if (modalId) organyze.duplicarTarefa(modalId);
		modalId = null;
	}

	// ---- Drag & drop entre lados/seções ----
	function limparDrag() {
		dragId = null;
		dropCat = null;
		dropStatus = null;
		dropIndex = null;
	}

	/**
	 * Calcula onde o slot deve abrir na seção (lado `cat`, status `s`): percorre os
	 * cards reais (`[data-card]`, que exclui o arrastado) e acha o índice de inserção
	 * pelo ponto médio de cada um. O placeholder tem pointer-events:none e não conta
	 * como card, então o ponteiro nunca "escapa" e não há tremor.
	 */
	function calcDrop(e: DragEvent, cat: Categoria, s: Status) {
		e.preventDefault();
		if (!dragId) return;
		const alvo = e.currentTarget as HTMLElement;
		const cards = [...alvo.querySelectorAll<HTMLElement>('[data-card]')];
		let idx = cards.length;
		for (let i = 0; i < cards.length; i++) {
			const r = cards[i].getBoundingClientRect();
			if (e.clientY < r.top + r.height / 2) {
				idx = i;
				break;
			}
		}
		dropCat = cat;
		dropStatus = s;
		dropIndex = idx;
	}

	/** Some com o indicador ao sair de fato da seção (não ao trocar de card interno). */
	function aoSairSecao(e: DragEvent, cat: Categoria, s: Status) {
		if (dropCat !== cat || dropStatus !== s) return;
		const para = e.relatedTarget;
		if (para instanceof Node && (e.currentTarget as HTMLElement).contains(para)) return;
		dropCat = null;
		dropStatus = null;
		dropIndex = null;
	}

	function soltar(cat: Categoria, s: Status) {
		const from = dragId;
		const idx = dropCat === cat && dropStatus === s ? dropIndex : null;
		limparDrag();
		if (!from) return;
		// Lista completa (todos os lados/seções, na ordem visível) reinserindo o
		// arrastado na posição `idx` do grupo de destino. O lado do arrastado passa a
		// ser `cat` (arrastar entre colunas troca de lado).
		const lista: { id: string; status: Status; categoria: Categoria }[] = [];
		for (const c of CATEGORIAS) {
			const g = gruposLado(c);
			for (const st of STATUS_ORDEM) {
				const cards = g[st].filter((t) => t.id !== from);
				if (c === cat && st === s) {
					const at = idx == null ? cards.length : Math.min(idx, cards.length);
					cards.forEach((t, i) => {
						if (i === at) lista.push({ id: from, status: s, categoria: cat });
						lista.push({ id: t.id, status: st, categoria: c });
					});
					if (at >= cards.length) lista.push({ id: from, status: s, categoria: cat });
				} else {
					cards.forEach((t) => lista.push({ id: t.id, status: st, categoria: c }));
				}
			}
		}
		organyze.aplicarQuadro(lista);
	}

	// ---- Drag & drop das subtarefas ----
	function calcDropSub(e: DragEvent) {
		e.preventDefault();
		if (!subDragId) return;
		const alvo = e.currentTarget as HTMLElement;
		const items = [...alvo.querySelectorAll<HTMLElement>('[data-sub]')];
		let idx = items.length;
		for (let i = 0; i < items.length; i++) {
			const r = items[i].getBoundingClientRect();
			if (e.clientY < r.top + r.height / 2) {
				idx = i;
				break;
			}
		}
		subDropIndex = idx;
	}
	function soltarSub() {
		const from = subDragId;
		const idx = subDropIndex;
		subDragId = null;
		subDropIndex = null;
		if (from && modalId && idx != null) organyze.reordenarSubtarefa(modalId, from, idx);
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
	<div class="flex max-w-3xl flex-col items-start px-4 py-10">
		<div class="mb-10 text-left">
			<h1 class="text-3xl font-bold text-navy">Quem é você?</h1>
			<p class="mt-2 text-slate">Escolha seu perfil para ver as suas tarefas.</p>
		</div>

		{#if organyze.colaboradores.length === 0}
			<p class="text-sm text-grey">Nenhum colaborador ativo encontrado.</p>
		{:else}
			<div class="flex flex-wrap items-start justify-start gap-x-6 gap-y-8">
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
	<div class="max-w-4xl space-y-4">
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

		<!-- Período + modos de visualização -->
		<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-5 shadow-xs">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<!-- Seletor de modo -->
				<div class="inline-flex rounded-[var(--radius)] bg-bg p-0.5">
					{#each MODOS as mo (mo.v)}
						{@const Ico = mo.icon}
						<button
							class="inline-flex items-center gap-1.5 rounded-[calc(var(--radius)-0.15rem)] px-3 py-1.5 text-xs font-semibold transition-colors"
							class:bg-surface={organyze.modo === mo.v}
							class:text-navy={organyze.modo === mo.v}
							class:shadow-xs={organyze.modo === mo.v}
							class:text-grey={organyze.modo !== mo.v}
							onclick={() => organyze.setModo(mo.v)}
						>
							<Ico size={15} />
							{mo.label}
						</button>
					{/each}
				</div>
				<!-- Navegação do período -->
				<div class="flex items-center gap-1">
					<button
						class="grid size-8 place-items-center rounded-full text-grey hover:bg-bg hover:text-navy transition-colors"
						aria-label="Anterior"
						onclick={() => organyze.passar(-1)}
					>
						<ChevronLeft size={18} />
					</button>
					<div class="min-w-[9rem] text-center text-sm font-semibold text-navy capitalize">
						{periodoLabel}
					</div>
					<button
						class="grid size-8 place-items-center rounded-full text-grey hover:bg-bg hover:text-navy transition-colors"
						aria-label="Próximo"
						onclick={() => organyze.passar(1)}
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{#if organyze.dia !== hojeStr}
				<button
					class="mt-3 text-xs font-semibold text-brand hover:underline"
					onclick={() => organyze.irParaHoje()}
				>
					← Voltar para hoje
				</button>
			{/if}

			{#if organyze.modo === 'dia' && organyze.total > 0}
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

		<!-- Adicionar tarefa (com opção de prazo) — só no modo Dia -->
		{#if organyze.modo === 'dia'}
		<div class="space-y-2">
			<!-- Lado da nova tarefa: Empresa | Vida Pessoal -->
			<div class="inline-flex rounded-[var(--radius)] border border-grey-200 bg-surface p-0.5">
				{#each CATEGORIAS as cat (cat)}
					<button
						class="rounded-[calc(var(--radius)-3px)] px-3 py-1 text-xs font-semibold transition-colors"
						class:text-white={novoLado === cat}
						class:text-grey={novoLado !== cat}
						style:background={novoLado === cat ? CATEGORIA_COR[cat] : 'transparent'}
						onclick={() => (novoLado = cat)}
					>
						{CATEGORIA_LABEL[cat]}
					</button>
				{/each}
			</div>
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
		{/if}

		<!-- Slot de encaixe (placeholder) exibido no destino da solta. -->
		{#snippet slot()}
			<li
				class="pointer-events-none flex h-14 items-center justify-center rounded-[var(--radius)] border-2 border-dashed border-brand bg-brand-50 text-xs font-semibold text-brand"
				style="animation: slotIn 160ms ease-out"
			>
				Soltar aqui
			</li>
		{/snippet}

		<!-- Snippet de card de tarefa -->
		{#snippet taskRow(t: Tarefa)}
			{@const u = urgencia(t.prazo, hojeStr)}
			{@const sendo = dragId === t.id}
			{@const fundo = dragId !== null && !sendo}
			<li
				data-card={sendo ? undefined : ''}
				draggable="true"
				ondragstart={() => (dragId = t.id)}
				ondragend={limparDrag}
				class="group relative flex items-start gap-2.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-3 shadow-xs transition-[transform,filter,opacity,box-shadow] duration-200 ease-out hover:border-grey"
				class:z-20={sendo}
				class:shadow-xl={sendo}
				class:opacity-60={t.status === 'concluida' && !sendo}
				style:transform={sendo ? 'scale(1.05)' : undefined}
				style:filter={fundo ? 'blur(2px)' : undefined}
				style:opacity={sendo ? '0.45' : fundo ? '0.55' : undefined}
			>
				<span
					class="mt-0.5 cursor-grab text-grey/50 hover:text-grey active:cursor-grabbing"
					aria-hidden="true"
				>
					<GripVertical size={18} />
				</span>

				<!-- Prioridade (clique cicla). Fica vermelha quando o prazo está chegando. -->
				<button
					class="mt-1 size-3 shrink-0 rounded-full ring-2 ring-transparent transition-all hover:ring-grey-200"
					style="background: {corPrioridadeEfetiva(t.prioridade, t.prazo, hojeStr)}"
					title={prazoUrgente(t.prazo, hojeStr)
						? `Prioridade: ${t.prioridade} · prazo chegando`
						: `Prioridade: ${t.prioridade}`}
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
					{#if t.prazo || t.subtarefas.length || t.responsaveis.length}
						<span class="mt-1.5 flex flex-wrap items-center gap-1.5">
							{#if t.responsaveis.length}
								<span class="mr-0.5 flex items-center -space-x-1.5">
									{#each t.responsaveis as rid (rid)}
										{@const rc = colabById(rid)}
										{#if rc}
											{#if rc.avatarUrl}
												<img
													src={rc.avatarUrl}
													alt={rc.nome}
													title={rc.nome}
													class="size-5 rounded-full object-cover ring-2 ring-surface"
												/>
											{:else}
												<span
													title={rc.nome}
													class="grid size-5 place-items-center rounded-full text-[9px] font-semibold text-white ring-2 ring-surface"
													style="background: {corAvatar(rc.id)}"
												>
													{iniciais(rc.nome)}
												</span>
											{/if}
										{/if}
									{/each}
								</span>
							{/if}
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

				<!-- Duplicar -->
				<button
					class="grid size-8 shrink-0 place-items-center rounded-md text-grey opacity-0 transition-all hover:bg-bg hover:text-navy group-hover:opacity-100"
					aria-label="Duplicar tarefa"
					title="Duplicar tarefa"
					onclick={() => organyze.duplicarTarefa(t.id)}
				>
					<Copy size={15} />
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

		<!-- Snippet: dia da semana (modo Semana) -->
		<!-- Snippet: linha de tarefa (modo Semana) -->
		{#snippet linhaSemana(t: Tarefa)}
			{@const u = urgencia(t.prazo, hojeStr)}
			<li class="flex items-center gap-2.5 px-4 py-2 hover:bg-bg transition-colors">
				<!-- Bolinha de concluído -->
				<button
					class="grid size-4 shrink-0 place-items-center rounded-md border-2 transition-colors"
					class:border-grey-200={t.status !== 'concluida'}
					class:border-brand={t.status === 'concluida'}
					class:bg-brand={t.status === 'concluida'}
					class:text-white={t.status === 'concluida'}
					aria-label={t.status === 'concluida' ? 'Reabrir tarefa' : 'Concluir tarefa'}
					onclick={() => organyze.toggle(t.id)}
				>
					{#if t.status === 'concluida'}<Check size={11} strokeWidth={3} />{/if}
				</button>
				<button
					class="flex min-w-0 flex-1 items-center gap-2.5 text-left"
					onclick={() => abrirModal(t)}
				>
					<span
						class="size-2 shrink-0 rounded-full"
						style="background: {corPrioridadeEfetiva(t.prioridade, t.prazo, hojeStr)}"
					></span>
					<span
						class="flex-1 truncate text-sm"
						class:text-grey={t.status === 'concluida'}
						class:line-through={t.status === 'concluida'}
						class:text-navy={t.status !== 'concluida'}>{t.titulo}</span
					>
					{#if u && u.status !== 'futura'}
						<span class="shrink-0 text-[11px] font-semibold" style="color: {u.cor}">{u.label}</span>
					{/if}
				</button>
			</li>
		{/snippet}

		{#snippet diaSemana(d: { iso: string; dt: Date; tarefas: Tarefa[] })}
			<div class="overflow-hidden rounded-[var(--radius-lg)] border border-grey-200 bg-surface shadow-xs">
				<button
					class="flex w-full items-center justify-between px-4 py-2.5 hover:bg-bg transition-colors"
					onclick={() => abrirDia(d.iso)}
				>
					<span class="flex items-baseline gap-2">
						<span
							class="text-sm font-semibold capitalize"
							class:text-brand={d.iso === hojeStr}
							class:text-navy={d.iso !== hojeStr}
						>
							{d.dt.toLocaleDateString('pt-BR', { weekday: 'long' })}
						</span>
						<span class="text-xs text-grey">{fmtDiaMes(d.iso)}</span>
					</span>
					<span class="text-xs text-grey tabular-nums">
						{d.tarefas.filter((t) => t.status === 'concluida').length}/{d.tarefas.length}
					</span>
				</button>
				{#if d.tarefas.length}
					<div class="border-t border-grey-200">
						{#each CATEGORIAS as cat (cat)}
							{@const lista = d.tarefas.filter((t) => t.categoria === cat)}
							{#if lista.length}
								<div class="flex items-center gap-1.5 bg-bg/40 px-4 pb-1 pt-2">
									<span class="size-1.5 rounded-full" style:background={CATEGORIA_COR[cat]}></span>
									<span
										class="text-[10px] font-bold uppercase tracking-wide"
										style:color={CATEGORIA_COR[cat]}>{CATEGORIA_LABEL[cat]}</span
									>
								</div>
								<ul class="divide-y divide-grey-200">
									{#each lista as t (t.id)}
										{@render linhaSemana(t)}
									{/each}
								</ul>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="border-t border-grey-200 px-4 py-3 text-xs text-grey/70">Sem tarefas</div>
				{/if}
			</div>
		{/snippet}

		<!-- Snippet: grade do mês (modo Mês) -->
		{#snippet mesGrid()}
			<div class="overflow-hidden rounded-[var(--radius-lg)] border border-grey-200 bg-surface shadow-xs">
				<div class="grid grid-cols-7 border-b border-grey-200 bg-bg">
					{#each DOW as d (d)}
						<div class="px-1 py-2 text-center text-[11px] font-semibold uppercase text-grey">
							{d}
						</div>
					{/each}
				</div>
				{#each semanasMes as semana, i (i)}
					<div class="grid grid-cols-7">
						{#each semana as cell (cell.iso)}
							<div
								class="flex min-h-[132px] flex-col gap-1 border-b border-grey-200 p-1.5 [&:not(:nth-child(7n))]:border-r"
								class:bg-bg={!cell.noMes}
							>
								<div class="flex items-center justify-between">
									<button
										class="text-xs font-semibold"
										class:grid={cell.iso === hojeStr}
										class:size-5={cell.iso === hojeStr}
										class:place-items-center={cell.iso === hojeStr}
										class:rounded-full={cell.iso === hojeStr}
										class:bg-brand={cell.iso === hojeStr}
										class:text-white={cell.iso === hojeStr}
										class:text-navy={cell.iso !== hojeStr && cell.noMes}
										class:text-grey={cell.iso !== hojeStr && !cell.noMes}
										title="Abrir dia"
										onclick={() => abrirDia(cell.iso)}
									>
										{cell.dia}
									</button>
								</div>
								<div class="flex flex-col gap-0.5">
									{#each cell.tarefas.slice(0, 4) as t (t.id)}
										<div
											class="flex items-center gap-1 rounded border-l-2 pl-1 pr-1 py-0.5 transition-colors hover:bg-surface"
											style:border-left-color={CATEGORIA_COR[t.categoria]}
											title={CATEGORIA_LABEL[t.categoria]}
										>
											<!-- Bolinha de concluído -->
											<button
												class="grid size-3 shrink-0 place-items-center rounded-[4px] border transition-colors"
												class:border-grey-200={t.status !== 'concluida'}
												class:border-brand={t.status === 'concluida'}
												class:bg-brand={t.status === 'concluida'}
												class:text-white={t.status === 'concluida'}
												aria-label={t.status === 'concluida' ? 'Reabrir tarefa' : 'Concluir tarefa'}
												onclick={() => organyze.toggle(t.id)}
											>
												{#if t.status === 'concluida'}<Check size={8} strokeWidth={3} />{/if}
											</button>
											<button
												class="flex min-w-0 flex-1 items-center text-left"
												title={t.titulo}
												onclick={() => abrirModal(t)}
											>
												<span
													class="truncate text-[11px] leading-tight"
													class:text-grey={t.status === 'concluida'}
													class:line-through={t.status === 'concluida'}
													class:text-navy={t.status !== 'concluida'}>{t.titulo}</span
												>
											</button>
										</div>
									{/each}
									{#if cell.tarefas.length > 4}
										<button
											class="px-1 text-left text-[10px] font-medium text-grey hover:text-brand"
											onclick={() => abrirDia(cell.iso)}
										>
											+{cell.tarefas.length - 4} mais
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{/snippet}

		<!-- Lista / quadro -->
		{#if organyze.loadingTarefas}
			<div class="flex justify-center py-16 text-grey">
				<span class="size-7 rounded-full border-2 border-grey-200 border-t-brand animate-spin"
				></span>
			</div>
		{:else if organyze.modo === 'dia'}
			{#if organyze.total === 0}
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
			<div class="grid gap-4 md:grid-cols-2">
				{#each CATEGORIAS as cat (cat)}
					{@const g = gruposLado(cat)}
					<div class="space-y-2">
						<!-- Cabeçalho do lado (Empresa / Vida Pessoal) -->
						<div
							class="flex items-center gap-2 rounded-[var(--radius)] px-3 py-2"
							style:background="color-mix(in srgb, {CATEGORIA_COR[cat]} 10%, transparent)"
						>
							<span class="size-2.5 rounded-full" style:background={CATEGORIA_COR[cat]}></span>
							<h2 class="text-sm font-bold" style:color={CATEGORIA_COR[cat]}>
								{CATEGORIA_LABEL[cat]}
							</h2>
							<span class="text-xs tabular-nums text-grey">({totalLado(cat)})</span>
						</div>

						{#each STATUS_ORDEM as s (s)}
							<section
								class="space-y-2 rounded-[var(--radius-lg)] p-1 transition-colors"
								class:bg-brand-50={dropCat === cat && dropStatus === s}
								ondragover={(e) => calcDrop(e, cat, s)}
								ondragleave={(e) => aoSairSecao(e, cat, s)}
								ondrop={() => soltar(cat, s)}
								role="list"
							>
								<div class="flex items-center gap-2 px-2 pt-1">
									<span class="size-2 rounded-full" style="background: {SECAO_META[s].cor}"></span>
									<h3 class="text-xs font-semibold uppercase tracking-wider text-grey">
										{SECAO_META[s].label}
										<span class="text-grey/70 tabular-nums">({g[s].length})</span>
									</h3>
									{#if s === 'concluida' && g[s].length}
										<button
											class="ml-auto text-xs font-semibold text-grey hover:text-brand-danger transition-colors"
											onclick={() => organyze.limparConcluidas(cat)}
										>
											Limpar
										</button>
									{/if}
								</div>

								{#if g[s].length}
									<ul class="space-y-2">
										{#each g[s] as t, i (t.id)}
											{#if dropCat === cat && dropStatus === s && dropIndex === i}
												{@render slot()}
											{/if}
											{@render taskRow(t)}
										{/each}
										{#if dropCat === cat && dropStatus === s && (dropIndex ?? -1) >= g[s].length}
											{@render slot()}
										{/if}
									</ul>
								{:else}
									<div
										class="rounded-[var(--radius)] border border-dashed py-4 text-center text-[11px] transition-colors"
										class:border-brand={dropCat === cat && dropStatus === s}
										class:text-brand={dropCat === cat && dropStatus === s}
										class:border-grey-200={!(dropCat === cat && dropStatus === s)}
										class:text-grey={!(dropCat === cat && dropStatus === s)}
									>
										{dropCat === cat && dropStatus === s ? 'Solte aqui' : 'Arraste tarefas para cá'}
									</div>
								{/if}
							</section>
						{/each}
					</div>
				{/each}
			</div>
			{/if}
		{:else if organyze.modo === 'semana'}
			<div class="space-y-2">
				{#each diasSemana as d (d.iso)}
					{@render diaSemana(d)}
				{/each}
			</div>
		{:else}
			{@render mesGrid()}
		{/if}
	</div>
{/if}

<!-- ===== Modal de edição da tarefa ===== -->
<Modal
	open={modalId !== null}
	title="Editar tarefa"
	size={modalLayout === 'amplo' ? 'xl' : 'md'}
	onClose={fecharModal}
>
	{#if modalTarefa}
		{@const u = urgencia(modalTarefa.prazo, hojeStr)}
		{@const dono = colabById(modalTarefa.colaboradorId)}
		{@const amplo = modalLayout === 'amplo'}

		<!-- Seletor de visualização -->
		<div class="mb-4 flex justify-end">
			<div class="inline-flex rounded-[var(--radius)] border border-grey-200 bg-bg p-0.5">
				<button
					class="flex items-center gap-1.5 rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-xs font-semibold transition-colors"
					class:bg-surface={!amplo}
					class:text-navy={!amplo}
					class:shadow-sm={!amplo}
					class:text-grey={amplo}
					aria-pressed={!amplo}
					onclick={() => setModalLayout('compacto')}
				>
					<Rows3 size={14} /> Compacto
				</button>
				<button
					class="flex items-center gap-1.5 rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-xs font-semibold transition-colors"
					class:bg-surface={amplo}
					class:text-navy={amplo}
					class:shadow-sm={amplo}
					class:text-grey={!amplo}
					aria-pressed={amplo}
					onclick={() => setModalLayout('amplo')}
				>
					<Columns2 size={14} /> Amplo
				</button>
			</div>
		</div>

		<div
			class={amplo
				? 'grid grid-cols-1 items-start gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,340px)]'
				: 'space-y-5'}
		>
			<!-- Coluna 1 (metadados) -->
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
							style={situacaoStyle(s, modalTarefa.status === s)}
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

			<!-- Responsáveis -->
			<div>
				<span class="mb-1.5 block text-sm font-medium text-navy">Responsáveis</span>
				<p class="mb-2 text-xs text-grey">
					A tarefa aparece no perfil de todos os marcados, além do dono.
				</p>
				<div class="flex flex-wrap gap-2">
					<!-- Dono (fixo) -->
					{#if dono}
						<span
							class="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/5 py-1 pl-1 pr-3 text-xs font-semibold text-navy"
							title="Dono da tarefa"
						>
							{#if dono.avatarUrl}
								<img src={dono.avatarUrl} alt={dono.nome} class="size-6 rounded-full object-cover" />
							{:else}
								<span
									class="grid size-6 place-items-center rounded-full text-[10px] font-semibold text-white"
									style="background: {corAvatar(dono.id)}"
								>
									{iniciais(dono.nome)}
								</span>
							{/if}
							{dono.nome.split(' ')[0]}
							<span class="text-[10px] font-medium text-grey">dono</span>
						</span>
					{/if}
					<!-- Demais colaboradores (clique alterna) -->
					{#each organyze.colaboradores.filter((c) => c.id !== modalTarefa.colaboradorId) as c (c.id)}
						{@const sel = modalTarefa.responsaveis.includes(c.id)}
						<button
							class="inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition-colors"
							class:border-brand={sel}
							class:bg-brand={sel}
							class:text-white={sel}
							class:border-grey-200={!sel}
							class:text-slate={!sel}
							class:bg-surface={!sel}
							onclick={() => modalId && organyze.toggleResponsavel(modalId, c.id)}
						>
							{#if c.avatarUrl}
								<img src={c.avatarUrl} alt={c.nome} class="size-6 rounded-full object-cover" />
							{:else}
								<span
									class="grid size-6 place-items-center rounded-full text-[10px] font-semibold text-white"
									style="background: {corAvatar(c.id)}"
								>
									{iniciais(c.nome)}
								</span>
							{/if}
							{c.nome.split(' ')[0]}
							{#if sel}<Check size={13} strokeWidth={3} />{/if}
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
				<!-- Atalhos rápidos de prazo -->
				<div class="mt-2 flex flex-wrap items-center gap-1.5">
					<span class="mr-0.5 text-xs text-grey">Em:</span>
					{#each PRAZO_ATALHOS as n (n)}
						{@const iso = prazoEmDias(n)}
						{@const ativo = modalTarefa.prazo === iso}
						<button
							class="rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
							class:border-brand={ativo}
							class:text-brand={ativo}
							class:bg-brand-50={ativo}
							class:border-grey-200={!ativo}
							class:text-grey={!ativo}
							onclick={() => modalId && organyze.setPrazo(modalId, iso)}
						>
							{n} dias
						</button>
					{/each}
				</div>
			</div>
			</div>
			<!-- end Coluna 1 -->

			<!-- Coluna 2 (conteúdo) -->
			<div class="space-y-5">
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
			</div>
			<!-- end Coluna 2 -->

			<!-- Coluna 3 (subtarefas) -->
			<div class="space-y-5">
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
					<ul class="mb-2 space-y-1.5" ondragover={calcDropSub} ondrop={soltarSub} role="list">
						{#each modalTarefa.subtarefas as s, i (s.id)}
							{#if subDragId && subDropIndex === i}
								<li class="h-0.5 rounded-full bg-brand" aria-hidden="true"></li>
							{/if}
							<li
								data-sub
								class="group/sub flex items-center gap-2 rounded-[var(--radius)] border border-grey-200 bg-surface px-2.5 py-2 transition-opacity"
								class:opacity-40={subDragId === s.id}
							>
								<span
									class="shrink-0 cursor-grab text-grey/50 hover:text-grey active:cursor-grabbing"
									role="button"
									tabindex="-1"
									aria-label="Arrastar para reordenar"
									draggable="true"
									ondragstart={() => (subDragId = s.id)}
									ondragend={() => {
										subDragId = null;
										subDropIndex = null;
									}}
								>
									<GripVertical size={16} />
								</span>
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
						{#if subDragId && (subDropIndex ?? -1) >= modalTarefa.subtarefas.length}
							<li class="h-0.5 rounded-full bg-brand" aria-hidden="true"></li>
						{/if}
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

			</div>
			<!-- end Coluna 3 -->

			<!-- Ações (largura total) -->
			<div
				class="flex items-center justify-between border-t border-grey-200 pt-4"
				class:col-span-full={amplo}
			>
				<Button variant="danger" size="sm" onclick={excluirDoModal}>
					<Trash2 size={15} /> Excluir
				</Button>
				<div class="flex items-center gap-2">
					<Button variant="secondary" size="sm" onclick={duplicarDoModal}>
						<Copy size={15} /> Duplicar
					</Button>
					<Button variant="secondary" size="sm" onclick={fecharModal}>Concluir edição</Button>
				</div>
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
	/* Slot de encaixe surge abrindo o espaço no destino da solta. */
	@keyframes slotIn {
		from {
			opacity: 0;
			height: 0;
			margin-top: -0.5rem;
		}
		to {
			opacity: 1;
			height: 3.5rem;
		}
	}
</style>
