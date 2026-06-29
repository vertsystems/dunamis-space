<script lang="ts" module>
	export type ProcessoRow = {
		id: string;
		numero: string | null;
		nome: string;
		secretaria: string | null;
		responsavel: string | null;
		prazo: string | null;
		situacao: string;
		etapas: Record<string, string> | null;
	};
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { PROCESSO_ETAPAS, etapaCelula, situacaoTone, situacaoLabel, type EtapaStatus } from '$lib/processos';
	import { Badge } from '$lib/components/ui';

	let { processos, showLegend = true }: { processos: ProcessoRow[]; showLegend?: boolean } = $props();

	function fmtPrazo(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

{#if showLegend}
	<div class="flex flex-wrap items-center gap-4 text-xs text-slate mb-3">
		<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-brand-green"></span>Concluído</span>
		<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-blue-600"></span>Em andamento</span>
		<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-grey-200"></span>Pendente</span>
		<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-brand-danger"></span>Atrasado/Devolvido</span>
	</div>
{/if}

<div class="overflow-x-auto">
	<table class="w-full text-sm border-collapse">
		<thead>
			<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
				<th class="px-3 py-3 font-semibold">#</th>
				<th class="px-3 py-3 font-semibold">Processo</th>
				<th class="px-3 py-3 font-semibold">Secretaria</th>
				<th class="px-3 py-3 font-semibold">Responsável</th>
				{#each PROCESSO_ETAPAS as e (e.key)}
					<th class="px-2 py-3 font-semibold text-center whitespace-nowrap">{e.label}</th>
				{/each}
				<th class="px-3 py-3 font-semibold">Prazo</th>
				<th class="px-3 py-3 font-semibold">Situação</th>
			</tr>
		</thead>
		<tbody>
			{#each processos as p, i (p.id)}
				<tr
					class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
					onclick={() => goto(`/processos/${p.id}`)}
				>
					<td class="px-3 py-3 text-grey">{i + 1}</td>
					<td class="px-3 py-3">
						<a class="font-medium text-navy hover:text-brand" href={`/processos/${p.id}`}>{p.nome}</a>
						{#if p.numero}<div class="text-xs text-grey">{p.numero}</div>{/if}
					</td>
					<td class="px-3 py-3 whitespace-nowrap">{p.secretaria ?? '—'}</td>
					<td class="px-3 py-3 whitespace-nowrap">{p.responsavel ?? '—'}</td>
					{#each PROCESSO_ETAPAS as e (e.key)}
						{@const cel = etapaCelula(p.etapas?.[e.key] as EtapaStatus | undefined)}
						<td class="px-2 py-3 text-center">
							<span
								class="inline-flex size-7 items-center justify-center rounded-md text-sm font-bold {cel.cls}"
								title={e.label}
							>{cel.glyph}</span>
						</td>
					{/each}
					<td class="px-3 py-3 whitespace-nowrap">{fmtPrazo(p.prazo)}</td>
					<td class="px-3 py-3"><Badge tone={situacaoTone(p.situacao)}>{situacaoLabel(p.situacao)}</Badge></td>
				</tr>
			{:else}
				<tr>
					<td colspan={PROCESSO_ETAPAS.length + 6} class="px-3 py-12 text-center text-grey">
						Nenhum processo cadastrado ainda.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
