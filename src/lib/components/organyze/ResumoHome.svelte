<script lang="ts">
	// Bloco do Organyze na Visão Geral — mesmo formato dos painéis do dashboard
	// (Pipeline de vendas / Operação): três números, uma lista curta e o link para
	// a tela cheia. Só leitura: quem marca e edita é o app em /dtools/organyze.
	import { Card } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { corPrioridade, urgencia } from '$lib/organyze/types';
	import type { OrganyzeResumo } from '$lib/organyze/types';

	let { resumo, hoje }: { resumo: OrganyzeResumo; hoje: string } = $props();

	const total = $derived(resumo.pendentes + resumo.concluidas);
	const pct = $derived(total ? Math.round((resumo.concluidas / total) * 100) : 0);
</script>

<Card>
	<h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-navy">
		<Icon name="organyze" size={17} /> Organyze
	</h2>

	{#if resumo.semVinculo}
		<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
			Seu login ainda não está vinculado a um colaborador — o vínculo é feito em
			<a class="underline" href="/equipe">Equipe</a>.
		</div>
	{:else}
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-xs font-semibold uppercase tracking-wide text-grey">Hoje</h3>
			<a class="text-xs text-brand hover:underline" href="/dtools/organyze">Abrir Organyze</a>
		</div>

		<div class="mb-4 grid grid-cols-3 gap-2">
			<div class="rounded-[var(--radius)] bg-bg p-3">
				<div class="text-xs font-semibold uppercase tracking-wide text-grey">Pendentes</div>
				<div class="mt-0.5 text-base font-semibold tabular-nums text-navy">{resumo.pendentes}</div>
			</div>
			<div class="rounded-[var(--radius)] bg-bg p-3">
				<div class="text-xs font-semibold uppercase tracking-wide text-grey">Concluídas</div>
				<div class="mt-0.5 text-base font-semibold tabular-nums text-brand-green">
					{resumo.concluidas}
				</div>
			</div>
			<div class="rounded-[var(--radius)] bg-bg p-3">
				<div class="text-xs font-semibold uppercase tracking-wide text-grey">Atrasadas</div>
				<div
					class="mt-0.5 text-base font-semibold tabular-nums {resumo.atrasadas > 0
						? 'text-brand-danger'
						: 'text-navy'}"
				>
					{resumo.atrasadas}
				</div>
			</div>
		</div>

		{#if total}
			<div class="mb-4 flex items-center gap-3">
				<div class="h-2 flex-1 overflow-hidden rounded-full bg-bg">
					<div class="h-full rounded-full bg-brand" style="width: {pct}%"></div>
				</div>
				<span class="shrink-0 text-xs font-semibold tabular-nums text-grey">{pct}%</span>
			</div>
		{/if}

		{#if resumo.proximas.length}
			<div class="mb-1 text-xs font-semibold uppercase tracking-wide text-grey">
				Primeiras da fila
			</div>
			<ul class="divide-y divide-grey-200/60">
				{#each resumo.proximas as t (t.id)}
					{@const u = urgencia(t.prazo, hoje)}
					<li class="flex items-center gap-2 py-1.5 text-sm">
						<span
							class="size-2 shrink-0 rounded-full"
							style="background: {corPrioridade(t.prioridade)}"
						></span>
						<span class="min-w-0 flex-1 truncate text-slate" title={t.titulo}>{t.titulo}</span>
						{#if u}
							<span class="shrink-0 text-xs" style="color: {u.cor}">{u.label}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-grey">
				{total ? 'Tudo concluído por hoje. 🎉' : 'Nenhuma tarefa para hoje.'}
			</p>
		{/if}
	{/if}
</Card>
