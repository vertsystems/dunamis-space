<script lang="ts">
	// O portal do cliente: os números do site (ou da página do PageLinks) dele, sem
	// login, com a marca da Dunamis. Lê de cima para baixo como um relatório —
	// quanto, quando, o que deu resultado, de onde e o quê. Imprimir salva em PDF.
	import { enhance } from '$app/forms';
	import logo from '$lib/assets/dspace-logo.svg';
	import { Card } from '$lib/components/ui';
	import LinhaDoTempo from '$lib/components/dmetric/LinhaDoTempo.svelte';
	import Resultados from '$lib/components/dmetric/Resultados.svelte';
	import BotoesDaPagina from '$lib/components/dmetric/BotoesDaPagina.svelte';
	import MapaMundi from '$lib/components/dmetric/MapaMundi.svelte';
	import LugaresDoSite from '$lib/components/dmetric/LugaresDoSite.svelte';
	import ListaDimensao from '$lib/components/dmetric/ListaDimensao.svelte';
	import Variacao from '$lib/components/dmetric/Variacao.svelte';
	import {
		dataBr,
		duracao,
		enderecoDaPagina,
		enderecoDoSite,
		nomeDoSite,
		numero,
		porcentagem,
		rotuloDias,
		rotuloMes,
		serieDoPeriodo,
		somarDias
	} from '$lib/dmetric/painel';
	import { ESCOLHAS_DO_PORTAL } from '$lib/dmetric/portal';
	import { Eye, Globe, Lock, MousePointerClick, Printer, Target, Timer, Users } from '@lucide/svelte';

	let { data, form } = $props();
	let enviando = $state(false);

	/** "outubro de 2026", "1º a 23 de outubro" ou "17/10 a 23/10/2026". */
	function rotuloPeriodo(de: string, ate: string): string {
		const mes = de.slice(0, 7);
		const ultimo = somarDias(`${somarDias(`${mes}-01`, 40).slice(0, 7)}-01`, -1);
		if (de.endsWith('-01') && ate === ultimo) return rotuloMes(mes);
		if (de.endsWith('-01') && ate.slice(0, 7) === mes) return `${rotuloMes(mes)}, até o dia ${Number(ate.slice(8))}`;
		return rotuloDias(de, ate);
	}
</script>

