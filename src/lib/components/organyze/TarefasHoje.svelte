<script lang="ts">
	// Organyze na Visão Geral — a lista de hoje do próprio usuário, com o essencial
	// do dia: concluir e adicionar sem sair do dashboard. O app completo (quadro,
	// arrastar, metas, hábitos, lixeira) continua em /dtools/organyze.
	//
	// As mutações são otimistas e vão direto ao Supabase pelas mesmas funções do
	// app (lib/organyze/db), sem passar pelo store — que é singleton e pertence à
	// tela do Organyze; mexer nele daqui bagunçaria o dia/modo escolhidos lá.
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { Card } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { Check, Plus } from '@lucide/svelte';
	import { corPrioridadeEfetiva, prazoUrgente, urgencia } from '$lib/organyze/types';
	import type { Status, Tarefa, TarefaHoje } from '$lib/organyze/types';
	import { insertTarefa, updateTarefa } from '$lib/organyze/db';
	import { toast } from '$lib/toast.svelte';

	let {
		supabase,
		colaboradorId,
		hoje,
		tarefas
	}: {
		supabase: SupabaseClient;
		colaboradorId: string | null;
		hoje: string; // yyyy-mm-dd (fuso de São Paulo, vindo do servidor)
		tarefas: TarefaHoje[];
	} = $props();

	// Cópia local para as mutações otimistas; ressincroniza quando o load recarrega
	// (botão Atualizar do topo / invalidateAll).
	// svelte-ignore state_referenced_locally — é a carga inicial de propósito; o
	// $effect abaixo é quem acompanha as recargas seguintes.
	let itens = $state<TarefaHoje[]>([...tarefas]);
	$effect(() => {
		itens = [...tarefas];
	});

	let novoTitulo = $state('');

	// Quantos itens cabem sem transformar o dashboard num segundo Organyze.
	const LIMITE_PENDENTES = 6;
	const LIMITE_FEITAS = 3;

	const pendentes = $derived(itens.filter((t) => t.status !== 'concluida'));
	const feitas = $derived(itens.filter((t) => t.status === 'concluida'));
	const total = $derived(itens.length);
	const pct = $derived(total ? Math.round((feitas.length / total) * 100) : 0);
	const restantes = $derived(Math.max(0, pendentes.length - LIMITE_PENDENTES));

	function toggle(id: string) {
		const alvo = itens.find((t) => t.id === id);
		if (!alvo) return;
		const anterior = alvo.status;
		const status: Status = anterior === 'concluida' ? 'em_execucao' : 'concluida';
		itens = itens.map((t) => (t.id === id ? { ...t, status } : t));
		updateTarefa(supabase, id, { status }).catch((e) => {
			console.error('[organyze:home] toggle', e);
			itens = itens.map((t) => (t.id === id ? { ...t, status: anterior } : t));
			toast.error('Falha ao atualizar tarefa.');
		});
	}

	function adicionar() {
		const titulo = novoTitulo.trim();
		if (!titulo || !colaboradorId) return;
		const posicao = itens.length ? Math.max(...itens.map((t) => t.posicao)) + 1 : 0;
		const tarefa: Tarefa = {
			id: crypto.randomUUID(),
			colaboradorId,
			titulo,
			status: 'nao_iniciado',
			categoria: 'empresa',
			data: hoje,
			posicao,
			prioridade: 'media',
			prazo: null,
			descricao: '',
			subtarefas: [],
			responsaveis: []
		};
		itens = [...itens, tarefa];
		novoTitulo = '';
		insertTarefa(supabase, tarefa).catch((e) => {
			console.error('[organyze:home] adicionar', e);
			itens = itens.filter((t) => t.id !== tarefa.id);
			toast.error('Falha ao adicionar tarefa.');
		});
	}
</script>

