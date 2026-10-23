<script lang="ts">
	// DMetric — acessos dos sites da Dunamis e dos clientes.
	import { goto, invalidateAll } from '$app/navigation';
	import { Card } from '$lib/components/ui';
	import MapaMundi from '$lib/components/dmetric/MapaMundi.svelte';
	import RankingPaises from '$lib/components/dmetric/RankingPaises.svelte';
	import RankingCidades from '$lib/components/dmetric/RankingCidades.svelte';
	import TabelaSites from '$lib/components/dmetric/TabelaSites.svelte';
	import HorariosPico from '$lib/components/dmetric/HorariosPico.svelte';
	import BaixoAcesso from '$lib/components/dmetric/BaixoAcesso.svelte';
	import AgoraNoSite from '$lib/components/dmetric/AgoraNoSite.svelte';
	import LinhaDoTempo from '$lib/components/dmetric/LinhaDoTempo.svelte';
	import EscolhaPeriodo from '$lib/components/dmetric/EscolhaPeriodo.svelte';
	import ListaDimensao from '$lib/components/dmetric/ListaDimensao.svelte';
	import Sites from '$lib/components/dmetric/Sites.svelte';
	import Saude from '$lib/components/dmetric/Saude.svelte';
	import { podeEditar, podeExcluir } from '$lib/permissoes';
	import {
		PERIODOS,
		RECENTES,
		duracao,
		enderecoDaPagina,
		nomeDoSite,
		nomePais,
		numero,
		paginasComBaixoAcesso,
		porcentagem,
		serieDoPeriodo,
		serieRecente,
		visitasPorPais
	} from '$lib/dmetric/painel';
	import { ChartSpline, Globe, Eye, Users, MapPinned, Info, Timer, HeartPulse, Tv } from '@lucide/svelte';

	let { data } = $props();

	// ---- Abas -----------------------------------------------------------------
	type Aba = 'painel' | 'saude' | 'sites';
	const K_ABA = 'dmetric_aba';
	function abaSalva(): Aba {
		try {
			const a = localStorage.getItem(K_ABA);
			return a === 'sites' || a === 'saude' ? a : 'painel';
		} catch {
			return 'painel';
		}
	}
	let aba = $state<Aba>('painel');
	$effect(() => {
		aba = abaSalva();
	});
	function abrir(a: Aba) {
		aba = a;
		try {
			localStorage.setItem(K_ABA, a);
		} catch {
			/* sem armazenamento: só não lembra a aba */
		}
	}

	// ---- Filtros (na URL: o link do painel abre no mesmo recorte) -------------
	function filtrar(chave: 'site' | 'periodo' | 'grafico', valor: string) {
		const p = new URLSearchParams({ periodo: data.periodo, ...(data.site ? { site: data.site } : {}) });
		// A escolha do gráfico por dia só vai na URL quando não é o mês de hoje.
		if (data.grafico.id !== data.hoje.slice(0, 7)) p.set('grafico', data.grafico.id);
		if (valor && !(chave === 'grafico' && valor === data.hoje.slice(0, 7))) p.set(chave, valor);
		else p.delete(chave);
		goto(`?${p}`, { keepFocus: true, noScroll: true, replaceState: true });
	}

	// ---- Números ----------------------------------------------------------------
	const comHistorico = $derived(data.historico.length > 0);
	const totalHistorico = $derived(data.historico.reduce((s, h) => s + h.usuarios, 0));
	const paises = $derived(visitasPorPais(data.painel.dimensoes.pais, data.historico));
	const visitas = $derived(data.painel.visitas + totalHistorico);
	const recebendo = $derived(data.sites.filter((s) => s.ativo && s.ultima_visita).length);
	const lider = $derived.by(() => {
		let melhor: [string, number] | null = null;
		let soma = 0;
		for (const [iso, n] of paises) {
			soma += n;
			if (!melhor || n > melhor[1]) melhor = [iso, n];
		}
		return melhor ? { iso: melhor[0], fatia: melhor[1] / (soma || 1) } : null;
	});
	const temVivo = $derived(data.painel.visualizacoes > 0);
	/** Tempo médio por visita — só do script (o histórico do GA não traz). */
	const tempoMedio = $derived(data.painel.visitas ? (data.painel.segundos ?? 0) / data.painel.visitas : 0);

	let destaque = $state<string | null>(null);
	/** Países com gente no site agora (vem do AgoraNoSite, vai para o mapa pulsar). */
	let paisesAgora = $state<string[]>([]);

	// Alerta de baixo acesso: últimos 30 dias, de todos os sites — ou só do
	// site escolhido no filtro.
	const baixoAcesso = $derived(
		paginasComBaixoAcesso(data.site ? data.sites.filter((s) => s.id === data.site) : data.sites, data.porSite30)
	);

	// ---- Últimas horas ------------------------------------------------------------
	const recente = $derived(!!RECENTES[data.periodo]);
	const serie = $derived(
		recente
			? serieRecente(data.painel.serie ?? [])
			: serieDoPeriodo(data.porDia, data.grafico.de, data.grafico.ate, data.hoje, data.primeiroDia)
	);
	const visitasDoGrafico = $derived(data.porDia.reduce((t, d) => t + d.visitas, 0));
	const tituloSerie = $derived(
		data.periodo === '1h' ? 'Visitas a cada 5 minutos' : data.periodo === '24h' ? 'Visitas por hora' : 'Visitas por dia'
	);

	// Na última hora o painel se atualiza sozinho, como o "tempo real" do Analytics.
	$effect(() => {
		if (data.periodo !== '1h') return;
		const t = setInterval(() => invalidateAll(), 60_000);
		return () => clearInterval(t);
	});

	// Páginas: o título que o script mandou; sem título, o endereço completo.
	const sitesPorId = $derived(new Map(data.sites.map((s) => [s.id, s])));
	const titulos = $derived(new Map(data.titulos.map((t) => [`${t.site_id}|${t.caminho}`, t.titulo])));
	const tituloDaPagina = (valor: string, item: { site_id?: string | null }) =>
		titulos.get(`${item.site_id}|${valor}`) || enderecoDaPagina(sitesPorId.get(item.site_id ?? ''), valor);
	const enderecoDoItem = (item: { valor: string; site_id?: string | null }) =>
		titulos.get(`${item.site_id}|${item.valor}`) ? enderecoDaPagina(sitesPorId.get(item.site_id ?? ''), item.valor) : null;
	const nomePagina = (siteId: string, caminho: string) => tituloDaPagina(caminho, { site_id: siteId });

	const podeEditarSites = $derived(podeEditar(data.permissoes, 'dmetric'));
	const podeExcluirSites = $derived(podeExcluir(data.permissoes, 'dmetric'));

	const selectCls =
		'h-9 rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm font-medium text-navy shadow-xs transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25';
