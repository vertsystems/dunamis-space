<script lang="ts">
	import { funcaoSigla, funcaoStyle } from '$lib/equipe';

	let { funcao = null }: { funcao?: string | null } = $props();
	const sigla = $derived(funcaoSigla(funcao));
	const style = $derived(funcaoStyle(funcao));
</script>

{#if sigla}
	<span
		class="inline-flex items-center rounded-md border px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-wide text-white shadow-sm"
		style={style}
		title={funcao ?? undefined}>{sigla}</span
	>
{/if}
