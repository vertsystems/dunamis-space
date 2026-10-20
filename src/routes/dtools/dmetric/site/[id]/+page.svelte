<script lang="ts">
	// DMetric — a página de um site (um cliente): os números só dele, na ordem
	// em que se lê um relatório — quanto, quando, de onde, o quê e como.
	import { goto, invalidateAll } from '$app/navigation';
	import { Card } from '$lib/components/ui';
	import MapaMundi from '$lib/components/dmetric/MapaMundi.svelte';
	import LugaresDoSite from '$lib/components/dmetric/LugaresDoSite.svelte';
	import LinhaDoTempo from '$lib/components/dmetric/LinhaDoTempo.svelte';
	import EscolhaPeriodo from '$lib/components/dmetric/EscolhaPeriodo.svelte';
	import HorariosPico from '$lib/components/dmetric/HorariosPico.svelte';
	import ListaDimensao from '$lib/components/dmetric/ListaDimensao.svelte';
	import AgoraNoSite from '$lib/components/dmetric/AgoraNoSite.svelte';
	import {
		PERIODOS,
		RECENTES,
		dataBr,
		duracao,
		enderecoDaPagina,
		enderecoDoSite,
		haQuanto,
		nomeDoSite,
		numero,
		serieDoPeriodo,
		serieRecente
	} from '$lib/dmetric/painel';
	import { ROTULO_FAIXA } from '$lib/dmetric/saude';
	import { ArrowLeft, Eye, ExternalLink, Globe, HeartPulse, MousePointerClick, Timer, Tv, Users } from '@lucide/svelte';

	let { data } = $props();

	const nome = $derived(nomeDoSite(data.site));
	const endereco = $derived(enderecoDoSite(data.site));
	const recente = $derived(!!RECENTES[data.periodo]);

	// ---- Filtros (na URL: o link abre no mesmo recorte) ---------------------------
	function filtrar(chave: 'periodo' | 'grafico', valor: string) {
		const p = new URLSearchParams({ periodo: data.periodo });
		if (data.grafico.id !== data.hoje.slice(0, 7)) p.set('grafico', data.grafico.id);
		if (valor && !(chave === 'grafico' && valor === data.hoje.slice(0, 7))) p.set(chave, valor);
		else p.delete(chave);
		goto(`?${p}`, { keepFocus: true, noScroll: true, replaceState: true });
	}
	const voltar = $derived(`/dtools/dmetric?periodo=${data.periodo}`);

	// Na última hora a página se atualiza sozinha, como o painel.
	$effect(() => {
		if (data.periodo !== '1h') return;
		const t = setInterval(() => invalidateAll(), 60_000);
		return () => clearInterval(t);
	});

	// ---- Números --------------------------------------------------------------------
	const p = $derived(data.painel);
	const tempoMedio = $derived(p.visitas ? (p.segundos ?? 0) / p.visitas : 0);
	const porVisita = $derived(p.visitas ? p.visualizacoes / p.visitas : 0);
	const cliques = $derived((p.dimensoes.clique ?? []).reduce((t, c) => t + c.visualizacoes, 0));
	const cliqueMaior = $derived((p.dimensoes.clique ?? []).toSorted((a, b) => b.visualizacoes - a.visualizacoes)[0]);
	const nPaises = $derived(data.lugares.paises.length);
	const nCidades = $derived(data.lugares.cidades.length);
	const decimal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

	const paises = $derived(new Map(data.lugares.paises.map((x) => [x.pais, x.visitas])));
	let paisesAgora = $state<string[]>([]);

	const serie = $derived(
		recente
			? serieRecente(p.serie ?? [])
			: serieDoPeriodo(data.porDia, data.grafico.de, data.grafico.ate, data.hoje, data.primeiroDia)
	);
	const visitasDoGrafico = $derived(data.porDia.reduce((t, d) => t + d.visitas, 0));
	const tituloSerie = $derived(
		data.periodo === '1h' ? 'Visitas a cada 5 minutos' : data.periodo === '24h' ? 'Visitas por hora' : 'Visitas por dia'
	);

	// Páginas: o título que o script mandou; sem título, o endereço completo.
	const titulos = $derived(new Map(data.titulos.map((t) => [t.caminho, t.titulo])));
	const tituloDaPagina = (valor: string) => titulos.get(valor) || enderecoDaPagina(data.site, valor);
	const enderecoDoItem = (item: { valor: string }) => (titulos.get(item.valor) ? enderecoDaPagina(data.site, item.valor) : null);
	const nomePagina = (_site: string, caminho: string) => tituloDaPagina(caminho);

	const temVisitas = $derived(p.visualizacoes > 0);
	const COR_FAIXA = { otima: '#107d4a', melhorar: '#9a6b16', ruim: '#b42318' } as const;

	const selectCls =
		'h-9 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm font-medium text-navy shadow-xs transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25';
