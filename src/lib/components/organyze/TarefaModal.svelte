<script lang="ts">
	// Edição de uma tarefa: título, situação, prioridade, responsáveis, prazo,
	// descrição e subtarefas. Tudo salva na hora (não há botão "salvar").
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { organyze } from '$lib/organyze/store.svelte';
	import { PRIORIDADES, STATUS_ORDEM, urgencia } from '$lib/organyze/types';
	import { PRAZO_ATALHOS, SECAO_META, prazoEmDias, situacaoStyle } from '$lib/organyze/ui';
	import { Button, Modal } from '$lib/components/ui';
	import RichText from '$lib/components/organyze/RichText.svelte';
	import Avatar from './Avatar.svelte';
	import { CalendarClock, Check, Columns2, Copy, GripVertical, Plus, Rows3, Trash2 } from '@lucide/svelte';

	let {
		/** Id da tarefa aberta; null fecha o modal. */
		id = $bindable(null),
		hoje
	}: { id: string | null; hoje: string } = $props();

	const tarefa = $derived(organyze.tarefas.find((t) => t.id === id) ?? null);
	const dono = $derived(tarefa ? organyze.colaboradores.find((c) => c.id === tarefa.colaboradorId) : null);
	const u = $derived(tarefa ? urgencia(tarefa.prazo, hoje) : null);

	let titulo = $state('');
	let novaSub = $state('');
	// Drag-and-drop das subtarefas.
	let subDragId = $state<string | null>(null);
	let subDropIndex = $state<number | null>(null);

	// O título é o único campo com estado local (é digitado, não clicado): grava
	// no blur e ao fechar. O untrack é essencial — sem ele, qualquer alteração na
	// tarefa (marcar uma subtarefa, por exemplo) reescreveria o que está sendo
	// digitado. A dependência é só a troca de tarefa aberta.
	$effect(() => {
		const alvo = id;
		untrack(() => {
			titulo = organyze.tarefas.find((t) => t.id === alvo)?.titulo ?? '';
		});
	});

	// Modo de visualização: 'compacto' (empilhado) | 'amplo' (janela larga, 3 colunas).
	// A escolha fica no localStorage e é lida já na criação do componente (sem
	// "flash"), então o modal sempre reabre no modo escolhido.
	type Layout = 'compacto' | 'amplo';
	const LAYOUT_KEY = 'organyze:modalLayout';
	function lerLayoutSalvo(): Layout {
		if (!browser) return 'compacto';
		return localStorage.getItem(LAYOUT_KEY) === 'amplo' ? 'amplo' : 'compacto';
	}
	let layout = $state<Layout>(lerLayoutSalvo());
	const amplo = $derived(layout === 'amplo');
	function setLayout(l: Layout) {
		layout = l;
		if (browser) localStorage.setItem(LAYOUT_KEY, l);
	}

	function fechar() {
		if (id && titulo.trim() && titulo.trim() !== tarefa?.titulo) organyze.editTarefa(id, titulo);
		id = null;
	}
	function excluir() {
		if (id) organyze.removeTarefa(id);
		id = null;
	}
	function duplicar() {
		if (id) organyze.duplicarTarefa(id);
		id = null;
	}

	function adicionarSub() {
		if (id && novaSub.trim()) {
			organyze.addSubtarefa(id, novaSub);
			novaSub = '';
		}
	}

	/** Índice de inserção da subtarefa arrastada, pelo ponto médio de cada linha. */
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
		if (from && id && idx != null) organyze.reordenarSubtarefa(id, from, idx);
	}
</script>

