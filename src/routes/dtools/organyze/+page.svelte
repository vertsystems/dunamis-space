<script lang="ts">
	// Tela do Organyze. Aqui ficam só o esqueleto e a navegação de período: quem
	// desenha cada visão são os componentes de $lib/components/organyze.
	import { organyze, inicioSemana, fimSemana } from '$lib/organyze/store.svelte';
	import type { Modo } from '$lib/organyze/store.svelte';
	import type { Tarefa } from '$lib/organyze/types';
	import { fmtDiaMes, hoje as hojeISO, parseISO } from '$lib/organyze/ui';
	import { Button } from '$lib/components/ui';
	import CabecalhoPerfil from '$lib/components/organyze/CabecalhoPerfil.svelte';
	import SelecaoPerfil from '$lib/components/organyze/SelecaoPerfil.svelte';
	import NovaTarefa from '$lib/components/organyze/NovaTarefa.svelte';
	import QuadroDia from '$lib/components/organyze/QuadroDia.svelte';
	import VisaoSemana from '$lib/components/organyze/VisaoSemana.svelte';
	import VisaoMes from '$lib/components/organyze/VisaoMes.svelte';
	import TarefaModal from '$lib/components/organyze/TarefaModal.svelte';
	import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, LayoutGrid } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** Tarefa aberta no modal — o modal fecha zerando este id. */
	let modalId = $state<string | null>(null);

	$effect(() => {
		if (data.supabase) organyze.init(data.supabase, (data.perfil?.id as string | undefined) ?? null);
	});

	const hoje = hojeISO();

	const rotuloDia = $derived.by(() => {
		const alvo = parseISO(organyze.dia);
		const agora = new Date();
		agora.setHours(0, 0, 0, 0);
		const diff = Math.round((alvo.getTime() - agora.getTime()) / 86_400_000);
		const rel = diff === 0 ? 'Hoje' : diff === -1 ? 'Ontem' : diff === 1 ? 'Amanhã' : null;
		const ext = alvo.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' });
		return { rel, ext };
	});

	const progresso = $derived(
		organyze.total ? Math.round((organyze.concluidas / organyze.total) * 100) : 0
	);

	const MODOS = [
		{ v: 'dia' as Modo, label: 'Dia', icon: CalendarDays },
		{ v: 'semana' as Modo, label: 'Semana', icon: CalendarRange },
		{ v: 'mes' as Modo, label: 'Mês', icon: LayoutGrid }
	];

	const periodoLabel = $derived.by(() => {
		if (organyze.modo === 'semana') {
			return `${fmtDiaMes(inicioSemana(organyze.dia))} – ${fmtDiaMes(fimSemana(organyze.dia))}`;
		}
		if (organyze.modo === 'mes') {
			return parseISO(organyze.dia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
		}
		return rotuloDia.rel ?? rotuloDia.ext;
	});

	function abrirTarefa(t: Tarefa) {
		modalId = t.id;
	}
	function abrirDia(iso: string) {
		organyze.dia = iso;
		organyze.setModo('dia');
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
	<SelecaoPerfil />
{:else}
	<!-- Sem largura própria: acompanha a coluna de conteúdo do shell, como as
	     demais telas do sistema. -->
	<div class="space-y-4">
		<CabecalhoPerfil legenda="Tarefas do dia" />

		<!-- Período + modos de visualização -->
		<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-5 shadow-xs">
			<div class="flex flex-wrap items-center justify-between gap-3">
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

			{#if organyze.dia !== hoje}
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

		{#if organyze.modo === 'dia'}
			<NovaTarefa />
		{/if}

		{#if organyze.loadingTarefas}
			<div class="flex justify-center py-16 text-grey">
				<span class="size-7 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
			</div>
		{:else if organyze.modo === 'dia'}
			<QuadroDia {hoje} onAbrir={abrirTarefa} />
		{:else if organyze.modo === 'semana'}
			<VisaoSemana {hoje} onAbrir={abrirTarefa} onAbrirDia={abrirDia} />
		{:else}
			<VisaoMes {hoje} onAbrir={abrirTarefa} onAbrirDia={abrirDia} />
		{/if}
	</div>
{/if}

<TarefaModal bind:id={modalId} {hoje} />
