<script lang="ts">
	import { Card, Button, EmptyState } from '$lib/components/ui';
	import { leadgrap } from '$lib/leadgrap/store.svelte';
	import type { ActivityDTO } from '$lib/leadgrap/types';

	let atividades = $state<ActivityDTO[]>([]);
	let carregando = $state(true);
	let carregandoMais = $state(false);
	let temMais = $state(false);

	async function carregar(before?: string) {
		const lote = await leadgrap.loadActivitiesFeed(before);
		temMais = lote.length === 30;
		if (before) atividades = [...atividades, ...lote];
		else atividades = lote;
	}

	$effect(() => {
		carregar().finally(() => (carregando = false));
	});

	async function mais() {
		const last = atividades[atividades.length - 1];
		if (!last) return;
		carregandoMais = true;
		await carregar(last.createdAt);
		carregandoMais = false;
	}
</script>

<div class="mx-auto max-w-3xl">
	{#if carregando}
		<div class="flex justify-center py-16 text-grey">
			<span class="size-7 animate-spin rounded-full border-2 border-grey-200 border-t-brand"></span>
		</div>
	{:else if atividades.length === 0}
		<Card>
			<EmptyState
				icon="clock"
				title="Nenhuma atividade ainda"
				description="Ações como mudar de estágio, contatar ou atribuir um lead aparecem aqui."
			/>
		</Card>
	{:else}
		<Card padding="none">
			<ul class="divide-y divide-grey-100">
				{#each atividades as a (a.id)}
					<li class="flex gap-3 p-4 text-sm">
						<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand/60"></span>
						<div class="min-w-0">
							<p class="text-navy">
								{#if a.userName}<span class="font-medium">{a.userName}</span> — {/if}{a.message} em
								<span class="font-medium">{a.leadName}</span>
							</p>
							<p class="text-xs text-grey">{new Date(a.createdAt).toLocaleString('pt-BR')}</p>
						</div>
					</li>
				{/each}
			</ul>
		</Card>
		{#if temMais}
			<div class="mt-4 flex justify-center">
				<Button variant="secondary" size="sm" disabled={carregandoMais} onclick={mais}>
					{carregandoMais ? 'Carregando…' : 'Carregar mais'}
				</Button>
			</div>
		{/if}
	{/if}
</div>
