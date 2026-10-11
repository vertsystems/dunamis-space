<script lang="ts">
	// DMetric — acessos dos sites da Dunamis e dos clientes.
	import { goto } from '$app/navigation';
	import { Card } from '$lib/components/ui';
	import MapaMundi from '$lib/components/dmetric/MapaMundi.svelte';
	import RankingPaises from '$lib/components/dmetric/RankingPaises.svelte';
	import RankingCidades from '$lib/components/dmetric/RankingCidades.svelte';
	import TabelaSites from '$lib/components/dmetric/TabelaSites.svelte';
	import LinhaDoTempo from '$lib/components/dmetric/LinhaDoTempo.svelte';
	import ListaDimensao from '$lib/components/dmetric/ListaDimensao.svelte';
	import Sites from '$lib/components/dmetric/Sites.svelte';
	import { podeEditar, podeExcluir } from '$lib/permissoes';
	import { PERIODOS, duracao, nomePais, numero, porcentagem, visitasPorPais } from '$lib/dmetric/painel';
	import { ChartSpline, Globe, Eye, Users, MapPinned, Info, Timer } from '@lucide/svelte';

	let { data } = $props();

	// ---- Abas -----------------------------------------------------------------
	type Aba = 'painel' | 'sites';
	const K_ABA = 'dmetric_aba';
	function abaSalva(): Aba {
		try {
			return localStorage.getItem(K_ABA) === 'sites' ? 'sites' : 'painel';
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
	function filtrar(chave: 'site' | 'periodo', valor: string) {
		const p = new URLSearchParams({ periodo: data.periodo, ...(data.site ? { site: data.site } : {}) });
		if (valor) p.set(chave, valor);
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

	const rotuloPagina = (v: string) => (v === '/' ? '/ (página inicial)' : v);

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
		<nav class="inline-flex shrink-0 self-start rounded-full bg-bg p-0.5" aria-label="Seções do DMetric">
			{#each [{ id: 'painel', label: 'Painel', icon: ChartSpline }, { id: 'sites', label: 'Sites', icon: Globe }] as const as item (item.id)}
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
			<div class="flex flex-wrap items-center gap-2">
				<select
					aria-label="Site"
					class={selectCls}
					value={data.site ?? ''}
					onchange={(e) => filtrar('site', e.currentTarget.value)}
				>
					<option value="">Todos os sites</option>
					{#each data.sites as s (s.id)}<option value={s.id}>{s.nome}</option>{/each}
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
	{:else}
		<!-- Indicadores -->
		<div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
			{#each [
				{ rotulo: 'Visitas', valor: numero(visitas), nota: comHistorico ? `inclui ${numero(totalHistorico)} do GA (${data.resumoHistorico.anos})` : 'cada pessoa conta uma vez por dia', icon: Users },
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
				<MapaMundi valores={paises} bind:destaque />
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
						<span class="text-xs font-medium text-grey">{data.painel.dimensoes.cidade.filter((c) => c.valor).length}</span>
					{/if}
				</h2>
				<RankingCidades itens={data.painel.dimensoes.cidade} />
			</Card>
		</div>

		<!-- Os sites lado a lado, como a tabela do Analytics. -->
		<Card padding="none" class="mb-5 overflow-hidden">
			<div class="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
				<h2 class="text-base font-bold text-navy">Sites</h2>
				<p class="text-[11px] text-grey">Só o que o script do DMetric contou · clique num site para filtrar o painel</p>
			</div>
			<TabelaSites
				sites={data.sites}
				numeros={data.porSite}
				selecionado={data.site}
				onescolher={(id) => filtrar('site', id ?? '')}
			/>
		</Card>

		{#if temVivo}
			<Card class="mb-5">
				<h2 class="mb-2 text-base font-bold text-navy">Visitas por dia</h2>
				<LinhaDoTempo pontos={data.painel.por_dia} de={data.de} ate={data.ate} />
			</Card>

			<div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
				<ListaDimensao titulo="Páginas mais vistas" itens={data.painel.dimensoes.pagina} medida="visualizacoes" rotular={rotuloPagina} />
				<ListaDimensao titulo="De onde chegaram" itens={data.painel.dimensoes.origem} />
				<ListaDimensao
					titulo="Cliques"
					itens={data.painel.dimensoes.clique}
					medida="visualizacoes"
					rotuloMedida="Cliques"
					vazio="Nenhum clique em WhatsApp, telefone ou link para fora."
				/>
				<ListaDimensao titulo="Campanhas" itens={data.painel.dimensoes.campanha} vazio="Nenhum link com utm_campaign neste período." />
				<ListaDimensao titulo="Aparelhos" itens={data.painel.dimensoes.dispositivo} />
				<ListaDimensao titulo="Navegadores" itens={data.painel.dimensoes.navegador} />
				<ListaDimensao titulo="Sistemas" itens={data.painel.dimensoes.sistema} />
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
