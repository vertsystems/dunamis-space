<script lang="ts">
	// Bloco do Pag's Up na Visão Geral: um quadro por cliente (nome + os três
	// números dele) e os próximos serviços do cronograma. Só leitura; lançar
	// pagamento continua sendo no app, em /dtools/pagsup.
	//
	// Antes era um resumo só, somando todo mundo — parecia ser de um cliente e não
	// era de nenhum. Com a carteira inteira à vista dá para comparar num relance,
	// e quem não movimentou aparece zerado em vez de sumir.
	import { Card } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { formatBRL } from '$lib/clientes';
	import { caberEmUmaLinha } from '$lib/caberEmUmaLinha';
	import type { PagsupResumo } from '$lib/pagsup/types';

	let { resumo, hoje }: { resumo: PagsupResumo; hoje: string } = $props();

	/** dd/mm — e "Hoje"/"Amanhã" quando for o caso, que é o que se olha na correria. */
	function quando(data: string): string {
		if (data === hoje) return 'Hoje';
		const d = new Date(`${hoje}T12:00:00Z`);
		d.setUTCDate(d.getUTCDate() + 1);
		if (data === d.toISOString().slice(0, 10)) return 'Amanhã';
		const [, m, dia] = data.split('-');
		return `${dia}/${m}`;
	}
</script>

<Card>
	<div class="mb-3 flex items-center justify-between gap-3">
		<h2 class="flex items-center gap-2 text-sm font-semibold text-navy">
			<Icon name="pagsup" size={17} /> Pag's Up
		</h2>
		<a class="text-xs text-brand hover:underline" href="/dtools/pagsup">Abrir Pag's Up</a>
	</div>

	{#if resumo.clientes.length}
		<!-- Um cliente por linha, empilhados: a leitura vira de cima para baixo, e
		     cada valor ganha a largura inteira do card. -->
		<div class="space-y-2">
			{#each resumo.clientes as c (c.clienteId)}
				<div class="rounded-[var(--radius)] border border-grey-200/70 p-2.5">
					<!-- O nome vem antes dos números: sem ele, três valores soltos não
					     dizem de quem são. -->
					<div class="mb-1.5 truncate text-xs font-semibold text-navy" title={c.nome}>
						{c.nome}
					</div>
					<div class="grid grid-cols-3 gap-1.5">
						<div class="rounded-[var(--radius-sm)] bg-bg px-2 py-1.5">
							<div class="text-[0.6rem] font-semibold uppercase tracking-wide text-grey">Pago</div>
							<!-- Encolhe a fonte até caber (mesma ação dos chips do Pag's Up):
							     truncar "R$ 27.139,55" viraria "R$ 27.1…", que não informa nada.
							     Piso de 8px: medido, segura até a casa do milhão sem cortar. -->
							<div
								use:caberEmUmaLinha={{ max: 14, min: 8 }}
								class="mt-0.5 max-w-full overflow-hidden whitespace-nowrap font-semibold tabular-nums {c.pagoMes >
								0
									? 'text-brand-green'
									: 'text-grey'}"
								title={formatBRL(c.pagoMes)}
							>
								{formatBRL(c.pagoMes)}
							</div>
						</div>
						<div class="rounded-[var(--radius-sm)] bg-bg px-2 py-1.5">
							<div class="text-[0.6rem] font-semibold uppercase tracking-wide text-grey">
								Próx. 7d
							</div>
							<div
								use:caberEmUmaLinha={{ max: 14, min: 8 }}
								class="mt-0.5 max-w-full overflow-hidden whitespace-nowrap font-semibold tabular-nums {c.aPagar7 >
								0
									? 'text-navy'
									: 'text-grey'}"
								title={formatBRL(c.aPagar7)}
							>
								{formatBRL(c.aPagar7)}
							</div>
						</div>
						<div class="rounded-[var(--radius-sm)] bg-bg px-2 py-1.5">
							<div class="text-[0.6rem] font-semibold uppercase tracking-wide text-grey">
								Serviços
							</div>
							<div
								class="mt-0.5 text-sm font-semibold tabular-nums {c.servicosMes > 0
									? 'text-navy'
									: 'text-grey'}"
							>
								{c.servicosMes}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-grey">Nenhum cliente cadastrado no Pag's Up.</p>
	{/if}

	{#if resumo.proximos.length}
		<div class="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-grey">
			Próximos do cronograma
		</div>
		<ul class="divide-y divide-grey-200/60">
			{#each resumo.proximos as s (s.id)}
				<li class="flex items-center gap-2 py-1.5 text-sm">
					<span class="w-12 shrink-0 text-xs font-semibold text-grey">{quando(s.data)}</span>
					<span class="min-w-0 flex-1 truncate text-slate" title={`${s.nome} · ${s.servico}`}>
						{s.nome}
						{#if s.cliente}<span class="text-grey"> · {s.cliente}</span>{/if}
					</span>
					<span class="shrink-0 text-xs tabular-nums text-navy">
						{s.valor === null ? 'A definir' : formatBRL(s.valor)}
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-3 text-sm text-grey">Nenhum serviço agendado para os próximos 7 dias.</p>
	{/if}
</Card>
