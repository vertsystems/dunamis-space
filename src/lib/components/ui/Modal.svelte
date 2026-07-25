<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '$lib/components/Icon.svelte';

	let {
		open = false,
		title = '',
		subtitle = '',
		size = 'md',
		onClose,
		children
	}: {
		open?: boolean;
		title?: string;
		subtitle?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		onClose: () => void;
		children: Snippet;
	} = $props();

	const maxW = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-7xl' };

	const FOCAVEIS =
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	let dialogEl = $state<HTMLElement | null>(null);
	let gatilho: HTMLElement | null = null; // elemento focado antes de abrir
	let snapshot: string | null = null; // estado do form ao abrir (p/ detectar edição)

	// Ao abrir: guarda o gatilho e move o foco para o diálogo. Ao fechar: devolve.
	$effect(() => {
		if (open) {
			gatilho = document.activeElement as HTMLElement | null;
			tick().then(() => {
				dialogEl?.focus();
				snapshot = serializarForm();
			});
		} else if (gatilho) {
			gatilho.focus();
			gatilho = null;
			snapshot = null;
		}
	});

	// Trava a rolagem do fundo enquanto o modal está aberto. Antes, rolar dentro de
	// um modal longo fazia a página atrás deslizar e perder a posição na lista.
	$effect(() => {
		if (!open) return;
		const anterior = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = anterior;
		};
	});

	// --- Proteção contra descarte acidental do que foi digitado ---
	// Os formulários de criação não têm auto-save: um clique fora ou um Esc jogava
	// fora uma legenda inteira sem confirmação nem rascunho.
	function serializarForm(): string | null {
		const form = dialogEl?.querySelector('form');
		if (!form) return null;
		return [...new FormData(form).entries()]
			.map(([k, v]) => `${k}=${typeof v === 'string' ? v : v.name}`)
			.join('&');
	}

	function temAlteracoes(): boolean {
		if (snapshot === null) return false;
		const atual = serializarForm();
		return atual !== null && atual !== snapshot;
	}

	function tentarFechar() {
		if (temAlteracoes() && !confirm('Você tem alterações não salvas. Descartar?')) return;
		onClose();
	}

	function focaveis(): HTMLElement[] {
		if (!dialogEl) return [];
		return [...dialogEl.querySelectorAll<HTMLElement>(FOCAVEIS)].filter((el) => el.offsetParent !== null);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			tentarFechar();
			return;
		}
		if (e.key !== 'Tab') return;
		// Focus-trap: mantém o Tab circulando dentro do diálogo.
		const f = focaveis();
		if (f.length === 0) {
			e.preventDefault();
			dialogEl?.focus();
			return;
		}
		const primeiro = f[0];
		const ultimo = f[f.length - 1];
		const ativo = document.activeElement;
		if (e.shiftKey && (ativo === primeiro || ativo === dialogEl)) {
			e.preventDefault();
			ultimo.focus();
		} else if (!e.shiftKey && ativo === ultimo) {
			e.preventDefault();
			primeiro.focus();
		}
	}
</script>

<svelte:window onkeydown={open ? onKey : undefined} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-900/30 backdrop-blur-[3px] p-4 pt-[8vh]"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) tentarFechar();
		}}
		transition:fade={{ duration: 160 }}
	>
		<div
			bind:this={dialogEl}
			tabindex="-1"
			class="w-full {maxW[size]} rounded-[var(--radius-xl)] bg-surface border border-grey-200 shadow-2xl focus:outline-none transition-[max-width] duration-300 ease-out"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:scale={{ start: 0.96, opacity: 0, duration: 200, easing: cubicOut }}
		>
			<div class="flex items-start justify-between gap-3 border-b border-grey-200 px-5 py-4">
				<div class="min-w-0">
					<h2 class="text-sm font-semibold text-navy">{title}</h2>
					{#if subtitle}<p class="mt-0.5 text-xs text-grey first-letter:uppercase">{subtitle}</p>{/if}
				</div>
				<button
					type="button"
					class="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-grey transition-colors hover:bg-bg hover:text-navy"
					onclick={tentarFechar}
					aria-label="Fechar"
				>
					<Icon name="x" size={18} />
				</button>
			</div>
			<div class="p-5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