</script>

<svelte:head>
	<title>DMetric | Dunamis Space</title>
</svelte:head>

{#if data.pendente}
	<Card class="border-dashed py-12 text-center">
		<p class="text-sm text-slate">O DMetric ainda não foi ativado no banco (migration 0072).</p>
	</Card>
{:else}
	<!-- Linha 1: abas à esquerda, filtros à direita — os filtros valem para a tela toda. -->
	<div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<div class="flex flex-wrap items-center gap-2">
		<nav class="inline-flex shrink-0 self-start rounded-full bg-bg p-0.5" aria-label="Seções do DMetric">
			{#each [{ id: 'painel', label: 'Painel', icon: ChartSpline }, { id: 'saude', label: 'Saúde', icon: HeartPulse }, { id: 'sites', label: 'Sites', icon: Globe }] as const as item (item.id)}
				{@const Ico = item.icon}
				<button
					type="button"
					onclick={() => abrir(item.id)}
					aria-current={aba === item.id ? 'page' : undefined}
					class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors {aba === item.id
						? 'bg-surface text-navy shadow-sm'
						: 'text-grey hover:text-navy'}"
				>
					<Ico size={15} />{item.label}
					{#if item.id === 'sites'}<span class="tabular-nums text-grey">({data.sites.length})</span>{/if}
				</button>
			{/each}
		</nav>
		{#if aba === 'painel'}
			<AgoraNoSite inicial={data.agora} site={data.site} {nomePagina} bind:paises={paisesAgora} />
		{/if}
		</div>

		{#if aba !== 'sites'}
			<div class="flex flex-wrap items-center gap-2">
				<!-- Modo TV: só o ícone; a explicação aparece ao passar o mouse (ou focar). -->
				<a
					href="/dtools/dmetric/tv{data.site ? `?site=${data.site}` : ''}"
					aria-label="Modo TV: tela cheia para a TV do escritório ou a reunião com o cliente"
					class="group relative grid size-9 shrink-0 place-items-center rounded-[var(--radius)] border border-grey-200 bg-surface text-navy shadow-xs transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
				>
					<Tv size={16} />
					<span
						role="tooltip"
						class="pointer-events-none absolute left-0 top-full z-20 mt-2 w-max max-w-64 rounded-[var(--radius-sm)] bg-navy-900 px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
					>
						Modo TV: tela cheia para a TV do escritório ou a reunião com o cliente
					</span>
				</a>
				<!-- Largura fixa: sem ela, a caixa cresce até o nome de site mais longo. -->
				<select
					aria-label="Site"
					class="{selectCls} w-[17.5rem] max-w-full truncate"
					value={data.site ?? ''}
					onchange={(e) => filtrar('site', e.currentTarget.value)}
				>
					<option value="">Todos os sites</option>
					{#each data.sites as s (s.id)}<option value={s.id}>{nomeDoSite(s)}</option>{/each}
				</select>
				<select
					aria-label="Período"
					class={selectCls}
					value={data.periodo}
					onchange={(e) => filtrar('periodo', e.currentTarget.value)}
				>
					{#each PERIODOS as p (p.id)}<option value={p.id}>{p.rotulo}</option>{/each}
				</select>
			</div>
		{/if}
	</div>

	{#if aba === 'sites'}
		<Sites sites={data.sites} historico={data.resumoHistorico} podeEditar={podeEditarSites} podeExcluir={podeExcluirSites} />
	{:else if aba === 'saude'}
		<Saude saude={data.saude} sites={data.sites} />
	{:else}
		<!-- Indicadores -->
		<div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
			{#each [
				{ rotulo: 'Visitas', valor: numero(visitas), nota: comHistorico ? `inclui ${numero(totalHistorico)} do GA (${data.resumoHistorico.anos})` : recente ? 'pessoas diferentes no período' : 'cada pessoa conta uma vez por dia', icon: Users },
				{ rotulo: 'Páginas vistas', valor: numero(data.painel.visualizacoes), nota: 'registradas pelo script', icon: Eye },
				{ rotulo: 'Tempo médio', valor: tempoMedio ? duracao(tempoMedio) : '—', nota: 'na tela, por visita', icon: Timer },
				{ rotulo: 'Países alcançados', valor: numero(paises.size), nota: lider ? `${porcentagem(lider.fatia)} do ${nomePais(lider.iso)}` : 'nenhum ainda', icon: Globe },
				{ rotulo: 'Sites com o script', valor: `${recebendo} de ${data.sites.length}`, nota: 'recebendo visitas', icon: MapPinned }
			] as t (t.rotulo)}
				{@const Ico = t.icon}
				<Card padding="sm">
					<p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-grey">
						<Ico size={13} />{t.rotulo}
					</p>
					<p class="mt-1.5 text-2xl font-bold tabular-nums text-navy-900">{t.valor}</p>
					<p class="mt-0.5 truncate text-[11px] text-grey" title={t.nota}>{t.nota}</p>
				</Card>
			{/each}
		</div>

		<!-- Mapa + países + cidades -->
		<div class="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
			<Card class="lg:col-span-2">
				<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
					<h2 class="text-base font-bold text-navy">De onde vêm as visitas</h2>
					{#if comHistorico}
						<p class="flex items-center gap-1 text-[11px] text-grey">
							<Info size={12} /> No histórico do GA, cada visita é um "usuário ativo".
						</p>
					{/if}
				</div>
				<MapaMundi valores={paises} bind:destaque pulsando={paisesAgora} />
			</Card>
			<Card class="flex flex-col">
				<h2 class="mb-3 flex items-baseline justify-between text-base font-bold text-navy">
					Países <span class="text-xs font-medium text-grey">{paises.size}</span>
				</h2>
				<RankingPaises valores={paises} bind:destaque />
			</Card>
			<Card class="flex flex-col">
				<h2 class="mb-3 flex items-baseline justify-between text-base font-bold text-navy">
					Cidades
					{#if data.painel.dimensoes.cidade?.length}
						<!-- O total de verdade: a lista vem com as 100 primeiras (0088). -->
						<span class="text-xs font-medium text-grey">{numero(data.painel.totais?.cidade?.n ?? data.painel.dimensoes.cidade.filter((c) => c.valor).length)}</span>
					{/if}
				</h2>
				<RankingCidades itens={data.painel.dimensoes.cidade} total={data.painel.totais?.cidade} />
			</Card>
		</div>

		<!-- Os sites lado a lado, como a tabela do Analytics. -->
		<Card padding="none" class="mb-5 overflow-hidden">
			<div class="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
				<h2 class="text-base font-bold text-navy">Sites</h2>
				<p class="text-[11px] text-grey">Só o que o script do DMetric contou · clique num site para abrir a página dele</p>
			</div>
			<TabelaSites
				sites={data.sites}
				numeros={data.porSite}
				selecionado={data.site}
				onescolher={(id) => goto(`/dtools/dmetric/site/${id}?periodo=${data.periodo}`)}
			/>
		</Card>

		{#if baixoAcesso.length}
			<div class="mb-5"><BaixoAcesso paginas={baixoAcesso} /></div>
		{/if}

		{#if temVivo}
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
						<!-- O gráfico por dia tem a própria escolha: mês, ano inteiro ou dias do calendário. -->
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

			<!-- Nos períodos de dias: em que dia e hora as pessoas chegam. -->
			{#if !recente && data.painel.por_hora}
				<Card class="mb-5">
					<div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
						<h2 class="text-base font-bold text-navy">Horários de pico</h2>
						<p class="text-[11px] text-grey">visitas por dia da semana e hora · horário de Brasília</p>
					</div>
					<HorariosPico porHora={data.painel.por_hora} />
				</Card>
			{/if}

			<div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
				<ListaDimensao
					titulo="Páginas mais vistas"
					itens={data.painel.dimensoes.pagina} total={data.painel.totais?.pagina?.n}
					medida="visualizacoes"
					rotular={tituloDaPagina}
					detalhe={enderecoDoItem}
				/>
				<ListaDimensao titulo="De onde chegaram" itens={data.painel.dimensoes.origem} total={data.painel.totais?.origem?.n} />
				<ListaDimensao
					titulo="Cliques"
					itens={data.painel.dimensoes.clique} total={data.painel.totais?.clique?.n}
					medida="visualizacoes"
					rotuloMedida="Cliques"
					vazio="Nenhum clique em WhatsApp, telefone ou link para fora."
				/>
				<ListaDimensao titulo="Campanhas" itens={data.painel.dimensoes.campanha} total={data.painel.totais?.campanha?.n} vazio="Nenhum link com utm_campaign neste período." />
				<ListaDimensao titulo="Aparelhos" itens={data.painel.dimensoes.dispositivo} total={data.painel.totais?.dispositivo?.n} />
				<ListaDimensao titulo="Navegadores" itens={data.painel.dimensoes.navegador} total={data.painel.totais?.navegador?.n} />
				<ListaDimensao titulo="Sistemas" itens={data.painel.dimensoes.sistema} total={data.painel.totais?.sistema?.n} />
			</div>
		{:else}
			<Card class="border-dashed py-8 text-center">
				<p class="text-sm font-medium text-navy">O script do DMetric ainda não registrou visitas neste recorte.</p>
				<p class="mx-auto mt-1 max-w-md text-xs text-grey">
					Páginas mais vistas, origens, cidades e aparelhos aparecem aqui quando os sites estiverem com o código.
				</p>
				<button type="button" onclick={() => abrir('sites')} class="mt-3 text-sm font-medium text-brand hover:underline">
					Instalar nos sites
				</button>
			</Card>
		{/if}
	{/if}
{/if}
