<script lang="ts">
	import { funcaoSigla } from '$lib/equipe';

	let { funcao = null }: { funcao?: string | null } = $props();
	const sigla = $derived(funcaoSigla(funcao));
</script>

{#if sigla}
	<span
		class="inline-flex items-center rounded-md border px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-wide text-white shadow-sm"
		style="background: linear-gradient(135deg, #b8860b 0%, #f5d67b 45%, #c99a2e 100%); border-color: #a5761a;"
		title={funcao ?? undefined}>{sigla}</span
	>
{/if}
