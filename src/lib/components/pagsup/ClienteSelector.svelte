<script lang="ts">
	import { pagsup } from '$lib/pagsup/store.svelte';
	import { Dropdown } from '$lib/components/ui';
	import type { DropdownItem } from '$lib/components/ui';
	import { Building2 } from '@lucide/svelte';

	// Seletor de cliente compacto (só o ícone) — abre um menu com os clientes.
	const items = $derived<DropdownItem[]>(
		pagsup.clients.map((c) => ({
			label: c.name,
			icon: c.id === pagsup.selectedClientId ? 'check' : undefined,
			onSelect: () => pagsup.selectClient(c.id)
		}))
	);
</script>

<Dropdown
	{items}
	align="end"
	triggerClass="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] border border-grey-200 bg-surface text-brand shadow-xs transition-colors hover:bg-bg hover:border-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
>
	{#snippet trigger()}
		<Building2 size={18} />
		<span class="sr-only">Cliente: {pagsup.selectedClientName} — trocar cliente</span>
	{/snippet}
</Dropdown>