</script>

<svelte:head>
	<title>{nome} | DMetric</title>
</svelte:head>

<!-- Cabeçalho: de quem é a página, onde está o site e o recorte -->
<a href={voltar} class="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-grey transition-colors hover:text-navy">
	<ArrowLeft size={14} /> DMetric · todos os sites
</a>

<div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
	<div class="min-w-0 lg:flex-1">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<h1 class="min-w-0 truncate text-xl font-bold text-navy-900 sm:text-2xl" title={nome}>{nome}</h1>
			{#if !data.site.ativo}
				<span class="rounded-full bg-grey-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate">Contagem pausada</span>
			{/if}
			<AgoraNoSite inicial={data.agora} site={data.site.id} {nomePagina} bind:paises={paisesAgora} />
		</div>
		<p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate">
			{#if data.site.dominio}
				<a
					href="https://{endereco}"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 font-medium text-brand hover:underline"
				>
					{endereco}
					<ExternalLink size={12} />
				</a>
			{/if}
			{#if data.primeiroDia}<span>no DMetric desde {dataBr(data.primeiroDia)}</span>{/if}
			{#if data.site.ultima_visita}<span>última visita {haQuanto(data.site.ultima_visita)}</span>{/if}
		</p>
	</div>

	<div class="flex shrink-0 items-center gap-2">
		<a
			href="/dtools/dmetric/tv?site={data.site.id}"
			aria-label="Modo TV deste site"
			title="Modo TV deste site"
			class="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] border border-grey-200 bg-surface text-navy shadow-xs transition-colors hover:border-grey"
		>
			<Tv size={16} />
		</a>
		<select aria-label="Período" class={selectCls} value={data.periodo} onchange={(e) => filtrar('periodo', e.currentTarget.value)}>
			{#each PERIODOS as x (x.id)}<option value={x.id}>{x.rotulo}</option>{/each}
		</select>
	</div>
</div>

<!-- Os números do período -->
<div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
	{#each [
		{ rotulo: 'Visitas', valor: numero(p.visitas), nota: recente ? 'pessoas diferentes no período' : 'cada pessoa conta uma vez por dia', icon: Users },
		{ rotulo: 'Páginas vistas', valor: numero(p.visualizacoes), nota: porVisita ? `${decimal(porVisita)} por visita` : 'nenhuma ainda', icon: Eye },
		{ rotulo: 'Tempo médio', valor: tempoMedio ? duracao(tempoMedio) : '—', nota: 'na tela, por visita', icon: Timer },
		{ rotulo: 'Cliques', valor: numero(cliques), nota: cliqueMaior ? `mais em ${cliqueMaior.valor}` : 'em WhatsApp, links e botões', icon: MousePointerClick },
		{ rotulo: 'Lugares', valor: `${numero(nPaises)} ${nPaises === 1 ? 'país' : 'países'}`, nota: `${numero(nCidades)} ${nCidades === 1 ? 'cidade' : 'cidades'}`, icon: Globe }
	] as t (t.rotulo)}
		{@const Ico = t.icon}
		<Card padding="sm">
			<p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-grey"><Ico size={13} />{t.rotulo}</p>
			<p class="mt-1.5 truncate text-2xl font-bold tabular-nums text-navy-900">{t.valor}</p>
			<p class="mt-0.5 truncate text-[11px] text-grey" title={t.nota}>{t.nota}</p>
		</Card>
	{/each}
	<Card padding="sm">
		<p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-grey"><HeartPulse size={13} />Saúde</p>
		{#if data.saude?.nota != null && data.saude.faixa}
			<p class="mt-1.5 text-2xl font-bold tabular-nums text-navy-900">
				{data.saude.nota}<span class="text-sm font-semibold text-grey">/100</span>
			</p>
			<p class="mt-0.5 truncate text-[11px] font-semibold" style="color: {COR_FAIXA[data.saude.faixa]}">{ROTULO_FAIXA[data.saude.faixa]}</p>
		{:else}
			<p class="mt-1.5 text-2xl font-bold text-navy-900">—</p>
			<p class="mt-0.5 truncate text-[11px] text-grey">sem medidas ainda</p>
		{/if}
	</Card>
</div>

{#if !temVisitas && !data.porDia.length}
	<Card class="border-dashed py-10 text-center">
		<p class="text-sm font-medium text-navy">Este site ainda não teve visitas neste período.</p>
		<p class="mx-auto mt-1 max-w-md text-xs text-grey">Escolha um período maior no canto de cima, ou confira se o código do DMetric está no site.</p>
	</Card>
{:else}
	<!-- Quando: a linha do tempo, com o próprio mês ou calendário -->
	<Card class="mb-5">
		<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
			<div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
				<h2 class="text-base font-bold text-navy">{tituloSerie}</h2>
				{#if !recente}
					<p class="text-[11px] tabular-nums text-grey">
						{numero(visitasDoGrafico)} {visitasDoGrafico === 1 ? 'visita' : 'visitas'}
						{data.grafico.tipo === 'dias' ? `de ${data.grafico.rotulo}` : `em ${data.grafico.rotulo.replace(/^ano de /, '')}`}
					</p>
				{/if}
			</div>
			{#if data.periodo === '1h'}
				<p class="text-[11px] text-grey">atualiza sozinho a cada minuto</p>
			{:else if !recente}
				<EscolhaPeriodo
					escolha={data.grafico}
					meses={data.meses}
					anos={data.anos}
					hoje={data.hoje}
					primeiroDia={data.primeiroDia}
					onescolher={(id) => filtrar('grafico', id)}
				/>
			{/if}
		</div>
		<LinhaDoTempo {serie} />
	</Card>

	<!-- De onde: o mapa e, ao lado, cada país com as suas cidades -->
	<div class="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
		<Card class="lg:col-span-3">
			<h2 class="mb-3 text-base font-bold text-navy">De onde vêm as visitas</h2>
			<MapaMundi valores={paises} pulsando={paisesAgora} />
		</Card>
		<Card class="flex flex-col lg:col-span-2">
			<h2 class="mb-3 flex items-baseline justify-between text-base font-bold text-navy">
				Países e cidades
				<span class="text-xs font-medium text-grey">{numero(nPaises)} · {numero(nCidades)}</span>
			</h2>
			<LugaresDoSite lugares={data.lugares} />
		</Card>
	</div>

	{#if !recente && p.por_hora}
		<Card class="mb-5">
			<div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
				<h2 class="text-base font-bold text-navy">Horários de pico</h2>
				<p class="text-[11px] text-grey">visitas por dia da semana e hora · horário de Brasília</p>
			</div>
			<HorariosPico porHora={p.por_hora} />
		</Card>
	{/if}

	<!-- O quê e como: páginas, origens, cliques e aparelhos -->
	<div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
		<ListaDimensao
			titulo="Páginas mais vistas"
			itens={p.dimensoes.pagina}
			medida="visualizacoes"
			rotular={tituloDaPagina}
			detalhe={enderecoDoItem}
		/>
		<ListaDimensao titulo="De onde chegaram" itens={p.dimensoes.origem} />
		<ListaDimensao
			titulo="Cliques"
			itens={p.dimensoes.clique}
			medida="visualizacoes"
			rotuloMedida="Cliques"
			vazio="Nenhum clique em WhatsApp, telefone ou link para fora."
		/>
		<ListaDimensao titulo="Campanhas" itens={p.dimensoes.campanha} vazio="Nenhum link com utm_campaign neste período." />
		<ListaDimensao titulo="Aparelhos" itens={p.dimensoes.dispositivo} />
		<ListaDimensao titulo="Navegadores" itens={p.dimensoes.navegador} />
		<ListaDimensao titulo="Sistemas" itens={p.dimensoes.sistema} />
	</div>
{/if}
