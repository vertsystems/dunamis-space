<script lang="ts" module>
	import type { ColumnDef, Row } from '@tanstack/table-core';
	/** Meta por coluna: rótulo do cabeçalho + classe do <th> (ex.: alinhamento). */
	export type ColMeta = { label: string; thClass?: string };
	export type { ColumnDef, Row };
</script>

<script lang="ts" generics="T">
	// Tabela com ordenação client-side (motor do TanStack Table). As linhas são
	// renderizadas pelo caller via snippet `row` → mantém estilo/links/badges do DS.
	import type { Snippet } from 'svelte';
	import {
		createTable,
		getCoreRowModel,
		getSortedRowModel,
		type SortingState,
		type Updater
	} from '@tanstack/table-core';

	let {
		columns,
		data,
		row,
		empty,
		initialSort = [],
		class: extra = ''
	}: {
		columns: ColumnDef<T, unknown>[];
		data: T[];
		/** Renderiza um <tr> por linha. Use r.original para acessar o dado. */
		row: Snippet<[Row<T>]>;
		/** Conteúdo quando não há linhas (ex.: <tr><td colspan><EmptyState/></td></tr>). */
		empty?: Snippet;
		initialSort?: SortingState;
		class?: string;
	} = $props();

	let sorting = $state<SortingState>(initialSort);

	const table = createTable<T>({
		get data() {
			return data;
		},
		columns,
		state: {
			get sorting() {
				return sorting;
			},
			// createTable() usa exatamente o objeto passado aqui, sem preencher
			// defaults das outras features — getHeaderGroups() sempre lê
			// columnPinning.left/right internamente, então sem isso quebra em
			// TODA tabela (mesmo sem nenhuma coluna fixada).
			columnPinning: { left: [], right: [] }
		},
		onSortingChange: (updater: Updater<SortingState>) => {
			sorting = typeof updater === 'function' ? updater(sorting) : updater;
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onStateChange() {},
		renderFallbackValue: null
	});

	const headerGroups = $derived(table.getHeaderGroups());
	const rows = $derived(table.getRowModel().rows);
</script>

<div class="overflow-x-auto {extra}">
	<table class="w-full text-sm">
		<thead>
			{#each headerGroups as hg (hg.id)}
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					{#each hg.headers as header (header.id)}
						{@const meta = header.column.columnDef.meta as ColMeta | undefined}
						{@const dir = header.column.getIsSorted()}
						<th class="px-4 py-3 font-semibold {meta?.thClass ?? ''}">
							{#if header.column.getCanSort()}
								<button
									type="button"
									class="inline-flex select-none items-center gap-1 transition-colors hover:text-navy focus-visible:outline-none focus-visible:text-navy"
									onclick={header.column.getToggleSortingHandler()}
								>
									{meta?.label ?? ''}
									<span class="text-[0.6rem] {dir ? 'text-brand' : 'text-grey-200'}"
										>{dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '↕'}</span
									>
								</button>
							{:else}
								{meta?.label ?? ''}
							{/if}
						</th>
					{/each}
				</tr>
			{/each}
		</thead>
		<tbody>
			{#each rows as r (r.id)}
				{@render row(r)}
			{:else}
				{#if empty}{@render empty()}{/if}
			{/each}
		</tbody>
	</table>
</div>
