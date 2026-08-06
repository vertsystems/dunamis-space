<script lang="ts">
	// Bloco do Pag's Up na Visão Geral — mesmo formato dos painéis do dashboard:
	// três números do mês/semana e os próximos serviços do cronograma. Só leitura;
	// lançar pagamento continua sendo no app, em /dtools/pagsup.
	import { Card } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { formatBRL } from '$lib/clientes';
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
	<h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-navy">
		<Icon name="pagsup" size={17} /> Pag's Up
	</h2>

	<div class="mb-2 flex items-center justify-between">
		<h3 class="text-xs font-semibold uppercase tracking-wide text-grey">Resumo</h3>
		<a class="text-xs text-brand hover:underline" href="/dtools/pagsup">Abrir Pag's Up</a>
	</div>

	<div class="mb-4 grid grid-cols-3 gap-2">
		<div class="rounded-[var(--radius)] bg-bg p-3">
			<div class="text-xs font-semibold uppercase tracking-wide text-grey">Pago no mês</div>
			<div class="mt-0.5 text-base font-semibold tabular-nums text-brand-green">
				{formatBRL(resumo.pagoMes)}
			</div>
		</div>
		<div class="rounded-[var(--radius)] bg-bg p-3">
			<div class="text-xs font-semibold uppercase tracking-wide text-grey">Próx. 7 dias</div>
			<div class="mt-0.5 text-base font-semibold tabular-nums text-navy">
				{formatBRL(resumo.aPagar7)}
			</div>
		</div>
		<div class="rounded-[var(--radius)] bg-bg p-3">
			<div class="text-xs font-semibold uppercase tracking-wide text-grey">Serviços no mês</div>
			<div class="mt-0.5 text-base font-semibold tabular-nums text-navy">{resumo.servicosMes}</div>
		</div>
	</div>

	{#if resumo.proximos.length}
		<div class="mb-1 text-xs font-semibold uppercase tracking-wide text-grey">
			Próximos do cronograma
		</div>
		<ul class="divide-y divide-grey-200/60">
			{#each resumo.proximos as s (s.id)}
				<li class="flex items-center gap-2 py-1.5 text-sm">
					<span class="w-14 shrink-0 text-xs font-semibold text-grey">{quando(s.data)}</span>
					<span class="min-w-0 flex-1 truncate text-slate" title={`${s.nome} · ${s.servico}`}>
						{s.nome}
						{#if s.servico}<span class="text-grey"> · {s.servico}</span>{/if}
					</span>
					<span class="shrink-0 text-xs tabular-nums text-navy">
						{s.valor === null ? 'A definir' : formatBRL(s.valor)}
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-grey">Nenhum serviço agendado para os próximos 7 dias.</p>
	{/if}
</Card>
