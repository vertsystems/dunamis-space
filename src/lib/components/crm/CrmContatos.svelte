<script lang="ts">
	import { Badge, Card, Input, Select } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { formatBRL, type Contato } from '$lib/crm';

	let {
		contatos = [],
		onOpen
	}: {
		contatos?: Contato[];
		onOpen: (id: string) => void;
	} = $props();

	let busca = $state('');
	let origemFiltro = $state('');

	const origens = $derived([...new Set(contatos.map((c) => c.origem).filter(Boolean))] as string[]);

	const filtrados = $derived.by(() => {
		const q = busca.trim().toLowerCase();
		return contatos.filter((c) => {
			if (origemFiltro && c.origem !== origemFiltro) return false;
			if (q) {
				const alvo = `${c.nome} ${c.empresa ?? ''} ${c.email ?? ''}`.toLowerCase();
				if (!alvo.includes(q)) return false;
			}
			return true;
		});
	});
</script>

<div class="flex flex-wrap items-end gap-2 mb-3">
	<Input type="search" placeholder="Buscar contato" bind:value={busca} wrapperClass="w-64" />
	<Select bind:value={origemFiltro} wrapperClass="w-44" aria-label="Origem">
		<option value="">Todas as origens</option>
		{#each origens as o (o)}
			<option value={o}>{o}</option>
		{/each}
	</Select>
	<span class="text-sm text-grey ml-auto">{filtrados.length} contato(s)</span>
</div>

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Contato</th>
					<th class="px-4 py-3 font-semibold">Empresa</th>
					<th class="px-4 py-3 font-semibold">Origem</th>
					<th class="px-4 py-3 font-semibold">Responsável</th>
					<th class="px-4 py-3 font-semibold text-right">Negócios</th>
					<th class="px-4 py-3 font-semibold text-right">Valor total</th>
					<th class="px-4 py-3 font-semibold">Tags</th>
				</tr>
			</thead>
			<tbody>
				{#each filtrados as c (c.id)}
					<tr
						class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
						onclick={() => onOpen(c.id)}
					>
						<td class="px-4 py-3">
							<div class="font-medium text-navy">{c.nome}</div>
							{#if c.email}<div class="text-xs text-grey truncate">{c.email}</div>{/if}
						</td>
						<td class="px-4 py-3 text-slate">{c.empresa ?? '—'}</td>
						<td class="px-4 py-3">
							{#if c.origem}<Badge tone="neutral">{c.origem}</Badge>{:else}<span class="text-grey">—</span>{/if}
						</td>
						<td class="px-4 py-3 text-slate whitespace-nowrap">{c.responsavel_nome ?? '—'}</td>
						<td class="px-4 py-3 text-right tabular-nums text-slate">{c.negocios_qtd}</td>
						<td class="px-4 py-3 text-right tabular-nums text-navy">{formatBRL(c.valor_total)}</td>
						<td class="px-4 py-3">
							<div class="flex flex-wrap gap-1">
								{#each c.tags.slice(0, 3) as t (t)}
									<span class="rounded-full bg-bg text-slate text-[0.68rem] px-1.5 py-0.5">{t}</span>
								{/each}
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-4 py-12 text-center text-grey">
							<div class="flex flex-col items-center gap-2">
								<Icon name="contact" size={28} />
								Nenhum contato ainda.
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
