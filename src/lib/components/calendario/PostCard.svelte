<script lang="ts">
	// Card de um conteúdo dentro da célula do calendário: título, horário,
	// status (com a bolinha que avança para o próximo), tipos, cliente e excluir.
	import { toneClasses } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { conteudoTipoLabel, conteudoStatusLabel, conteudoStatusTone } from '$lib/conteudo';

	let {
		conteudo: c,
		/** Mostra o nome do cliente (só quando a tela não está filtrada por um). */
		mostrarCliente = false,
		onAbrir,
		onExcluir,
		onStatus,
		onDragStart,
		onDragEnd
	}: {
		conteudo: Record<string, any>;
		mostrarCliente?: boolean;
		onAbrir: () => void;
		onExcluir: (e: Event) => void;
		onStatus: (status: string, e: Event) => void;
		onDragStart: (e: DragEvent) => void;
		onDragEnd: () => void;
	} = $props();

	const tipos = $derived(c.tipos?.length ? c.tipos : c.tipo ? [c.tipo] : []);
</script>

<div
	role="button"
	tabindex="0"
	draggable="true"
	ondragstart={onDragStart}
	ondragend={onDragEnd}
	onclick={(e) => {
		e.stopPropagation();
		onAbrir();
	}}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onAbrir();
		}
	}}
	title={`${conteudoTipoLabel(c.tipo)} · ${conteudoStatusLabel(c.status)}${c.cliente_nome ? ' · ' + c.cliente_nome : ''}`}
	class="relative flex w-full cursor-grab flex-col gap-0.5 rounded-[var(--radius-sm)] border border-grey-200/70 bg-surface px-1.5 py-1 pr-5 text-left transition-colors hover:bg-bg active:cursor-grabbing"
>
	<span class="flex items-baseline gap-1">
		<span class="truncate text-[0.68rem] font-semibold leading-tight text-navy-900">
			{c.titulo ?? conteudoTipoLabel(c.tipo)}
		</span>
		<span class="ml-auto shrink-0 tabular-nums text-[0.6rem] text-brand">{c.hora}</span>
	</span>
	<span class="flex items-center gap-1">
		<span
			class="inline-flex items-center rounded-full px-1 py-px text-[0.56rem] font-medium leading-tight {toneClasses[
				conteudoStatusTone(c.status)
			]}">{conteudoStatusLabel(c.status)}</span
		>
		<!-- As bolinhas têm 12px: o ::after invisível (inset -8px) leva o alvo de
		     toque a 28px sem mudar o desenho — antes errar a mira abria o modal. -->
		{#if c.status !== 'programar' && c.status !== 'publicado'}
			<button
				type="button"
				onclick={(e) => onStatus('programar', e)}
				title="Marcar como Programar"
				aria-label="Marcar como Programar"
				class="relative size-3 shrink-0 rounded-full border border-brand-amber bg-brand-amber/30 transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-brand-amber"
			></button>
		{:else if c.status === 'programar'}
			<button
				type="button"
				onclick={(e) => onStatus('publicado', e)}
				title="Marcar como Publicado"
				aria-label="Marcar como Publicado"
				class="relative size-3 shrink-0 rounded-full border border-brand-green bg-brand-green/30 transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-brand-green"
			></button>
		{/if}
	</span>
	<span class="flex flex-wrap gap-0.5">
		{#each tipos as tp (tp)}
			<span
				class="inline-flex items-center rounded-full bg-bg px-1 py-px text-[0.56rem] font-medium leading-tight text-slate"
				>{conteudoTipoLabel(tp)}</span
			>
		{/each}
	</span>
	{#if mostrarCliente && c.cliente_nome}
		<span class="flex items-center gap-0.5 truncate text-[0.56rem] leading-tight text-grey">
			<Icon name="building" size={9} /><span class="truncate">{c.cliente_nome}</span>
		</span>
	{/if}
	<button
		type="button"
		onclick={onExcluir}
		title="Excluir conteúdo"
		aria-label="Excluir conteúdo"
		class="absolute bottom-1 right-1 grid size-4 place-items-center rounded-full bg-brand-danger/15 text-brand-danger transition-colors hover:bg-brand-danger hover:text-white"
	><Icon name="trash" size={9} /></button>
</div>
