<script lang="ts">
	import { goto } from '$app/navigation';
	import { PROJETO_STATUS, projetoStatusTone, projetoStatusLabel, projetoTipoLabel } from '$lib/projetos';
	import { Card, Badge, Button, Select } from '$lib/components/ui';

	let { data } = $props();
	let status = $state(data.status);

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<form class="flex items-end gap-2" method="GET">
		<Select name="status" bind:value={status} wrapperClass="w-48">
			<option value="">Todos os status</option>
			{#each PROJETO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
		</Select>
		<Button variant="secondary" type="submit">Filtrar</Button>
	</form>
	<Button onclick={() => goto('/projetos/novo')}>+ Novo projeto</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Projeto</th>
					<th class="px-4 py-3 font-semibold">Cliente</th>
					<th class="px-4 py-3 font-semibold">Tipo</th>
					<th class="px-4 py-3 font-semibold">Responsável</th>
					<th class="px-4 py-3 font-semibold">Prazo</th>
					<th class="px-4 py-3 font-semibold">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.projetos as p (p.id)}
					<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/projetos/${p.id}`)}>
						<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/projetos/${p.id}`}>{p.nome}</a></td>
						<td class="px-4 py-3">{p.cliente?.nome ?? '—'}</td>
						<td class="px-4 py-3">{projetoTipoLabel(p.tipo)}</td>
						<td class="px-4 py-3">{p.responsavel?.nome ?? '—'}</td>
						<td class="px-4 py-3 whitespace-nowrap">{fmtData(p.prazo)}</td>
						<td class="px-4 py-3"><Badge tone={projetoStatusTone(p.status)}>{projetoStatusLabel(p.status)}</Badge></td>
					</tr>
				{:else}
					<tr><td colspan="6" class="px-4 py-12 text-center text-grey">Nenhum projeto ainda. Clique em “Novo projeto”.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