{#snippet linha(t: TarefaHoje)}
	{@const u = urgencia(t.prazo, hoje)}
	{@const feita = t.status === 'concluida'}
	<li class="flex items-center gap-2.5 py-1.5">
		<button
			class="grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors"
			class:border-grey-200={!feita}
			class:border-brand={feita}
			class:bg-brand={feita}
			class:text-white={feita}
			aria-label={feita ? `Reabrir ${t.titulo}` : `Concluir ${t.titulo}`}
			onclick={() => toggle(t.id)}
		>
			{#if feita}<Check size={13} strokeWidth={3} />{/if}
		</button>

		<span
			class="size-2 shrink-0 rounded-full"
			style="background: {corPrioridadeEfetiva(t.prioridade, t.prazo, hoje)}"
			title="Prioridade: {t.prioridade}"
		></span>

		<span
			class="min-w-0 flex-1 truncate text-sm"
			class:text-navy={!feita}
			class:text-grey={feita}
			class:line-through={feita}
			title={t.titulo}
		>
			{t.titulo}
		</span>

		<!-- Só o prazo que aperta: o resto vira ruído numa lista de 6 linhas. -->
		{#if u && prazoUrgente(t.prazo, hoje)}
			<span
				class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium"
				style="border-color: {u.cor}66; color: {u.cor}"
			>
				{u.label}
			</span>
		{/if}
	</li>
{/snippet}

<Card>
	<div class="mb-4 flex items-center justify-between gap-2">
		<h2 class="flex items-center gap-2 text-sm font-semibold text-navy">
			<Icon name="organyze" size={17} /> Organyze
			<span class="font-normal text-grey">· minhas tarefas de hoje</span>
		</h2>
		<a class="text-sm text-brand hover:underline" href="/dtools/organyze">Abrir Organyze</a>
	</div>

	{#if !colaboradorId}
		<p class="text-sm text-grey">
			Seu login ainda não está vinculado a um colaborador, então não há lista de tarefas para
			mostrar. O vínculo é feito em <a class="text-brand hover:underline" href="/equipe">Equipe</a>.
		</p>
	{:else}
		{#if total}
			<div class="mb-3 flex items-center gap-3">
				<div class="h-2 flex-1 overflow-hidden rounded-full bg-bg">
					<div class="h-full rounded-full bg-brand transition-all" style="width: {pct}%"></div>
				</div>
				<span class="shrink-0 text-xs font-semibold tabular-nums text-grey">
					{feitas.length} de {total} concluída{total === 1 ? '' : 's'}
				</span>
			</div>
		{/if}

		{#if pendentes.length || feitas.length}
			<ul class="divide-y divide-grey-200/60">
				{#each pendentes.slice(0, LIMITE_PENDENTES) as t (t.id)}
					{@render linha(t)}
				{/each}
				{#each feitas.slice(0, LIMITE_FEITAS) as t (t.id)}
					{@render linha(t)}
				{/each}
			</ul>
			{#if restantes}
				<a class="mt-2 inline-block text-xs text-brand hover:underline" href="/dtools/organyze">
					+ {restantes} tarefa{restantes === 1 ? '' : 's'} no Organyze
				</a>
			{/if}
		{:else}
			<p class="text-sm text-grey">
				Nada na lista de hoje. Escreva abaixo o que precisa fazer e vá marcando o que concluir.
			</p>
		{/if}

		<div class="mt-3 flex items-center gap-2">
			<input
				class="h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy-900 shadow-xs transition-colors placeholder:text-grey/90 hover:border-grey focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
				placeholder="Adicionar tarefa para hoje…"
				aria-label="Adicionar tarefa para hoje"
				bind:value={novoTitulo}
				onkeydown={(e) => e.key === 'Enter' && adicionar()}
			/>
			<button
				class="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-brand text-white transition-all hover:brightness-[1.07] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
				aria-label="Adicionar tarefa"
				disabled={!novoTitulo.trim()}
				onclick={adicionar}
			>
				<Plus size={17} />
			</button>
		</div>
	{/if}
</Card>