<svelte:head>
	<title>{data.senha ? 'Relatório de acessos' : `${nomeDoSite(data.dados.site)} · Relatório de acessos`}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if data.senha}
	<main class="grid min-h-screen place-items-center bg-bg px-4">
		<Card class="w-full max-w-sm">
			<img src={logo} alt="Dunamis Space" class="mb-5 h-[22px] w-auto" />
			<h1 class="flex items-center gap-2 text-lg font-bold text-navy"><Lock size={18} /> Relatório protegido</h1>
			{#if data.travado}
				<p class="mt-2 text-sm text-slate">Muitas tentativas de senha. Espere 15 minutos e tente de novo.</p>
			{:else}
				<p class="mt-1 text-sm text-slate">Digite a senha que a Dunamis enviou para você.</p>
				<form
					method="POST"
					action="?/entrar"
					class="mt-4 space-y-3"
					use:enhance={() => {
						enviando = true;
						return async ({ update }) => {
							await update();
							enviando = false;
						};
					}}
				>
					<input
						type="password"
						name="senha"
						autocomplete="current-password"
						required
						aria-label="Senha"
						placeholder="Senha"
						class="h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy-900 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
					/>
					{#if form?.erro}<p class="text-xs font-medium text-[#b42318]">{form.erro}</p>{/if}
					<button
						type="submit"
						disabled={enviando}
						class="h-10 w-full rounded-[var(--radius)] bg-brand text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
					>
						{enviando ? 'Entrando…' : 'Ver o relatório'}
					</button>
				</form>
			{/if}
		</Card>
	</main>
{:else}
	{@const d = data.dados}
	{@const p = d.painel}
	{@const nome = nomeDoSite(d.site)}
	{@const endereco = enderecoDoSite(d.site)}
	{@const cliques = p.totais?.clique?.visualizacoes ?? (p.dimensoes.clique ?? []).reduce((t, c) => t + c.visualizacoes, 0)}
	{@const tempoMedio = p.visitas ? (p.segundos ?? 0) / p.visitas : 0}
	{@const comparavel = !!d.primeiro_dia && d.anterior_de > d.primeiro_dia && d.anterior.visitas > 0}
	{@const dica = (n: string) => `Antes: ${n} · ${rotuloPeriodo(d.anterior_de, somarDias(d.de, -1))}`}
	<!-- Resultado só sabe de quem clicou desde 23/10/2026: com menos da metade das visitas
	     do período cobertas, a taxa enganaria o cliente — fica de fora. -->
	{@const resultadosValem = d.conversao.visitas > 0 && (!d.conversao.cortado || d.conversao.visitas * 2 >= p.visitas)}
	{@const taxa = resultadosValem ? d.conversao.converteram / d.conversao.visitas : null}
	{@const titulos = new Map(d.titulos.map((t) => [t.caminho, t.titulo]))}
	{@const paises = new Map(d.lugares.paises.map((x) => [x.pais, x.visitas]))}
	<main class="min-h-screen bg-bg px-4 py-8 print:bg-white print:py-0 sm:py-10">
		<div class="mx-auto w-full max-w-5xl">
			<header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div class="min-w-0">
					<img src={logo} alt="Dunamis Space" class="mb-4 h-[22px] w-auto" />
					<p class="text-[11px] font-bold uppercase tracking-wider text-grey">Relatório de acessos</p>
					<h1 class="truncate text-2xl font-bold text-navy-900">{nome}</h1>
					<p class="mt-1 text-sm text-slate">
						{rotuloPeriodo(d.de, d.ate)}
						{#if d.site.dominio}
							· <a href="https://{endereco}" target="_blank" rel="noopener noreferrer" class="font-medium text-brand hover:underline">{endereco}</a>
						{/if}
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2 print:hidden">
					{#if !d.travado}
						<nav class="inline-flex flex-wrap rounded-full bg-surface p-0.5 shadow-xs" aria-label="Período">
							{#each ESCOLHAS_DO_PORTAL as e (e.p)}
								{@const ativo = data.pedido === e.p || (!data.pedido && e.p === '30d')}
								<a
									href="?p={e.p}"
									data-sveltekit-noscroll
									aria-current={ativo ? 'true' : undefined}
									class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors {ativo ? 'bg-navy text-white' : 'text-grey hover:text-navy'}"
								>
									{e.rotulo}
								</a>
							{/each}
						</nav>
					{/if}
					<button
						type="button"
						onclick={() => window.print()}
						class="inline-flex h-8 items-center gap-1.5 rounded-full border border-grey-200 bg-surface px-3 text-xs font-medium text-navy shadow-xs transition-colors hover:border-grey"
					>
						<Printer size={14} /> Salvar em PDF
					</button>
				</div>
			</header>

			<!-- Os números do período -->
			<div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
				{#each [
					{ rotulo: 'Visitas', valor: numero(p.visitas), nota: 'cada pessoa conta uma vez por dia', icon: Users, atual: p.visitas, antes: comparavel ? d.anterior.visitas : null, d: `${numero(d.anterior.visitas)} visitas` },
					{ rotulo: 'Páginas vistas', valor: numero(p.visualizacoes), nota: p.visitas ? `${(p.visualizacoes / p.visitas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por visita` : '', icon: Eye, atual: p.visualizacoes, antes: comparavel ? d.anterior.visualizacoes : null, d: `${numero(d.anterior.visualizacoes)} páginas vistas` },
					{ rotulo: 'Tempo médio', valor: tempoMedio ? duracao(tempoMedio) : '—', nota: 'na tela, por visita', icon: Timer, atual: tempoMedio, antes: comparavel && d.anterior.segundos ? d.anterior.segundos / d.anterior.visitas : null, d: `${duracao(d.anterior.visitas ? d.anterior.segundos / d.anterior.visitas : 0)} por visita` },
					{ rotulo: 'Cliques', valor: numero(cliques), nota: 'em WhatsApp, links e botões', icon: MousePointerClick, atual: cliques, antes: comparavel ? d.anterior.cliques : null, d: `${numero(d.anterior.cliques)} cliques` },
					{ rotulo: 'Resultados', valor: taxa === null ? '—' : porcentagem(taxa), nota: taxa !== null ? `${numero(d.conversao.converteram)} ${d.conversao.converteram === 1 ? 'visita virou' : 'visitas viraram'} contato` : 'contato pelo WhatsApp, mapa…', icon: Target, atual: 0, antes: null, d: '' }
				] as t (t.rotulo)}
					{@const Ico = t.icon}
					<Card padding="sm">
						<p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-grey"><Ico size={13} />{t.rotulo}</p>
						<div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
							<p class="text-2xl font-bold tabular-nums text-navy-900">{t.valor}</p>
							{#if t.antes !== null}<Variacao atual={t.atual} anterior={t.antes} dica={dica(t.d)} />{/if}
						</div>
						<p class="mt-0.5 truncate text-[11px] text-grey" title={t.nota}>{t.nota}</p>
					</Card>
				{/each}
			</div>

			{#if !p.visualizacoes}
				<Card class="border-dashed py-10 text-center">
					<p class="text-sm font-medium text-navy">Ainda sem visitas neste período.</p>
				</Card>
			{:else}
				<Card class="mb-5 break-inside-avoid">
					<h2 class="mb-2 text-base font-bold text-navy">Visitas por dia</h2>
					<LinhaDoTempo serie={serieDoPeriodo(d.por_dia, d.de, d.ate, data.hoje, d.primeiro_dia)} />
				</Card>

				{#if resultadosValem}
					<div class="break-inside-avoid">
						<Resultados conversao={d.conversao} metas={d.metas} padrao={false} />
					</div>
				{/if}

				{#if data.botoes}
					<BotoesDaPagina dados={data.botoes} visualizacoes={p.visualizacoes} />
				{/if}

				<div class="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
					<Card class="break-inside-avoid lg:col-span-3">
						<h2 class="mb-3 flex items-center gap-1.5 text-base font-bold text-navy"><Globe size={17} /> De onde vêm as visitas</h2>
						<MapaMundi valores={paises} />
					</Card>
					<Card class="flex flex-col break-inside-avoid lg:col-span-2">
						<h2 class="mb-3 flex items-baseline justify-between text-base font-bold text-navy">
							Países e cidades
							<span class="text-xs font-medium text-grey">{numero(d.lugares.paises.length)} · {numero(d.lugares.cidades.length)}</span>
						</h2>
						<LugaresDoSite lugares={d.lugares} />
					</Card>
				</div>

				<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
					<ListaDimensao
						titulo="Páginas mais vistas"
						itens={p.dimensoes.pagina}
						total={p.totais?.pagina?.n}
						medida="visualizacoes"
						rotular={(v) => titulos.get(v) || enderecoDaPagina(d.site, v)}
					/>
					<ListaDimensao titulo="De onde chegaram" itens={p.dimensoes.origem} total={p.totais?.origem?.n} />
					<ListaDimensao
						titulo="Cliques"
						itens={p.dimensoes.clique}
						total={p.totais?.clique?.n}
						medida="visualizacoes"
						rotuloMedida="Cliques"
						vazio="Nenhum clique em WhatsApp, telefone ou link para fora."
					/>
					<ListaDimensao titulo="Aparelhos" itens={p.dimensoes.dispositivo} total={p.totais?.dispositivo?.n} />
				</div>
			{/if}

			<footer class="mt-8 border-t border-grey-200 pt-4 text-center text-[11px] leading-relaxed text-grey">
				<p>Relatório preparado pela <span class="font-semibold text-slate">Dunamis Company</span> com o DMetric · atualizado a cada visita.</p>
				<p>Acessos de robôs e de servidores ficam de fora. Cada pessoa conta uma vez por dia{d.primeiro_dia ? ` · contando desde ${dataBr(d.primeiro_dia)}` : ''}.</p>
			</footer>
		</div>
	</main>
{/if}
