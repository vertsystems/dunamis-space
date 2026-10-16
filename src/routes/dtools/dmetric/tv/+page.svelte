<script lang="ts">
	// DMetric — modo TV: para a TV do escritório ou a reunião com o cliente.
	// Mapa pulsando onde tem gente agora, o contador ao vivo, as visitas do dia
	// (contra ontem até a mesma hora), a página do momento e os últimos acessos.
	// Atualiza sozinho a cada 15 segundos, mantém a tela acesa e esconde os
	// botões e o cursor quando ninguém mexe no mouse.
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';
	import { fly } from 'svelte/transition';
	import MapaMundi from '$lib/components/dmetric/MapaMundi.svelte';
	import {
		MINUTOS_AGORA,
		bandeira,
		duracao,
		enderecoDaPagina,
		nomeDoSite,
		nomePais,
		numero,
		porcentagem,
		visitasPorPais
	} from '$lib/dmetric/painel';
	import { haQuantoCurto, horasDeHoje, melhorPagina, variacao, type TvDados } from '$lib/dmetric/tv';
	import {
		ChartSpline,
		Maximize,
		Minimize,
		Monitor,
		Smartphone,
		Tablet,
		TrendingDown,
		TrendingUp,
		Trophy,
		WifiOff,
		X
	} from '@lucide/svelte';

	let { data } = $props();

	// ---- Dados: os do servidor até a primeira atualização ---------------------
	let atualizado = $state<TvDados | null>(null);
	const tv = $derived(atualizado ?? data.tv);
	$effect(() => {
		void data.tv;
		atualizado = null;
	});
	let falhas = $state(0);
	$effect(() => {
		const url = `/dtools/dmetric/tv/dados${data.site ? `?site=${data.site}` : ''}`;
		const t = setInterval(async () => {
			try {
				const r = await fetch(url);
				if (!r.ok) throw new Error(String(r.status));
				atualizado = await r.json();
				falhas = 0;
			} catch {
				falhas++;
			}
		}, 15_000);
		return () => clearInterval(t);
	});

	// ---- Relógio (e o "há 40 s" do feed) --------------------------------------
	let relogio = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (relogio = new Date()), 5_000);
		return () => clearInterval(t);
	});
	const hora = $derived(relogio.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }));
	const dia = $derived(
		relogio.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })
	);

	// ---- Tela: acesa, cheia, e o texto proporcional ao tamanho da TV ----------
	onMount(() => {
		let trava: WakeLockSentinel | null = null;
		const acender = async () => {
			try {
				trava = (await navigator.wakeLock?.request('screen')) ?? null;
			} catch {
				/* navegador sem wake lock, ou aba sem foco: a TV segue a própria configuração */
			}
		};
		acender();
		const aoVoltar = () => document.visibilityState === 'visible' && acender();
		document.addEventListener('visibilitychange', aoVoltar);

		// Tudo no painel é em rem: crescer a fonte da raiz aumenta a tela inteira
		// junto (numa TV de 1920 px, 20 px por rem).
		const html = document.documentElement;
		const antes = html.style.fontSize;
		html.style.fontSize = 'clamp(16px, 1.04vw, 30px)';

		// Uma TV fica dias ligada: recarrega a cada 6 horas para pegar a versão nova.
		const recarga = setTimeout(() => location.reload(), 6 * 3_600_000);
		return () => {
			trava?.release().catch(() => {});
			document.removeEventListener('visibilitychange', aoVoltar);
			html.style.fontSize = antes;
			clearTimeout(recarga);
		};
	});

	let cheia = $state(false);
	function alternarTela() {
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		else document.documentElement.requestFullscreen?.().catch(() => {});
	}

	// Botões e cursor somem depois de 4 s sem mexer o mouse.
	let mexeu = $state(true);
	let parado: ReturnType<typeof setTimeout> | undefined;
	function acordar() {
		mexeu = true;
		clearTimeout(parado);
		parado = setTimeout(() => (mexeu = false), 4_000);
	}
	onMount(() => {
		acordar();
		return () => clearTimeout(parado);
	});
	function teclas(e: KeyboardEvent) {
		if (e.target instanceof HTMLSelectElement) return;
		if (e.key === 'f' || e.key === 'F') alternarTela();
		else if (e.key === 'Escape' && !document.fullscreenElement) goto(voltar);
	}

	const voltar = $derived(`/dtools/dmetric${data.site ? `?site=${data.site}` : ''}`);
	function trocarSite(id: string) {
		goto(id ? `?site=${id}` : '?', { replaceState: true, keepFocus: true, noScroll: true });
	}

	// ---- Números -----------------------------------------------------------------
	const anima = (d = 900) => ({ duration: prefersReducedMotion.current ? 0 : d, easing: cubicOut });
	const pessoas = new Tween(0, anima());
	const visitasHoje = new Tween(0, anima(1200));
	$effect(() => {
		pessoas.set(tv.agora.pessoas, anima());
	});
	$effect(() => {
		visitasHoje.set(tv.hoje.visitas, anima(1200));
	});

	const paises = $derived(visitasPorPais(tv.hoje.paises, []));
	const pulsando = $derived(tv.agora.paises.map((p) => p.pais));
	const comparacao = $derived(variacao(tv.hoje.visitas, tv.ontem.visitas));
	const tempoMedio = $derived(tv.hoje.visitas ? tv.hoje.segundos / tv.hoje.visitas : 0);
	const horas = $derived(horasDeHoje(tv.hoje.serie, relogio));
	const maiorHora = $derived(Math.max(1, ...horas.map((h) => h.visitas)));
	const pico = $derived(horas.reduce((m, h) => (h.visitas > m.visitas ? h : m), horas[0]));
	const horaAtual = $derived(horas.findLast((h) => !h.futura)?.hora ?? 0);

	const sitesPorId = $derived(new Map(data.sites.map((s) => [s.id, s])));
	const titulos = $derived(new Map(data.titulos.map((t) => [`${t.site_id}|${t.caminho}`, t.titulo])));
	const nomePagina = (siteId: string, caminho: string) =>
		titulos.get(`${siteId}|${caminho}`) || enderecoDaPagina(sitesPorId.get(siteId), caminho);
	const melhor = $derived(melhorPagina(tv));
	const siteEscolhido = $derived(data.site ? sitesPorId.get(data.site) : undefined);

	const APARELHO = { Celular: Smartphone, Tablet: Tablet, Computador: Monitor } as const;

	// O mapa ocupa a altura que sobrar, sem esticar: largura = altura × proporção.
	const grande = new MediaQuery('min-width: 1024px');
	let mapaW = $state(0);
	let mapaH = $state(0);
	const larguraMapa = $derived(grande.current && mapaH ? Math.min(mapaW, Math.max(0, mapaH - 48) * (960 / 464)) : null);