<Modal open={id !== null} title="Editar tarefa" size={amplo ? 'xl' : 'md'} onClose={fechar}>
	{#if tarefa}
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
					onclick={() => setLayout('compacto')}
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
					onclick={() => setLayout('amplo')}
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
			<!-- Coluna 1: metadados -->
			<div class="space-y-5">
				<div>
					<label for="m-titulo" class="mb-1.5 block text-sm font-medium text-navy">Título</label>
					<input
						id="m-titulo"
						class="h-11 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
						bind:value={titulo}
						onblur={() => id && titulo.trim() && organyze.editTarefa(id, titulo)}
					/>
				</div>

				<div>
					<span class="mb-1.5 block text-sm font-medium text-navy">Situação</span>
					<div class="grid grid-cols-3 gap-2">
						{#each STATUS_ORDEM as s (s)}
							<button
								class="rounded-[var(--radius)] border px-2 py-2 text-xs font-semibold transition-colors"
								style={situacaoStyle(s, tarefa.status === s)}
								onclick={() => id && organyze.setStatus(id, s)}
							>
								{SECAO_META[s].label}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<span class="mb-1.5 block text-sm font-medium text-navy">Prioridade</span>
					<div class="grid grid-cols-3 gap-2">
						{#each PRIORIDADES as p (p.valor)}
							<button
								class="flex items-center justify-center gap-2 rounded-[var(--radius)] border px-2 py-2 text-xs font-semibold transition-colors"
								class:border-grey-200={tarefa.prioridade !== p.valor}
								class:text-slate={tarefa.prioridade !== p.valor}
								class:bg-bg={tarefa.prioridade !== p.valor}
								style={tarefa.prioridade === p.valor
									? `border-color:${p.cor}; color:${p.cor}; background:${p.cor}14`
									: ''}
								onclick={() => id && organyze.setPrioridade(id, p.valor)}
							>
								<span class="size-2.5 rounded-full" style="background: {p.cor}"></span>
								{p.label}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<span class="mb-1.5 block text-sm font-medium text-navy">Responsáveis</span>
					<p class="mb-2 text-xs text-grey">
						A tarefa aparece no perfil de todos os marcados, além do dono.
					</p>
					<div class="flex flex-wrap gap-2">
						{#if dono}
							<span
								class="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/5 py-1 pl-1 pr-3 text-xs font-semibold text-navy"
								title="Dono da tarefa"
							>
								<Avatar id={dono.id} nome={dono.nome} avatarUrl={dono.avatarUrl} size="size-6" textClass="text-[10px]" />
								{dono.nome.split(' ')[0]}
								<span class="text-[10px] font-medium text-grey">dono</span>
							</span>
						{/if}
						<!-- Demais colaboradores (clique alterna) -->
						{#each organyze.colaboradores.filter((c) => c.id !== tarefa.colaboradorId) as c (c.id)}
							{@const sel = tarefa.responsaveis.includes(c.id)}
							<button
								class="inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition-colors"
								class:border-brand={sel}
								class:bg-brand={sel}
								class:text-white={sel}
								class:border-grey-200={!sel}
								class:text-slate={!sel}
								class:bg-surface={!sel}
								onclick={() => id && organyze.toggleResponsavel(id, c.id)}
							>
								<Avatar id={c.id} nome={c.nome} avatarUrl={c.avatarUrl} size="size-6" textClass="text-[10px]" />
								{c.nome.split(' ')[0]}
								{#if sel}<Check size={13} strokeWidth={3} />{/if}
							</button>
						{/each}
					</div>
				</div>

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
								value={tarefa.prazo ?? ''}
								onchange={(e) => id && organyze.setPrazo(id, e.currentTarget.value || null)}
								class="bg-transparent text-sm text-navy outline-none [color-scheme:light]"
							/>
						</div>
						{#if u && u.status !== 'futura'}
							<span class="text-xs font-semibold" style="color: {u.cor}">{u.label}</span>
						{/if}
						{#if tarefa.prazo}
							<button
								class="text-xs font-medium text-grey hover:text-brand-danger"
								onclick={() => id && organyze.setPrazo(id, null)}>remover</button
							>
						{/if}
					</div>
					<!-- Atalhos rápidos de prazo -->
					<div class="mt-2 flex flex-wrap items-center gap-1.5">
						<span class="mr-0.5 text-xs text-grey">Em:</span>
						{#each PRAZO_ATALHOS as n (n)}
							{@const iso = prazoEmDias(n)}
							{@const ativo = tarefa.prazo === iso}
							<button
								class="rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
								class:border-brand={ativo}
								class:text-brand={ativo}
								class:bg-brand-50={ativo}
								class:border-grey-200={!ativo}
								class:text-grey={!ativo}
								onclick={() => id && organyze.setPrazo(id, iso)}
							>
								{n} dias
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Coluna 2: descrição -->
			<div class="space-y-5">
				<div>
					<span class="mb-1.5 block text-sm font-medium text-navy">Descrição</span>
					{#key tarefa.id}
						<RichText value={tarefa.descricao} onSave={(html) => id && organyze.setDescricao(id, html)} />
					{/key}
				</div>
			</div>

			<!-- Coluna 3: subtarefas -->
			<div class="space-y-5">
				<div>
					<div class="mb-1.5 flex items-center justify-between">
						<span class="text-sm font-medium text-navy">Subtarefas</span>
						{#if tarefa.subtarefas.length}
							<span class="text-xs text-grey tabular-nums">
								{tarefa.subtarefas.filter((s) => s.feita).length}/{tarefa.subtarefas.length}
							</span>
						{/if}
					</div>

					{#if tarefa.subtarefas.length}
						<ul class="mb-2 space-y-1.5" ondragover={calcDropSub} ondrop={soltarSub} role="list">
							{#each tarefa.subtarefas as s, i (s.id)}
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
										onclick={() => id && organyze.toggleSubtarefa(id, s.id)}
									>
										{#if s.feita}<Check size={10} strokeWidth={3} />{/if}
									</button>
									<input
										class="flex-1 bg-transparent text-sm outline-none"
										class:text-grey={s.feita}
										class:line-through={s.feita}
										class:text-navy={!s.feita}
										value={s.titulo}
										onchange={(e) => id && organyze.editSubtarefa(id, s.id, e.currentTarget.value)}
									/>
									<button
										class="grid size-7 shrink-0 place-items-center rounded-md text-grey opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover/sub:opacity-100"
										aria-label="Excluir subtarefa"
										onclick={() => id && organyze.removeSubtarefa(id, s.id)}
									>
										<Trash2 size={14} />
									</button>
								</li>
							{/each}
							{#if subDragId && (subDropIndex ?? -1) >= tarefa.subtarefas.length}
								<li class="h-0.5 rounded-full bg-brand" aria-hidden="true"></li>
							{/if}
						</ul>
					{/if}

					<div class="flex gap-2">
						<input
							class="h-9 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy-900 outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
							placeholder="Adicionar subtarefa…"
							bind:value={novaSub}
							onkeydown={(e) => e.key === 'Enter' && adicionarSub()}
						/>
						<button
							class="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] bg-brand text-white transition-all hover:brightness-105 active:scale-95 disabled:opacity-50"
							aria-label="Adicionar subtarefa"
							disabled={!novaSub.trim()}
							onclick={adicionarSub}
						>
							<Plus size={16} />
						</button>
					</div>
				</div>
			</div>

			<!-- Ações (largura total) -->
			<div
				class="flex items-center justify-between border-t border-grey-200 pt-4"
				class:col-span-full={amplo}
			>
				<Button variant="danger" size="sm" onclick={excluir}>
					<Trash2 size={15} /> Excluir
				</Button>
				<div class="flex items-center gap-2">
					<Button variant="secondary" size="sm" onclick={duplicar}>
						<Copy size={15} /> Duplicar
					</Button>
					<Button variant="secondary" size="sm" onclick={fechar}>Concluir edição</Button>
				</div>
			</div>
		</div>
	{/if}
</Modal>
