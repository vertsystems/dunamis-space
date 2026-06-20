<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, Badge, Button, Input } from '$lib/components/ui';
	let { data } = $props();
	let q = $state(data.q);
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<form class="flex items-end gap-2" method="GET">
		<Input type="search" name="q" placeholder="Buscar por título" bind:value={q} wrapperClass="w-64" />
		<Button variant="secondary" type="submit">Buscar</Button>
	</form>
	<Button onclick={() => goto('/base-conhecimento/novo')}>+ Novo artigo</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Título</th>
					<th class="px-4 py-3 font-semibold">Categoria</th>
					<th class="px-4 py-3 font-semibold">Cliente</th>
					<th class="px-4 py-3 font-semibold">Tags</th>
				</tr>
			</thead>
			<tbody>
				{#each data.artigos as a (a.id)}
					<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/base-conhecimento/${a.id}`)}>
						<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/base-conhecimento/${a.id}`}>{a.titulo}</a></td>
						<td class="px-4 py-3">{a.categoria ?? '—'}</td>
						<td class="px-4 py-3">{a.cliente?.nome ?? 'Geral'}</td>
						<td class="px-4 py-3">
							<div class="flex flex-wrap gap-1">
								{#each a.tags ?? [] as t (t)}<Badge tone="neutral">{t}</Badge>{/each}
							</div>
						</td>
					</tr>
				{:else}
					<tr><td colspan="4" class="px-4 py-12 text-center text-grey">Nenhum artigo ainda. Documente processos e padrões aqui.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
