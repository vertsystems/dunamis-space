<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label: string;
		wrapperClass?: string;
	}

	let { label, id, name, wrapperClass = '', checked = $bindable(), ...rest }: Props = $props();
	const fieldId = $derived(id ?? name);
</script>

<label class="inline-flex items-center gap-2 text-sm text-navy cursor-pointer {wrapperClass}">
	<input
		id={fieldId}
		{name}
		type="checkbox"
		bind:checked
		class="size-4 rounded-[var(--radius-sm)] border-grey-200 text-brand focus-visible:ring-2 focus-visible:ring-brand/40 accent-brand"
		{...rest}
	/>
	{label}
</label>
