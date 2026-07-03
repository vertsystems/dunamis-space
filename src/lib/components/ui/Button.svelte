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
		'transition-all duration-150 ease-out active:scale-[0.98] whitespace-nowrap ' +
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
		'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 disabled:shadow-none select-none';

	const variants: Record<ButtonVariant, string> = {
		primary:
			'bg-brand text-white shadow-[0_2px_10px_-2px_rgba(59,110,246,0.55)] hover:brightness-[1.07] active:brightness-95',
		secondary: 'bg-surface text-navy border border-grey-200 shadow-xs hover:bg-bg hover:border-grey',
		ghost: 'bg-transparent text-slate hover:bg-bg hover:text-navy',
		danger:
			'bg-brand-danger text-white shadow-[0_2px_10px_-2px_rgba(240,68,56,0.5)] hover:brightness-[1.07] active:brightness-95',
		success:
			'bg-brand-green text-white shadow-[0_2px_10px_-2px_rgba(23,178,106,0.5)] hover:brightness-[1.07] active:brightness-95'
	};

	const sizes: Record<ButtonSize, string> = {
		sm: 'h-8 px-3.5 text-sm',
		md: 'h-10 px-4.5 text-sm',
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
