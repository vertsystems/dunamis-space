<script lang="ts">
	import { organyze } from '$lib/organyze/store.svelte';
	import { corPrioridade, STATUS_LABEL } from '$lib/organyze/types';
	import { Button } from '$lib/components/ui';
	import SelecaoPerfil from '$lib/components/organyze/SelecaoPerfil.svelte';
	import CabecalhoPerfil from '$lib/components/organyze/CabecalhoPerfil.svelte';
	import { Trash2, RotateCcw } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Inicializa (colaboradores) e recarrega a lixeira quando muda o perfil.
	$effect(() => {
		if (data.supabase)
			organyze.init(data.supabase, (data.perfil?.id as string | undefined) ?? null);
	});
	$effect(() => {
		void organyze.colaboradorId;
		if (organyze.supabase && organyze.colaboradorId) organyze.carregarLixeira();
	});

	/** Data/hora de exclusão em pt-BR (ex.: 07/07 às 14:30). */
	function quando(iso: string | null | undefined): string {
		if (!iso) return '';
		const d = new Date(iso);
		const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
		const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
		return `${data} às ${hora}`;
	}
</script>

<svelte:head>
	<title>Lixeira | Organyze</title>
</svelte:head>

{#if organyze.loading}
	<div class="flex flex-col items-center justify-center py-24 text-grey">
		<span class="size-8 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
		<p class="mt-3 text-sm">Carregando…</p>
	</div>
{:else if !organyze.colaboradorId}
	<SelecaoPerfil
		subtitulo="Escolha seu perfil para ver as tarefas excluídas."
		onEscolher={(id) => organyze.selecionarParaMetas(id)}
	/>
{:else}
	<!-- Mesma largura das outras telas: quem manda é a coluna do shell. -->
	<div class="space-y-4">
		<CabecalhoPerfil legenda="Lixeira" />

		<!-- Barra de ações -->
		<div
			class="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-grey-200 bg-surface px-5 py-3.5 shadow-xs"
		>
			<div class="flex items-center gap-2 text-grey">
				<Trash2 size={18} />
				<span class="text-sm font-semibold">
					{organyze.lixeira.length} tarefa{organyze.lixeira.length === 1 ? '' : 's'} na lixeira
				</span>
			</div>
			{#if organyze.lixeira.length}
				<button
					class="text-xs font-semibold text-grey transition-colors hover:text-brand-danger"
					onclick={() => organyze.esvaziarLixeira()}
				>
					Esvaziar lixeira
				</button>
			{/if}
		</div>

		<!-- Lista de tarefas excluídas -->
		{#if organyze.loadingLixeira}
			<div class="flex flex-col items-center justify-center py-16 text-grey">
				<span class="size-7 rounded-full border-2 border-grey-200 border-t-brand animate-spin"
				></span>
				<p class="mt-3 text-sm">Carregando…</p>
			</div>
		{:else if organyze.lixeira.length === 0}
			<div
				class="rounded-[var(--radius-lg)] border border-dashed border-grey-200 py-16 text-center"
			>
				<div class="mx-auto grid size-12 place-items-center rounded-full bg-bg text-grey/70">
					<Trash2 size={22} />
				</div>
				<p class="mt-3 text-sm font-medium text-navy">A lixeira está vazia</p>
				<p class="mt-1 text-xs text-grey">
					As tarefas que você excluir aparecem aqui e podem ser restauradas.
				</p>
			</div>
		{:else}
			<ul class="space-y-2">
				{#each organyze.lixeira as t (t.id)}
					<li
						class="group flex items-start gap-2.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-3 shadow-xs transition-colors hover:border-grey"
					>
						<span
							class="mt-1 size-3 shrink-0 rounded-full"
							style="background: {corPrioridade(t.prioridade)}"
							title="Prioridade: {t.prioridade}"
						></span>

						<div class="min-w-0 flex-1">
							<span class="block text-sm text-navy">{t.titulo}</span>
							<span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-grey">
								<span
									class="rounded-full bg-bg px-1.5 py-0.5 font-medium"
								>
									{STATUS_LABEL[t.status]}
								</span>
								{#if t.deletedAt}
									<span>Excluída em {quando(t.deletedAt)}</span>
								{/if}
								{#if t.subtarefas.length}
									<span>· {t.subtarefas.filter((s) => s.feita).length}/{t.subtarefas.length} subtarefas</span>
								{/if}
							</span>
						</div>

						<div class="flex shrink-0 items-center gap-1">
							<button
								class="inline-flex items-center gap-1 rounded-[var(--radius)] px-2 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/10"
								title="Restaurar tarefa"
								onclick={() => organyze.restaurarTarefa(t.id)}
							>
								<RotateCcw size={15} /> Restaurar
							</button>
							<button
								class="grid size-8 place-items-center rounded-[var(--radius)] text-grey/70 transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
								aria-label="Excluir em definitivo"
								title="Excluir em definitivo"
								onclick={() => organyze.excluirDefinitivo(t.id)}
							>
								<Trash2 size={15} />
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
