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

<div class="relative overflow-hidden bg-grey-200/50 {r} {extra}" aria-hidden="true">
	<div
		class="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent"
	></div>
</div>
