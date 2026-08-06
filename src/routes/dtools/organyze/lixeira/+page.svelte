<script lang="ts">
	import { organyze } from '$lib/organyze/store.svelte';
	import { corPrioridade, STATUS_LABEL } from '$lib/organyze/types';
	import { Button } from '$lib/components/ui';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import Abas from '$lib/components/organyze/Abas.svelte';
	import { Trash2, RotateCcw, LogOut } from '@lucide/svelte';
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
	<!-- Seleção de perfil (compartilhada com Tarefas/Metas) -->
	<div class="flex flex-col items-start py-10">
		<div class="mb-10 text-left">
			<h1 class="text-3xl font-bold text-navy">Quem é você?</h1>
			<p class="mt-2 text-slate">Escolha seu perfil para ver as tarefas excluídas.</p>
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
	<div class="space-y-4">
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
				<div class="text-xs text-grey">Lixeira</div>
			</div>
			<Abas />
			<Button variant="secondary" size="sm" onclick={() => organyze.sair()}>
				<LogOut size={15} /> Trocar
			</Button>
		</div>

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
