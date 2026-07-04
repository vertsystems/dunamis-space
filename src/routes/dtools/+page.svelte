<script lang="ts">
	import { DTOOLS_FERRAMENTAS, DTOOLS_ROADMAP, DTOOLS_SOLICITAR_URL } from '$lib/dtools';
	import { Card } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
</script>

<div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
	<!-- Esquerda: grade de ferramentas -->
	<div>
		<div class="mb-4">
			<h1 class="text-xl font-bold text-navy">DTools — Ferramentas Dunamis</h1>
			<p class="text-sm text-grey">Central de ferramentas internas da Dunamis integradas ao sistema.</p>
		</div>

		{#if DTOOLS_FERRAMENTAS.length}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				{#each DTOOLS_FERRAMENTAS as f (f.href)}
					<a
						class="flex items-center gap-3.5 p-4 rounded-[var(--radius-lg)] border border-grey-200 bg-surface text-navy no-underline h-full transition-shadow hover:border-brand hover:shadow-md"
						href={f.href}
					>
						<span class="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] bg-brand/10 text-brand">
							<Icon name={f.icon} size={22} />
						</span>
						<div>
							<strong>{f.label}</strong>
							{#if f.descricao}<p class="text-sm text-grey mb-0">{f.descricao}</p>{/if}
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="rounded-[var(--radius)] bg-bg px-4 py-3 text-sm text-slate">
				<strong>Nenhuma ferramenta configurada ainda.</strong>
				<p class="mt-1 mb-0">
					Este é o espaço reservado para as ferramentas da Dunamis. Conforme forem definidas, elas
					aparecerão aqui e no menu lateral de DTools.
				</p>
			</div>
		{/if}
	</div>

	<!-- Direita: rail geral do DTools -->
	<aside class="space-y-4">
		<!-- Identidade / boas-vindas -->
		<Card>
			<div class="flex items-center gap-3 mb-3">
				<span class="grid size-11 place-items-center rounded-[var(--radius-lg)] bg-brand text-white shadow-sm">
					<Icon name="dtools" size={22} />
				</span>
				<div>
					<h2 class="text-base font-bold text-navy leading-tight">DTools</h2>
					<p class="text-[11px] font-semibold text-grey uppercase tracking-wider">Central de Ferramentas</p>
				</div>
			</div>
			<p class="text-sm text-slate">
				Ferramentas internas da Dunamis, independentes e prontas, rodando dentro do sistema — mesmo
				login, mesmo visual, tudo integrado.
			</p>
		</Card>

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
	</aside>
</div>
