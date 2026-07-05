<script lang="ts">
	import { pagsup } from '$lib/pagsup/store.svelte';
	import { Dropdown, Button, Card } from '$lib/components/ui';
	import type { DropdownItem } from '$lib/components/ui';
	import { Building2 } from '@lucide/svelte';

	let showNew = $state(false);
	let novoNome = $state('');
	let saving = $state(false);

	function openNew() {
		novoNome = '';
		showNew = true;
	}

	async function salvar() {
		if (!novoNome.trim() || saving) return;
		saving = true;
		const c = await pagsup.addClient(novoNome);
		saving = false;
		if (c) showNew = false;
	}

	// Lista de clientes + ação de adicionar um novo no fim do menu.
	const items: DropdownItem[] = $derived([
		...pagsup.clients.map((c) => ({
			label: c.name,
			icon: c.id === pagsup.selectedClientId ? 'check' : undefined,
			onSelect: () => pagsup.selectClient(c.id)
		})),
		{ label: 'Novo cliente…', icon: 'plus', onSelect: openNew }
	]);
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

{#if showNew}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4">
		<Card class="w-80 shadow-xl">
			<h3 class="text-sm font-semibold text-navy mb-1">Novo cliente</h3>
			<p class="text-sm text-grey mb-4">Adicione um cliente para organizar os pagamentos dele.</p>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				autofocus
				bind:value={novoNome}
				onkeydown={(e) => e.key === 'Enter' && salvar()}
				placeholder="Nome do cliente"
				class="h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/80 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
			/>
			<div class="mt-4 flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (showNew = false)}>Cancelar</Button>
				<Button onclick={salvar} loading={saving} disabled={!novoNome.trim()}>Adicionar</Button>
			</div>
		</Card>
	</div>
{/if}
