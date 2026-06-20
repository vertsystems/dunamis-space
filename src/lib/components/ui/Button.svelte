<script lang="ts" module>
	export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
	export type ButtonSize = 'sm' | 'md' | 'lg';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: ButtonVariant;
		size?: ButtonSize;
		block?: boolean;
		loading?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		block = false,
		loading = false,
		disabled = false,
		type = 'button',
		class: extra = '',
		children,
		...rest
	}: Props = $props();

	const base =
		'inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius)] ' +
		'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ' +
		'disabled:opacity-50 disabled:pointer-events-none select-none';

	const variants: Record<ButtonVariant, string> = {
		primary: 'bg-brand text-white hover:bg-brand-danger',
		secondary: 'bg-surface text-navy border border-grey-200 hover:bg-bg',
		ghost: 'bg-transparent text-slate hover:bg-bg',
		danger: 'bg-brand-danger text-white hover:brightness-110',
		success: 'bg-brand-green text-white hover:brightness-110'
	};

	const sizes: Record<ButtonSize, string> = {
		sm: 'h-8 px-3 text-sm',
		md: 'h-10 px-4 text-sm',
		lg: 'h-12 px-6 text-base'
	};
</script>

<button
	{type}
	class="{base} {variants[variant]} {sizes[size]} {block ? 'w-full' : ''} {extra}"
	disabled={disabled || loading}
	{...rest}
>
	{#if loading}
		<span
			class="size-4 rounded-full border-2 border-current border-t-transparent animate-spin"
			aria-hidden="true"
		></span>
	{/if}
	{@render children()}
</button>
