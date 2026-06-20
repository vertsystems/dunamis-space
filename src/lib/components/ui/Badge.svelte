<script lang="ts" module>
	export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

	/** Classes Tailwind por tom — reutilizável fora do Badge (ex.: chips do calendário). */
	export const toneClasses: Record<BadgeTone, string> = {
		neutral: 'bg-bg text-slate',
		brand: 'bg-brand/10 text-brand',
		success: 'bg-brand-green/12 text-brand-green',
		warning: 'bg-brand-amber/15 text-brand-brown',
		danger: 'bg-brand-danger/12 text-brand-danger',
		info: 'bg-navy/10 text-navy'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		tone?: BadgeTone;
		class?: string;
		children: Snippet;
	}

	let { tone = 'neutral', class: extra = '', children }: Props = $props();
</script>

<span
	class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold {toneClasses[
		tone
	]} {extra}"
>
	{@render children()}
</span>
