<script lang="ts">
	import { organyze } from '$lib/organyze/store.svelte';
	import { Button } from '$lib/components/ui';
	import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let novoTitulo = $state('');
	let editandoId = $state<string | null>(null);
	let editTexto = $state('');

	// Foca (e seleciona) o input de edição assim que ele aparece.
	function focar(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	// Inicializa o store com o cliente Supabase (autenticado) do layout.
	$effect(() => {
		if (data.supabase) organyze.init(data.supabase);
	});

	// Rótulo amigável do dia visível ("Hoje", "Ontem", "Amanhã" ou a data).
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

	function adicionar() {
		if (organyze.addTarefa(novoTitulo)) novoTitulo = '';
	}

	function iniciarEdicao(id: string, titulo: string) {
		editandoId = id;
		editTexto = titulo;
	}

	function confirmarEdicao() {
		if (editandoId) {
			organyze.editTarefa(editandoId, editTexto);
			editandoId = null;
			editTexto = '';
		}
	}
</script>

<svelte:head>
	<title>Organyze | Dunamis Space</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-4">
	<!-- Cabeçalho: dia + progresso -->
	<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-5 shadow-xs">
		<div class="flex items-center justify-between gap-3">
			<div>
				<h1 class="text-xl font-bold text-navy leading-none">Organyze</h1>
				<p class="text-xs font-medium text-grey mt-1">Suas tarefas do dia</p>
			</div>
			<div class="flex items-center gap-1">
				<button
					class="grid size-8 place-items-center rounded-full text-grey hover:bg-bg hover:text-navy transition-colors"
					aria-label="Dia anterior"
					onclick={() => organyze.passarDia(-1)}
				>
					<ChevronLeft size={18} />
				</button>
				<div class="min-w-[8.5rem] text-center">
					<div class="text-sm font-semibold text-navy leading-tight">
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

		<!-- Barra de progresso -->
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

	<!-- Lista -->
	{#if organyze.loading}
		<div class="flex flex-col items-center justify-center py-20 text-grey">
			<span class="size-8 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
			<p class="mt-3 text-sm">Carregando tarefas…</p>
		</div>
	{:else if organyze.error}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<p class="text-brand-danger mb-3">{organyze.error}</p>
			<Button variant="secondary" onclick={() => organyze.load()}>Tentar novamente</Button>
		</div>
	{:else if organyze.total === 0}
		<div
			class="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-grey-200 py-16 text-center"
		>
			<div class="grid size-12 place-items-center rounded-full bg-bg text-grey mb-3">
				<Check size={22} />
			</div>
			<p class="text-sm font-medium text-navy">Nenhuma tarefa {organyze.ehHoje ? 'para hoje' : 'nesse dia'}</p>
			<p class="text-xs text-grey mt-1">Adicione a primeira tarefa acima.</p>
		</div>
	{:else}
		<ul class="space-y-2">
			{#each organyze.tarefas as t (t.id)}
				<li
					class="group flex items-center gap-3 rounded-[var(--radius)] border border-grey-200 bg-surface px-4 py-3 shadow-xs transition-colors hover:border-grey"
				>
					<!-- Checkbox -->
					<button
						class="grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors"
						class:border-grey-200={!t.concluida}
						class:border-brand={t.concluida}
						class:bg-brand={t.concluida}
						class:text-white={t.concluida}
						aria-label={t.concluida ? 'Desmarcar tarefa' : 'Concluir tarefa'}
						onclick={() => organyze.toggle(t.id)}
					>
						{#if t.concluida}<Check size={13} strokeWidth={3} />{/if}
					</button>

					<!-- Título / edição inline -->
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
							class="flex-1 text-left text-sm transition-colors"
							class:text-navy={!t.concluida}
							class:text-grey={t.concluida}
							class:line-through={t.concluida}
							ondblclick={() => iniciarEdicao(t.id, t.titulo)}
							onclick={() => organyze.toggle(t.id)}
						>
							{t.titulo}
						</button>
					{/if}

					<!-- Excluir -->
					<button
						class="grid size-8 shrink-0 place-items-center rounded-md text-grey opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover:opacity-100"
						aria-label="Excluir tarefa"
						onclick={() => organyze.removeTarefa(t.id)}
					>
						<Trash2 size={16} />
					</button>
				</li>
			{/each}
		</ul>

		<!-- Rodapé de ações -->
		{#if organyze.concluidas > 0}
			<div class="flex justify-end pt-1">
				<button
					class="text-xs font-semibold text-grey hover:text-brand-danger transition-colors"
					onclick={() => organyze.limparConcluidas()}
				>
					Limpar {organyze.concluidas} concluída{organyze.concluidas === 1 ? '' : 's'}
				</button>
			</div>
		{/if}
	{/if}
</div>
