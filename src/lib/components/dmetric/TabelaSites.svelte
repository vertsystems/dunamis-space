<script lang="ts">
	// Os sites do DMetric lado a lado, como a tabela do Google Analytics: em
	// ordem de páginas vistas, com o total no topo e a fatia de cada site.
	// Clicar num site filtra o painel por ele (clicar de novo volta a todos).
	import { duracao, linhasDosSites, numero, porcentagem, type DMetricSite, type NumerosSite } from '$lib/dmetric/painel';

	let {
		sites,
		numeros,
		selecionado,
		onescolher
	}: {
		sites: DMetricSite[];
		numeros: NumerosSite[];
		/** Site do filtro, se houver: a linha dele fica marcada. */
		selecionado: string | null;
		onescolher: (id: string | null) => void;
	} = $props();

	const dados = $derived(linhasDosSites(sites, numeros));
	const fatia = (n: number, t: number) => (t ? porcentagem(n / t) : '');
	const decimal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

	const th = 'px-3 py-2.5 text-right font-semibold';
</script>

{#if sites.length === 0}
	<p class="py-6 text-center text-sm text-grey">Nenhum site com o código ainda.</p>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full min-w-[760px] border-collapse text-left">
			<thead>
				<tr class="border-b border-grey-200 text-[10px] uppercase tracking-wider text-grey">
					<th scope="col" class="w-10 py-2.5 pl-5 pr-2 font-semibold">Nº</th>
					<th scope="col" class="px-3 py-2.5 font-semibold">Site</th>
					<th scope="col" class={th}>Páginas vistas</th>
					<th scope="col" class={th}>Visitas</th>
					<th scope="col" class={th}>Páginas por visita</th>
					<th scope="col" class={th}>Tempo médio</th>
					<th scope="col" class="{th} pr-5">Cliques</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-grey-200/70">
				<!-- Total no topo, como no Analytics -->
				<tr class="bg-bg/50 text-xs font-bold text-navy-900">
					<td class="py-2.5 pl-5 pr-2"></td>
					<td class="px-3 py-2.5">Total</td>
					<td class="px-3 py-2.5 text-right tabular-nums">{numero(dados.total.visualizacoes)}</td>
					<td class="px-3 py-2.5 text-right tabular-nums">{numero(dados.total.visitas)}</td>
					<td class="px-3 py-2.5 text-right tabular-nums">{dados.total.visitas ? decimal(dados.total.paginasPorVisita) : '—'}</td>
					<td class="px-3 py-2.5 text-right tabular-nums">{dados.total.visitas ? duracao(dados.total.tempoMedio) : '—'}</td>
					<td class="py-2.5 pl-3 pr-5 text-right tabular-nums">{numero(dados.total.cliques)}</td>
				</tr>
				{#each dados.linhas as l, i (l.site.id)}
					{@const marcado = selecionado === l.site.id}
					<tr
						class="cursor-pointer text-xs transition-colors hover:bg-bg/60 {marcado ? 'bg-brand/[0.06]' : ''} {l.site.ativo ? '' : 'opacity-60'}"
						onclick={() => onescolher(marcado ? null : l.site.id)}
					>
						<td class="py-2 pl-5 pr-2 tabular-nums text-grey">{i + 1}</td>
						<td class="px-3 py-2">
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									onescolher(marcado ? null : l.site.id);
								}}
								aria-pressed={marcado}
								class="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded-[var(--radius-sm)]"
							>
								<span class="block font-semibold text-navy">{l.site.nome}</span>
								{#if l.site.dominio && l.site.dominio !== l.site.nome}
									<span class="block text-[11px] text-grey">{l.site.dominio}</span>
								{/if}
							</button>
						</td>
						{#if l.visualizacoes}
							<td class="px-3 py-2 text-right tabular-nums text-navy-900">
								{numero(l.visualizacoes)} <span class="text-grey">({fatia(l.visualizacoes, dados.total.visualizacoes)})</span>
							</td>
							<td class="px-3 py-2 text-right tabular-nums text-navy-900">
								{numero(l.visitas)} <span class="text-grey">({fatia(l.visitas, dados.total.visitas)})</span>
							</td>
							<td class="px-3 py-2 text-right tabular-nums text-slate">{decimal(l.paginasPorVisita)}</td>
							<td class="px-3 py-2 text-right tabular-nums text-slate">{duracao(l.tempoMedio)}</td>
							<td class="py-2 pl-3 pr-5 text-right tabular-nums text-navy-900">
								{numero(l.cliques)}
								{#if l.cliques}<span class="text-grey">({fatia(l.cliques, dados.total.cliques)})</span>{/if}
							</td>
						{:else}
							<td colspan="5" class="py-2 pl-3 pr-5 text-right text-[11px] text-grey">
								{l.site.ativo ? 'sem visitas neste período' : 'pausado'}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
