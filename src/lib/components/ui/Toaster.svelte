<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { getToasts, dismiss, type ToastTone } from '$lib/toast.svelte';

	const toasts = $derived(getToasts());

	const tone: Record<ToastTone, string> = {
		success: 'border-brand-green/30 bg-brand-green/10 text-brand-green',
		error: 'border-brand-danger/30 bg-brand-danger/10 text-brand-danger',
		info: 'border-navy/20 bg-navy/5 text-navy'
	};

	const icon: Record<ToastTone, string> = { success: '✓', error: '!', info: 'i' };
</script>

<div class="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5 w-[min(90vw,23rem)]" aria-live="polite">
	{#each toasts as t (t.id)}
		<div
			class="flex items-center gap-2.5 rounded-[var(--radius-lg)] border bg-surface/85 backdrop-blur-md px-4 py-3 text-sm font-medium shadow-lg {tone[t.tone]}"
			role="status"
			in:fly={{ y: 14, duration: 220 }}
			out:fade={{ duration: 150 }}
		>
			<span
				class="grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold {tone[t.tone]}"
				>{icon[t.tone]}</span
			>
			<span class="flex-1 text-navy-900">{t.message}</span>
			<button
				class="text-grey transition-colors hover:text-navy"
				aria-label="Fechar"
				onclick={() => dismiss(t.id)}>✕</button
			>
		</div>
	{/each}
</div>
