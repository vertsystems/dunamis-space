<script lang="ts">
	import { Card, Badge, EmptyState, toneClasses } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();
	const total = $derived(data.notificacoes.length);
</script>

<div class="flex items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-base font-semibold text-navy">Notificações</h1>
		<p class="text-sm text-grey">Tudo que precisa de atenção, em um só lugar.</p>
	</div>
	<Badge tone={total ? 'danger' : 'success'}>
		{total ? `${total} ${total === 1 ? 'alerta' : 'alertas'}` : 'Tudo em dia'}
	</Badge>
</div>

<Card padding="none" class="overflow-hidden">
	{#each data.notificacoes as n (n.id)}
		<a
			href={n.href}
			class="flex items-start gap-3 px-4 py-3 border-b border-grey-200/60 last:border-0 hover:bg-bg"
		>
			<span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius)] {toneClasses[n.tone]}">
				<Icon name={n.icon} size={16} />
			</span>
			<div class="min-w-0 flex-1">
				<div class="text-xs uppercase tracking-wide font-semibold text-grey">{n.tipo}</div>
				<div class="text-sm font-medium text-navy">{n.titulo}</div>
				<div class="text-xs text-grey truncate">{n.detalhe}</div>
			</div>
			<span class="self-center shrink-0 text-grey"><Icon name="chevron" size={16} /></span>
		</a>
	{:else}
		<EmptyState icon="bell" title="Tudo em dia" description="Nenhuma notificação no momento." />
	{/each}
</Card>
