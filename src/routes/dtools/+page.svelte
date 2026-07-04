<script lang="ts">
	import { DTOOLS_FERRAMENTAS, DTOOLS_ROADMAP, DTOOLS_SOLICITAR_URL } from '$lib/dtools';
	import { Card } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
</script>

<div class="space-y-4">
	<!-- Identidade / boas-vindas (hero) -->
	<Card>
		<div class="flex items-start gap-4">
			<span class="grid size-14 shrink-0 place-items-center rounded-[var(--radius-lg)] bg-brand text-white shadow-md">
				<Icon name="dtools" size={28} />
			</span>
			<div>
				<h1 class="text-2xl font-bold text-navy leading-none">DTools</h1>
				<p class="text-[11px] font-semibold text-grey uppercase tracking-[0.14em] mt-1.5">
					Central de Ferramentas Dunamis
				</p>
				<p class="text-sm text-slate mt-3 max-w-2xl">
					Ferramentas internas da Dunamis, independentes e prontas, rodando dentro do sistema — mesmo
					login, mesmo visual, tudo integrado. Acesse cada ferramenta pelo menu à esquerda.
				</p>
			</div>
		</div>
	</Card>

	<!-- Painéis -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
		<!-- Resumo do hub -->
		<Card>
			<h3 class="text-xs font-semibold text-grey uppercase tracking-wider mb-3">Resumo</h3>
			<div class="grid grid-cols-2 gap-3">
				<div class="rounded-[var(--radius)] bg-bg p-3 text-center">
					<div class="text-2xl font-bold text-navy tabular-nums">{DTOOLS_FERRAMENTAS.length}</div>
					<div class="text-[11px] text-grey font-medium mt-0.5">
						{DTOOLS_FERRAMENTAS.length === 1 ? 'Ferramenta ativa' : 'Ferramentas ativas'}
					</div>
				</div>
				<div class="rounded-[var(--radius)] bg-bg p-3 text-center">
					<div class="text-2xl font-bold text-brand tabular-nums">{DTOOLS_ROADMAP.length}</div>
					<div class="text-[11px] text-grey font-medium mt-0.5">Em breve</div>
				</div>
			</div>
		</Card>

		<!-- Solicitar ferramenta (CTA) -->
		<Card>
			<h3 class="text-base font-semibold text-navy mb-1">Precisa de uma ferramenta?</h3>
			<p class="text-sm text-grey mb-4">
				Tem uma ideia ou uma rotina que dá para automatizar? Solicite uma nova ferramenta para o
				DTools.
			</p>
			<a
				href={DTOOLS_SOLICITAR_URL}
				class="inline-flex w-full items-center justify-center gap-2 h-10 rounded-[var(--radius)] bg-brand text-white font-semibold text-sm no-underline shadow-[0_2px_10px_-2px_rgba(59,110,246,0.55)] transition-all hover:brightness-[1.07] active:scale-[0.98]"
			>
				<Icon name="plus" size={16} /> Solicitar ferramenta
			</a>
		</Card>

		<!-- Em breve / roadmap -->
		<Card>
			<h3 class="text-xs font-semibold text-grey uppercase tracking-wider mb-3">Em breve</h3>
			{#if DTOOLS_ROADMAP.length}
				<ul class="space-y-2">
					{#each DTOOLS_ROADMAP as r (r.label)}
						<li class="flex items-center gap-3">
							<span class="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-bg text-grey">
								<Icon name={r.icon} size={16} />
							</span>
							<span class="text-sm text-slate flex-1">{r.label}</span>
							<span class="text-[10px] font-bold uppercase tracking-wide text-grey bg-bg px-2 py-0.5 rounded-full">
								em breve
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-grey">Novas ferramentas aparecerão aqui em breve.</p>
			{/if}
		</Card>
	</div>
</div>
