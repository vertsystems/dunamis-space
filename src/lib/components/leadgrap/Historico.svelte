<script lang="ts">
	import { Card, Badge, Button, EmptyState } from '$lib/components/ui';
	import type { BadgeTone } from '$lib/components/ui';
	import { leadgrap } from '$lib/leadgrap/store.svelte';

	const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
		queued: { label: 'Na fila', tone: 'neutral' },
		running: { label: 'Em andamento', tone: 'info' },
		done: { label: 'Concluído', tone: 'success' },
		cancelled: { label: 'Cancelado', tone: 'neutral' },
		error: { label: 'Erro', tone: 'danger' }
	};
</script>

<div class="space-y-3">
	<div class="flex justify-end">
		<Button variant="secondary" size="sm" onclick={() => leadgrap.reloadJobs()}>Atualizar</Button>
	</div>
	{#if leadgrap.scrapeJobs.length === 0}
		<Card>
			<EmptyState icon="clock" title="Nenhuma captura ainda" description="As capturas iniciadas aparecem aqui com o resultado de cada busca." />
		</Card>
	{:else}
		<Card padding="none">
			<div class="overflow-x-auto">
				<table class="w-full min-w-[640px] text-sm">
					<thead>
						<tr class="border-b border-grey-200 text-left text-xs text-grey">
							<th class="p-3 font-medium">Busca</th>
							<th class="p-3 font-medium">Status</th>
							<th class="p-3 font-medium">Encontrados</th>
							<th class="p-3 font-medium">Salvos</th>
							<th class="p-3 font-medium">Data</th>
						</tr>
					</thead>
					<tbody>
						{#each leadgrap.scrapeJobs as j (j.id)}
							{@const st = STATUS[j.status] ?? { label: j.status, tone: 'neutral' as BadgeTone }}
							<tr class="border-b border-grey-100">
								<td class="p-3 text-navy">{j.query}</td>
								<td class="p-3"><Badge tone={st.tone}>{st.label}</Badge></td>
								<td class="p-3 text-grey">{j.found}</td>
								<td class="p-3 text-navy">{j.saved}</td>
								<td class="p-3 text-grey">{new Date(j.createdAt).toLocaleString('pt-BR')}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}
</div>
