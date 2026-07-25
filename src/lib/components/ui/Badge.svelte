<script lang="ts" module>
	export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

	/** Classes Tailwind por tom — reutilizável fora do Badge (ex.: chips do calendário).
	 *
	 * Contrastes medidos do TEXTO sobre o tint (o tint é alpha, então medi sobre
	 * branco = superfície de card e sobre #f3f6fb = fundo do app). Todos ≥ 4.5:1.
	 * O fundo tint não mudou — só o tom do texto escureceu.
	 *   neutral #5b6576 sobre #f3f6fb ............ 5.43:1
	 *   brand   80% da primária + preto .......... 5.57:1 / 5.17:1 (era text-brand, 3.90:1)
	 *           color-mix mantém o badge acompanhando o tema do usuário
	 *   success #067647 ......................... 5.05:1 / 4.70:1 (era #17b26a, 2.45:1)
	 *   warning #7a5310 ......................... 6.15:1 / 5.73:1 (era #9a6b16, 4.21:1)
	 *   danger  #b42318 ......................... 5.62:1 / 5.21:1 (era #f04438, 3.21:1)
	 *   info    #1c2534 ......................... 12.70:1
	 */
	export const toneClasses: Record<BadgeTone, string> = {
		neutral: 'bg-bg text-slate',
		brand: 'bg-brand/10 text-[color:color-mix(in_srgb,var(--color-brand)_80%,black)]',
		success: 'bg-brand-green/12 text-[#067647]',
		warning: 'bg-brand-amber/15 text-[#7a5310]',
		danger: 'bg-brand-danger/12 text-[#b42318]',
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
	class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium {toneClasses[
		tone
	]} {extra}"
>
	{@render children()}
</span>
