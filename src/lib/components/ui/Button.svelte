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

	// Fundos escurecidos via color-mix para o texto BRANCO passar 4.5:1 — inclusive
	// no hover, que clareia 7%. Medidos (branco sobre o fundo, base / hover):
	//   primary 90% da primária + preto → #3563dd  5.27:1 / 4.72:1 (era #3b6ef6, 4.42:1)
	//   danger  80% + preto ............ → #c0362d  5.51:1 / 4.93:1 (era #f04438, 3.76:1)
	//   success 70% + preto ............ → #107d4a  5.20:1 / 4.66:1 (era #17b26a, 2.76:1)
	//   secondary #1c2534 no branco ..... 12.70:1 · ghost #5b6576 no branco 5.43:1
	// O color-mix mantém o primary acompanhando a cor de tema do usuário.
	const variants: Record<ButtonVariant, string> = {
		primary:
			'bg-[color:color-mix(in_srgb,var(--color-brand)_90%,black)] text-white shadow-[0_2px_10px_-2px_color-mix(in_srgb,var(--color-brand)_55%,transparent)] hover:brightness-[1.07] active:brightness-95',
		secondary: 'bg-surface text-navy border border-grey-200 shadow-xs hover:bg-bg hover:border-grey',
		ghost: 'bg-transparent text-slate hover:bg-bg hover:text-navy',
		danger:
			'bg-[color:color-mix(in_srgb,var(--color-brand-danger)_80%,black)] text-white shadow-[0_2px_10px_-2px_rgba(240,68,56,0.5)] hover:brightness-[1.07] active:brightness-95',
		success:
			'bg-[color:color-mix(in_srgb,var(--color-brand-green)_70%,black)] text-white shadow-[0_2px_10px_-2px_rgba(23,178,106,0.5)] hover:brightness-[1.07] active:brightness-95'
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
