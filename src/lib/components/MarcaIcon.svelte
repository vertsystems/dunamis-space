<script lang="ts">
	// Logo da marca citada num texto livre ("Vercel | Vert Systems" → logo da
	// Vercel). Não achando marca conhecida, não desenha nada: quem usa põe o
	// componente e não precisa checar antes.
	//
	// O logo é um <img> para um SVG de `static/marcas/` — assim a tela baixa só
	// os logos que aparecem nela, em vez de carregar o acervo inteiro no bundle.
	import { marcaDe, urlDoLogo } from '$lib/marcas';

	let {
		texto,
		size = 16,
		class: extra = ''
	}: {
		texto: string | null | undefined;
		size?: number;
		class?: string;
	} = $props();

	const marca = $derived(marcaDe(texto));
</script>

{#if marca}
	<img
		src={urlDoLogo(marca)}
		alt={marca.titulo}
		title={marca.titulo}
		width={size}
		height={size}
		loading="lazy"
		class="shrink-0 {extra}"
		style="width:{size}px;height:{size}px"
	/>
{/if}
