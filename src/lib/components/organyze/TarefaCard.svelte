<script lang="ts">
	// Card de tarefa do modo Dia: pega para arrastar, prioridade, concluir,
	// título com as etiquetas (responsáveis, prazo, subtarefas) e as ações.
	import { organyze } from '$lib/organyze/store.svelte';
	import { corPrioridadeEfetiva, prazoUrgente, proximaPrioridade, urgencia } from '$lib/organyze/types';
	import type { Tarefa } from '$lib/organyze/types';
	import Avatar from './Avatar.svelte';
	import { CalendarClock, Check, Copy, GripVertical, Trash2 } from '@lucide/svelte';

	let {
		tarefa: t,
		hoje,
		/** Este card é o que está sendo arrastado. */
		arrastando = false,
		/** Outro card está sendo arrastado (este vai para o fundo). */
		aoFundo = false,
		onDragStart,
		onDragEnd,
		onAbrir
	}: {
		tarefa: Tarefa;
		hoje: string;
		arrastando?: boolean;
		aoFundo?: boolean;
		onDragStart: () => void;
		onDragEnd: () => void;
		onAbrir: () => void;
	} = $props();

	const u = $derived(urgencia(t.prazo, hoje));
</script>

<li
	data-card={arrastando ? undefined : ''}
	draggable="true"
	ondragstart={onDragStart}
	ondragend={onDragEnd}
	class="group relative flex items-start gap-2.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-3 shadow-xs transition-[transform,filter,opacity,box-shadow] duration-200 ease-out hover:border-grey"
	class:z-20={arrastando}
	class:shadow-xl={arrastando}
	class:opacity-60={t.status === 'concluida' && !arrastando}
	style:transform={arrastando ? 'scale(1.05)' : undefined}
	style:filter={aoFundo ? 'blur(2px)' : undefined}
	style:opacity={arrastando ? '0.45' : aoFundo ? '0.55' : undefined}
>
	<span class="mt-0.5 cursor-grab text-grey/50 hover:text-grey active:cursor-grabbing" aria-hidden="true">
		<GripVertical size={18} />
	</span>

	<!-- Prioridade (clique cicla). Fica vermelha quando o prazo está chegando. -->
	<button
		class="mt-1 size-3 shrink-0 rounded-full ring-2 ring-transparent transition-all hover:ring-grey-200"
		style="background: {corPrioridadeEfetiva(t.prioridade, t.prazo, hoje)}"
		title={prazoUrgente(t.prazo, hoje)
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
	<button class="min-w-0 flex-1 text-left" onclick={onAbrir}>
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
							{@const rc = organyze.colaboradores.find((c) => c.id === rid)}
							{#if rc}
								<Avatar
									id={rc.id}
									nome={rc.nome}
									avatarUrl={rc.avatarUrl}
									size="size-5"
									textClass="text-[9px]"
									class="ring-2 ring-surface"
								/>
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
