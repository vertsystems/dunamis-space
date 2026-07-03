<script lang="ts" module>
	export type DropdownItem = {
		label: string;
		icon?: string;
		onSelect: () => void;
		danger?: boolean;
	};
</script>

<script lang="ts">
	// Menu de ações acessível (teclado, foco, posicionamento, click-outside) sobre Bits UI.
	import type { Snippet } from 'svelte';
	import { DropdownMenu } from 'bits-ui';
	import Icon from '$lib/components/Icon.svelte';

	let {
		items,
		align = 'end',
		triggerClass = '',
		trigger
	}: {
		items: DropdownItem[];
		align?: 'start' | 'center' | 'end';
		triggerClass?: string;
		/** conteúdo do gatilho (renderizado dentro do botão do menu) */
		trigger: Snippet;
	} = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class={triggerClass}>
		{@render trigger()}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			{align}
			sideOffset={6}
			class="z-50 min-w-44 rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-1 shadow-lg focus:outline-none"
		>
			{#each items as it (it.label)}
				<DropdownMenu.Item
					onSelect={it.onSelect}
					class="flex w-full cursor-pointer select-none items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-left text-sm transition-colors focus:outline-none {it.danger
						? 'text-brand-danger data-[highlighted]:bg-brand-danger/10'
						: 'text-navy data-[highlighted]:bg-bg'}"
				>
					{#if it.icon}<Icon name={it.icon} size={15} />{/if}
					{it.label}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
