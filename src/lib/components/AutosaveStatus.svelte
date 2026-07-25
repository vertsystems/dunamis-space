<script lang="ts">
	import { Check, Loader2, TriangleAlert } from '@lucide/svelte';
	import type { AutosaveStatus } from '$lib/actions/autosave';

	let { status = 'idle' }: { status?: AutosaveStatus } = $props();
</script>

{#if status === 'saving'}
	<span class="inline-flex items-center gap-1 text-xs text-grey"><Loader2 size={13} class="animate-spin" /> Salvando…</span>
{:else if status === 'saved'}
	<span class="inline-flex items-center gap-1 text-xs text-brand-green"><Check size={13} /> Salvo</span>
{:else if status === 'error'}
	<span class="inline-flex items-center gap-1 text-xs text-brand-danger"><TriangleAlert size={13} /> Erro ao salvar</span>
{:else if status === 'invalid'}
	<span class="inline-flex items-center gap-1 text-xs text-brand-brown"
		><TriangleAlert size={13} /> Preencha os campos obrigatórios para salvar</span
	>
{:else}
	<span class="inline-flex items-center gap-1 text-xs text-grey">Salvo automaticamente</span>
{/if}