</script>

<svelte:head>
	<title>DMetric ao vivo | Dunamis Space</title>
</svelte:head>
<svelte:window onpointermove={acordar} onpointerdown={acordar} onkeydown={teclas} />
<svelte:document onfullscreenchange={() => (cheia = !!document.fullscreenElement)} />

<div class="flex min-h-dvh flex-col gap-4 bg-bg p-4 text-navy lg:h-dvh lg:overflow-hidden lg:p-5 {mexeu ? '' : 'cursor-none'}">
	<!-- Cabeçalho -->
	<!-- No celular, os botões descem para a linha de baixo. -->
	<header class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
		<div class="order-1 flex min-w-0 items-center gap-3">
			<span class="grid size-10 shrink-0 place-items-center rounded-[var(--radius-lg)] bg-brand text-white"><ChartSpline size={22} /></span>
			<div class="min-w-0">
				<p class="flex items-center gap-2 text-xl font-bold leading-tight text-navy-900">
					DMetric
					<span class="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-semibold text-[#107d4a]">
						<span class="relative flex size-2">
							<span class="absolute inline-flex size-full animate-ping rounded-full bg-brand-green opacity-60 motion-reduce:animate-none"></span>
							<span class="relative inline-flex size-2 rounded-full bg-brand-green"></span>
						</span>
						ao vivo
					</span>
				</p>
				<p class="truncate text-sm text-slate">{siteEscolhido ? nomeDoSite(siteEscolhido) : 'Todos os sites'}</p>
			</div>
		</div>

		<div
			class="order-3 flex w-full items-center gap-2 transition-opacity duration-300 sm:order-2 sm:ml-auto sm:w-auto {mexeu
				? 'opacity-100'
				: 'pointer-events-none opacity-0'}"
		>
				<select
					aria-label="Site"
					class="h-9 min-w-0 flex-1 rounded-[var(--radius)] sm:max-w-[16rem] sm:flex-none border border-grey-200 bg-surface px-3 text-sm font-medium text-navy shadow-xs focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
					value={data.site ?? ''}
					onchange={(e) => trocarSite(e.currentTarget.value)}
				>
					<option value="">Todos os sites</option>
					{#each data.sites as s (s.id)}<option value={s.id}>{nomeDoSite(s)}</option>{/each}
				</select>
				<button
					type="button"
					onclick={alternarTela}
					class="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm font-medium text-navy shadow-xs hover:border-grey"
					title="Tecla F"
				>
					{#if cheia}<Minimize size={15} />Sair da tela cheia{:else}<Maximize size={15} />Tela cheia{/if}
				</button>
				<a
					href={voltar}
					class="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-grey-200 bg-surface text-navy shadow-xs hover:border-grey"
					aria-label="Sair do modo TV"
					title="Sair (Esc)"><X size={16} /></a
				>
		</div>
		<div class="order-2 flex items-center gap-4 sm:order-3">
			{#if falhas >= 4}
				<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9a6b16]"><WifiOff size={14} />sem conexão</span>
			{/if}
			<div class="text-right">
				<p class="text-3xl font-bold leading-none tabular-nums text-navy-900">{hora}</p>
				<p class="mt-1 text-xs text-slate first-letter:uppercase">{dia}</p>
			</div>
		</div>
	</header>

	<main class="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,30%)]">
		<!-- Esquerda: mapa e o dia hora a hora -->
		<section class="flex min-h-0 flex-col gap-4">
			<div class="flex min-h-0 flex-1 flex-col rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-5 shadow-sm">
				<div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
					<h2 class="text-lg font-bold text-navy">De onde vêm as visitas hoje</h2>
					<p class="flex items-center gap-1.5 text-xs text-slate">
						<span class="inline-block size-2.5 rounded-full bg-brand-green"></span>
						pulsa onde tem gente agora · {numero(paises.size)}
						{paises.size === 1 ? 'país hoje' : 'países hoje'}
					</p>
				</div>
				<div class="relative min-h-0 flex-1 overflow-hidden" bind:clientWidth={mapaW} bind:clientHeight={mapaH}>
					<div class="mx-auto" style={larguraMapa ? `width: ${larguraMapa}px` : ''}>
						<MapaMundi valores={paises} {pulsando} />
					</div>
				</div>
			</div>

			<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-5 shadow-sm">
				<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
					<h2 class="text-lg font-bold text-navy">Hoje, hora a hora</h2>
					{#if pico.visitas}
						<p class="text-xs text-slate">
							Hora mais movimentada até agora: <b class="font-semibold text-navy">{pico.hora}h</b>
							({numero(pico.visitas)} {pico.visitas === 1 ? 'visita' : 'visitas'})
						</p>
					{/if}
				</div>
				<div
					class="flex h-28 items-end gap-[2px]"
					role="img"
					aria-label="Visitas de hoje por hora. Pico às {pico.hora}h, com {pico.visitas} visitas."
				>
					{#each horas as h (h.hora)}
						<div class="flex h-full flex-1 flex-col justify-end" title="{h.hora}h: {h.visitas} {h.visitas === 1 ? 'visita' : 'visitas'}">
							{#if h.hora === horaAtual || (h.hora === pico.hora && h.visitas)}
								<span class="mb-0.5 text-center text-[0.65rem] font-semibold tabular-nums text-navy-900">{h.visitas}</span>
							{/if}
							{#if h.futura}
								<span class="h-[2px] rounded-full bg-grey-200"></span>
							{:else}
								<span
									class="min-h-[2px] rounded-t-[4px] transition-[height] duration-700"
									style="height: {(h.visitas / maiorHora) * 100}%; background: {h.hora === horaAtual ? '#256abf' : '#9ec5f4'}"
								></span>
							{/if}
						</div>
					{/each}
				</div>
				<div class="mt-1 flex gap-[2px] text-[0.65rem] tabular-nums text-grey" aria-hidden="true">
					{#each horas as h (h.hora)}
						<span class="flex-1 text-center {h.hora === horaAtual ? 'font-bold text-navy' : ''}">
							{h.hora === horaAtual ? 'agora' : h.hora % 3 === 0 ? `${h.hora}h` : ''}
						</span>
					{/each}
				</div>
			</div>
		</section>

		<!-- Direita: agora, hoje, a página do momento e o feed -->
		<section class="flex min-h-0 flex-col gap-4">
			<div class="rounded-[var(--radius-lg)] border border-brand-green/30 bg-surface p-5 shadow-sm">
				<p class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#107d4a]">
					<span class="relative flex size-2.5">
						{#if tv.agora.pessoas}<span class="absolute inline-flex size-full animate-ping rounded-full bg-brand-green opacity-60 motion-reduce:animate-none"></span>{/if}
						<span class="relative inline-flex size-2.5 rounded-full {tv.agora.pessoas ? 'bg-brand-green' : 'bg-grey/50'}"></span>
					</span>
					Agora nos sites
				</p>
				<p class="mt-1 flex items-baseline gap-3">
					<span class="text-7xl font-bold leading-none tabular-nums text-navy-900">{Math.round(pessoas.current)}</span>
					<span class="text-lg font-medium text-slate">{tv.agora.pessoas === 1 ? 'pessoa' : 'pessoas'}</span>
				</p>
				<p class="mt-2 truncate text-xs text-grey">
					{#if tv.agora.cidades.length}
						{tv.agora.cidades.slice(0, 3).map((c) => c.cidade).join(' · ')}
					{:else}
						abriram uma página nos últimos {MINUTOS_AGORA} minutos
					{/if}
				</p>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-4 shadow-sm">
					<p class="text-[0.65rem] font-bold uppercase tracking-wider text-grey">Visitas hoje</p>
					<p class="mt-1 text-4xl font-bold leading-none tabular-nums text-navy-900">{numero(Math.round(visitasHoje.current))}</p>
					{#if comparacao !== null}
						{@const sobe = comparacao >= 0}
						{@const Seta = sobe ? TrendingUp : TrendingDown}
						<p class="mt-1.5 flex items-center gap-1 text-xs font-semibold" style="color: {sobe ? '#107d4a' : '#b42318'}">
							<Seta size={14} />{sobe ? '+' : '−'}{porcentagem(Math.abs(comparacao))}
						</p>
						<p class="truncate text-[0.7rem] text-grey">que ontem até esta hora ({numero(tv.ontem.visitas)})</p>
					{:else}
						<p class="mt-1.5 text-xs text-grey">ontem a esta hora: {numero(tv.ontem.visitas)}</p>
					{/if}
				</div>
				<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-4 shadow-sm">
					<p class="text-[0.65rem] font-bold uppercase tracking-wider text-grey">Páginas vistas</p>
					<p class="mt-1 text-4xl font-bold leading-none tabular-nums text-navy-900">{numero(tv.hoje.visualizacoes)}</p>
					<p class="mt-1.5 truncate text-xs text-grey">
						{tempoMedio ? `${duracao(tempoMedio)} na tela, em média` : 'hoje, até agora'}
					</p>
				</div>
			</div>

			<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-4 shadow-sm">
				<p class="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-grey">
					<Trophy size={13} class="text-[#9a6b16]" />Página do momento
				</p>
				{#if melhor}
					<p class="mt-1.5 line-clamp-2 text-lg font-bold leading-snug text-navy-900">{nomePagina(melhor.site_id, melhor.caminho)}</p>
					<p class="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
						<span class="truncate text-grey">{enderecoDaPagina(sitesPorId.get(melhor.site_id), melhor.caminho)}</span>
						<span class="font-semibold text-navy">
							{numero(melhor.numero)}
							{melhor.agora ? (melhor.numero === 1 ? 'pessoa agora' : 'pessoas agora') : melhor.numero === 1 ? 'visita hoje' : 'visitas hoje'}
						</span>
					</p>
				{:else}
					<p class="mt-1.5 text-sm text-grey">Nenhuma visita hoje ainda.</p>
				{/if}
			</div>

			<div class="flex min-h-[14rem] flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-4 shadow-sm lg:min-h-0">
				<p class="mb-2 text-[0.65rem] font-bold uppercase tracking-wider text-grey">Últimos acessos</p>
				{#if !tv.ultimos.length}
					<p class="text-sm text-grey">Ninguém nas últimas 48 horas.</p>
				{:else}
					<ul class="min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
						{#each tv.ultimos as u (`${u.em}|${u.site_id}|${u.caminho}`)}
							{@const Ap = APARELHO[u.dispositivo as keyof typeof APARELHO] ?? Monitor}
							<li
								class="flex items-start gap-3 border-b border-grey-200/70 py-2 last:border-0"
								in:fly={{ y: -16, duration: prefersReducedMotion.current ? 0 : 450 }}
								animate:flip={{ duration: prefersReducedMotion.current ? 0 : 400 }}
							>
								<span class="mt-0.5 text-xl leading-none" title={u.pais ? nomePais(u.pais) : ''}>{u.pais ? bandeira(u.pais) : '🌐'}</span>
								<div class="min-w-0 flex-1">
									<p class="flex items-baseline justify-between gap-2">
										<span class="truncate text-sm font-semibold text-navy">{u.cidade || (u.pais ? nomePais(u.pais) : 'Lugar desconhecido')}</span>
										<span class="shrink-0 text-[0.7rem] tabular-nums text-grey">{haQuantoCurto(u.em, relogio)}</span>
									</p>
									<p class="flex items-center gap-1.5 text-xs text-slate">
										<Ap size={12} class="shrink-0 text-grey" />
										<span class="truncate">{nomePagina(u.site_id, u.caminho)}</span>
										{#if u.origem && u.origem !== 'Direto'}<span class="shrink-0 text-grey">· via {u.origem}</span>{/if}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	</main>
</div>
