<script lang="ts">
	// Metas e hábitos do mês. Como na tela de tarefas, aqui ficam só o esqueleto
	// e a navegação de mês — o conteúdo está nos componentes do Organyze.
	import { organyze } from '$lib/organyze/store.svelte';
	import { mesAtual } from '$lib/organyze/ui';
	import Icon from '$lib/components/Icon.svelte';
	import SelecaoPerfil from '$lib/components/organyze/SelecaoPerfil.svelte';
	import CabecalhoPerfil from '$lib/components/organyze/CabecalhoPerfil.svelte';
	import ResumoMes from '$lib/components/organyze/ResumoMes.svelte';
	import ListaMetas from '$lib/components/organyze/ListaMetas.svelte';
	import HabitTracker from '$lib/components/organyze/HabitTracker.svelte';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Inicializa (colaboradores) e recarrega metas quando muda perfil ou mês.
	$effect(() => {
		if (data.supabase) organyze.init(data.supabase, (data.perfil?.id as string | undefined) ?? null);
	});
	$effect(() => {
		// deps: perfil + mês
		void organyze.colaboradorId;
		void organyze.mesMeta;
		if (organyze.supabase && organyze.colaboradorId) {
			organyze.carregarMetas();
			organyze.carregarHabitos();
		}
	});

	const mesCorrente = mesAtual();
	const temResumo = $derived(organyze.metas.length > 0 || organyze.habitos.length > 0);
</script>

<svelte:head>
	<title>Metas do Mês | Organyze</title>
</svelte:head>

{#if organyze.loading}
	<div class="flex flex-col items-center justify-center py-24 text-grey">
		<span class="size-8 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
		<p class="mt-3 text-sm">Carregando…</p>
	</div>
{:else if !organyze.colaboradorId}
	<SelecaoPerfil
		subtitulo="Escolha seu perfil para ver as metas do mês."
		onEscolher={(id) => organyze.selecionarParaMetas(id)}
	/>
{:else}
	<!-- Mesma largura das outras telas: quem manda é a coluna do shell. -->
	<div class="space-y-5">
		<CabecalhoPerfil legenda="Metas do mês" />

		<!-- Mês -->
		<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-5 shadow-xs">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-2 text-brand">
					<Icon name="chart" size={18} />
					<span class="text-sm font-semibold text-grey">Metas de</span>
				</div>
				<div class="flex items-center gap-1">
					<button
						class="grid size-8 place-items-center rounded-full text-grey hover:bg-bg hover:text-navy transition-colors"
						aria-label="Mês anterior"
						onclick={() => organyze.passarMes(-1)}
					>
						<ChevronLeft size={18} />
					</button>
					<div class="min-w-[9.5rem] text-center text-sm font-semibold text-navy capitalize">
						{organyze.mesMetaLabel}
					</div>
					<button
						class="grid size-8 place-items-center rounded-full text-grey hover:bg-bg hover:text-navy transition-colors"
						aria-label="Próximo mês"
						onclick={() => organyze.passarMes(1)}
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{#if organyze.mesMeta !== mesCorrente}
				<button
					class="mt-3 text-xs font-semibold text-brand hover:underline"
					onclick={() => organyze.setMesMeta(mesCorrente)}
				>
					← Voltar para o mês atual
				</button>
			{/if}
		</div>

		{#if temResumo}
			<ResumoMes />
		{/if}

		<ListaMetas />
		<HabitTracker />
	</div>
{/if}
