<script lang="ts">
	import { goto } from '$app/navigation';
	import { funcaoLabel } from '$lib/equipe';
	import { formatBRL } from '$lib/clientes';
	import { Card, Badge, Button } from '$lib/components/ui';

	let { data } = $props();
</script>

<div class="flex items-center justify-between mb-4">
	<h1 class="text-lg font-semibold text-navy">Equipe</h1>
	<Button onclick={() => goto('/equipe/novo')}>+ Novo colaborador</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Nome</th>
					<th class="px-4 py-3 font-semibold">E-mail</th>
					<th class="px-4 py-3 font-semibold">Função</th>
					<th class="px-4 py-3 font-semibold text-right">Custo/hora</th>
					<th class="px-4 py-3 font-semibold">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.colaboradores as c (c.id)}
					<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/equipe/${c.id}`)}>
						<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/equipe/${c.id}`}>{c.nome}</a></td>
						<td class="px-4 py-3">{c.email}</td>
						<td class="px-4 py-3">{funcaoLabel(c.funcao)}</td>
						<td class="px-4 py-3 text-right tabular-nums">{c.custo_hora != null ? formatBRL(c.custo_hora) : '—'}</td>
						<td class="px-4 py-3"><Badge tone={c.ativo ? 'success' : 'neutral'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
					</tr>
				{:else}
					<tr><td colspan="5" class="px-4 py-12 text-center text-grey">Nenhum colaborador ainda. Clique em “Novo colaborador”.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
