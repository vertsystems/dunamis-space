<script lang="ts">
	import { DTOOLS_FERRAMENTAS } from '$lib/dtools';
	import { Card } from '$lib/components/ui';
</script>

<Card>
	<h1 class="text-lg font-semibold text-navy">DTools — Ferramentas Dunamis</h1>
	<p class="text-slate mb-4">Central de ferramentas internas da Dunamis integradas ao sistema.</p>

	{#if DTOOLS_FERRAMENTAS.length}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
			{#each DTOOLS_FERRAMENTAS as f (f.href)}
				<a
					class="flex items-center gap-3.5 p-4 rounded-[var(--radius-lg)] border border-grey-200 bg-surface text-navy no-underline h-full transition-shadow hover:border-brand hover:shadow-md"
					href={f.href}
				>
					<span class="text-2xl leading-none">{f.icon}</span>
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
</Card>
