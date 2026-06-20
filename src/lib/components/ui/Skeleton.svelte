<script lang="ts">
	interface Props {
		/** ex: 'h-4 w-32', 'h-10 w-full' */
		class?: string;
		rounded?: 'sm' | 'md' | 'lg' | 'full';
	}

	let { class: extra = 'h-4 w-full', rounded = 'md' }: Props = $props();

	const r = $derived(
		{
			sm: 'rounded-[var(--radius-sm)]',
			md: 'rounded-[var(--radius)]',
			lg: 'rounded-[var(--radius-lg)]',
			full: 'rounded-full'
		}[rounded]
	);
</script>

<div class="animate-pulse bg-grey-200/60 {r} {extra}" aria-hidden="true"></div>
