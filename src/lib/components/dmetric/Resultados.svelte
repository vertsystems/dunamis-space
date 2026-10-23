<script lang="ts">
	// Resultados: quantas visitas deram resultado (clicaram numa meta do site:
	// WhatsApp, Mapa…), o funil visita → clicou em algo → deu resultado e a taxa
	// por origem, campanha, cidade e site. Na página do site, quem edita escolhe o
	// que conta como resultado.
	import { enhance } from '$app/forms';
	import { Card } from '$lib/components/ui';
	import { numero, porcentagem } from '$lib/dmetric/painel';
	import { taxa, type Conversao, type GrupoConversao } from '$lib/dmetric/resultados';
	import { emBrasilia } from '$lib/dmetric/recorte';
	import { dataBr } from '$lib/dmetric/painel';
	import { Target, ChevronDown } from '@lucide/svelte';

	let {
		conversao,
		metas,
		padrao,
		opcoes = null,
		podeEditar = false,
		nomeDoSite = null,
		filtrado = false
	}: {
		conversao: Conversao;
		/** O que conta como resultado (no painel de todos os sites, null: cada site tem as suas). */
		metas: string[] | null;
		padrao: boolean;
		/** Os destinos para escolher as metas (só na página do site). */
		opcoes?: { valor: string; cliques: number; marcada: boolean }[] | null;
		podeEditar?: boolean;
		/** No painel de todos os sites: o nome de cada site, para a quebra por site. */
		nomeDoSite?: ((id: string) => string) | null;
		filtrado?: boolean;
	} = $props();

	const c = $derived(conversao);
	const taxaGeral = $derived(taxa(c.converteram, c.visitas));

	type Aba = 'origem' | 'campanha' | 'cidade' | 'site';
	const ABAS = $derived(
		([['origem', 'Origem'], ['campanha', 'Campanha'], ['cidade', 'Cidade'], ...(nomeDoSite ? [['site', 'Site']] : [])] as [Aba, string][]).filter(
			([a]) => (c.grupos[a] ?? []).length
		)
	);
	let aba = $state<Aba>('origem');
	const abaAtiva = $derived(ABAS.some(([a]) => a === aba) ? aba : (ABAS[0]?.[0] ?? 'origem'));
	const linhas = $derived<GrupoConversao[]>(c.grupos[abaAtiva] ?? []);
	const rotular = (v: string) => (abaAtiva === 'site' && nomeDoSite ? nomeDoSite(v) : v);

	/** "23/10 às 17h33" — de quando a conta começa. */
	function quando(iso: string): string {
		const b = emBrasilia(new Date(iso));
		const min = Math.floor(b.hora * 60);
		return `${dataBr(b.dia).slice(0, 5)} às ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
	}

	const funil = $derived([
		{ rotulo: 'Visitas', n: c.visitas },
		{ rotulo: 'Clicaram em algo', n: c.clicaram },
		{ rotulo: 'Deram resultado', n: c.converteram }
	]);
	let salvando = $state(false);
</script>

<Card class="mb-5">
	<div class="mb-3 flex flex-wrap items-start justify-between gap-2">
		<div class="min-w-0">
			<h2 class="flex items-center gap-1.5 text-base font-bold text-navy"><Target size={17} /> Resultados</h2>
			<p class="mt-0.5 text-[11px] text-grey">
				{#if metas}
					Conta como resultado: <span class="font-medium text-slate">{metas.join(' · ')}</span>{padrao ? ' (o padrão)' : ''}
				{:else}
					Cada site conta os resultados dele (o padrão é WhatsApp, Telefone, E-mail e Mapa)
				{/if}
				{#if filtrado}· com os filtros{/if}
			</p>
		</div>
		{#if opcoes && podeEditar}
			<details class="group relative">
				<summary
					class="flex cursor-pointer list-none items-center gap-1 rounded-[var(--radius)] border border-grey-200 bg-surface px-2.5 py-1.5 text-xs font-medium text-navy shadow-xs transition-colors hover:border-grey [&::-webkit-details-marker]:hidden"
				>
					Escolher o que conta <ChevronDown size={13} class="transition-transform group-open:rotate-180" />
				</summary>
				<form
					method="POST"
					action="?/salvarMetas"
					use:enhance={() => {
						salvando = true;
						return async ({ update }) => {
							await update({ reset: false });
							salvando = false;
						};
					}}
					class="absolute right-0 z-30 mt-1 w-72 rounded-[var(--radius)] border border-grey-200 bg-surface p-3 shadow-lg"
				>
					<p class="mb-2 text-[11px] leading-snug text-grey">
						Marque os cliques que são resultado para este cliente. Sem nenhum marcado, vale o padrão.
					</p>
					<ul class="max-h-64 space-y-0.5 overflow-y-auto pr-1">
						{#each opcoes as o (o.valor)}
							<li>
								<label class="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 text-xs text-navy hover:bg-bg">
									<input type="checkbox" name="meta" value={o.valor} checked={o.marcada} class="accent-[var(--color-brand)]" />
									<span class="min-w-0 flex-1 truncate">{o.valor}</span>
									<span class="tabular-nums text-grey">{o.cliques ? numero(o.cliques) : ''}</span>
								</label>
							</li>
						{/each}
					</ul>
					<button
						type="submit"
						disabled={salvando}
						class="mt-2 w-full rounded-[var(--radius)] bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
					>
						{salvando ? 'Salvando…' : 'Salvar'}
					</button>
				</form>
			</details>
		{/if}
	</div>

	{#if !c.visitas}
		<p class="py-4 text-center text-xs text-grey">
			{c.desde
				? `Nenhuma visita desde ${quando(c.desde)} neste recorte.`
				: 'Os resultados aparecem quando as visitas começarem a clicar — o DMetric passou a saber quem clicou em 23/10/2026.'}
		</p>
	{:else}
		<div class="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,13rem)_1fr]">
			<!-- O número que o cliente entende -->
			<div>
				<p class="text-4xl font-bold tabular-nums text-navy-900">{taxaGeral === null ? '—' : porcentagem(taxaGeral)}</p>
				<p class="mt-1 text-xs text-slate">das visitas deram resultado</p>
				<p class="mt-0.5 text-[11px] tabular-nums text-grey">{numero(c.converteram)} de {numero(c.visitas)} {c.visitas === 1 ? 'visita' : 'visitas'}</p>
			</div>
			<!-- O funil, em barras do mesmo tamanho de régua -->
			<ol class="space-y-2" aria-label="Funil: visitas, quem clicou em algo e quem deu resultado">
				{#each funil as etapa, i (etapa.rotulo)}
					<li>
						<div class="flex items-baseline justify-between gap-2 text-xs">
							<span class="font-medium text-navy">{etapa.rotulo}</span>
							<span class="tabular-nums text-navy-900">
								<span class="font-semibold">{numero(etapa.n)}</span>
								{#if i > 0}<span class="text-grey"> · {porcentagem(etapa.n / c.visitas)}</span>{/if}
							</span>
						</div>
						<div class="mt-1 h-2 rounded-full bg-grey-200/70">
							<div
								class="h-2 rounded-full"
								style="width: {Math.max(etapa.n ? 1.5 : 0, (etapa.n / c.visitas) * 100)}%; background: {i === 2 ? '#107d4a' : i === 1 ? '#2a78d6' : '#9fc3ee'}"
							></div>
						</div>
					</li>
				{/each}
			</ol>
		</div>

		{#if c.metas.length}
			<div class="mt-4 flex flex-wrap gap-1.5">
				{#each c.metas as m (m.valor)}
					<span class="rounded-full bg-[#e7f6ee] px-2.5 py-1 text-[11px] text-[#107d4a]">
						<span class="font-semibold">{m.valor}</span>: {numero(m.visitas)} {m.visitas === 1 ? 'visita' : 'visitas'}
						<span class="text-[#107d4a]/70">({numero(m.cliques)} {m.cliques === 1 ? 'clique' : 'cliques'})</span>
					</span>
				{/each}
			</div>
		{/if}

		{#if ABAS.length}
			<div class="mt-5">
				<div class="mb-2 inline-flex rounded-full bg-bg p-0.5" role="tablist" aria-label="Resultados por">
					{#each ABAS as [id, rotulo] (id)}
						<button
							type="button"
							role="tab"
							aria-selected={abaAtiva === id}
							onclick={() => (aba = id)}
							class="rounded-full px-3 py-1 text-xs font-medium transition-colors {abaAtiva === id ? 'bg-surface text-navy shadow-sm' : 'text-grey hover:text-navy'}"
						>
							Por {rotulo.toLowerCase()}
						</button>
					{/each}
				</div>
				<div class="overflow-x-auto">
					<table class="w-full min-w-[420px] text-left text-xs">
						<thead>
							<tr class="border-b border-grey-200 text-[10px] uppercase tracking-wider text-grey">
								<th scope="col" class="w-1/2 py-2 pr-3 font-semibold">{ABAS.find(([a]) => a === abaAtiva)?.[1]}</th>
								<th scope="col" class="px-3 py-2 text-right font-semibold">Visitas</th>
								<th scope="col" class="px-3 py-2 text-right font-semibold">Resultados</th>
								<th scope="col" class="py-2 pl-3 text-right font-semibold">Taxa</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-grey-200/70">
							{#each linhas.slice(0, 10) as l (l.valor)}
								{@const t = taxa(l.resultados, l.visitas)}
								<tr>
									<td class="max-w-0 truncate py-1.5 pr-3 font-medium text-navy" title={rotular(l.valor)}>{rotular(l.valor)}</td>
									<td class="px-3 py-1.5 text-right tabular-nums text-slate">{numero(l.visitas)}</td>
									<td class="px-3 py-1.5 text-right tabular-nums text-navy-900">{numero(l.resultados)}</td>
									<td class="py-1.5 pl-3 text-right font-semibold tabular-nums text-navy-900">{t === null ? '—' : porcentagem(t)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}

	{#if c.cortado && c.desde}
		<p class="mt-3 text-[11px] leading-snug text-grey">
			Contando desde {quando(c.desde)}, quando o DMetric passou a saber quem clicou — antes disso, só o total de cliques.
		</p>
	{/if}
</Card>
